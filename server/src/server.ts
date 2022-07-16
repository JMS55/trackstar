import winston, { format } from 'winston';
import { Server, WebSocket } from 'ws';
import { Literal, Record, Union, Number, String } from 'runtypes';
import { Game, State, GuessResult, Standing } from './game';
import { TrackList, TrackStore } from './data';
import { fetchTracks } from './spotify';

export const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.align(),
        format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    level: process.env.TS_LOG_LEVEL ?? 'debug',
});

/** We use Spotify previews, which are 30 seconds long */
const TRACK_PLAY_LENGTH_SECS = 30;

/** All games use this playlist (for now) */
const DEFAULT_PLAYLIST = '5NeJXqMCPAspzrADl9ppKn';

/** Topics for server/client messages */
const enum Topic {
    GAME_CONFIG = 'game_config',
    TRACK_INFO = 'track_info',
    GUESS_RESULT = 'guess_result',
    LEADERBOARD = 'leaderboard',
    START_GAME_COMMAND = 'start_game_command',
    START_ROUND_COMMAND = 'start_round_command',
    MAKE_GUESS_COMMAND = 'make_guess_command',
}

/////////////////////////////////////////////

/** All Server -> Client messages */
type ServerWSMessage = WSGameConfig | WSTrackInfo | WSGuessResult | WSLeaderBoard;

/** Configuration of the room's game */
interface WSGameConfig {
    topic: Topic.GAME_CONFIG;
    time_between_tracks: number;
    tracks_per_round: number;
    current_game_state: State;
}

/** Info for the next track to be played */
interface WSTrackInfo {
    topic: Topic.TRACK_INFO;
    url: string;
    album_cover_url: string;
    title: string;
    aritsts: string[];
    track_number: number;
    when_to_start: number;
}

/** Correctness of player's guess */
interface WSGuessResult {
    topic: Topic.GUESS_RESULT;
    result: GuessResult;
}

/** Leader board of the room's game */
interface WSLeaderBoard {
    topic: Topic.LEADERBOARD;
    leaderboard: Map<string, Standing>;
    host: string;
}

/////////////////////////////////////////////

/** Command to start this room's game */
const WSStartGame = Record({
    topic: Literal(Topic.START_GAME_COMMAND),
    tracks_per_round: Number,
    time_between_tracks: Number,
});

/** Command to start another round */
const WSStartRound = Record({
    topic: Literal(Topic.START_ROUND_COMMAND),
});

/** A player making a guess */
const WSMakeGuess = Record({
    topic: Literal(Topic.MAKE_GUESS_COMMAND),
    guess: String,
    time_of_guess: Number,
});

/** All Client -> Server messages */
const ClientWSMessage = Union(WSStartGame, WSStartRound, WSMakeGuess);

/////////////////////////////////////////////

interface Player {
    client: WebSocket;
    name: string;
    room: string;
}

export class Room {
    id: string;
    players: Array<Player>;
    playlist: TrackList;
    database: TrackStore;
    game: Game;
    timeouts: Array<NodeJS.Timeout>;

    constructor(id: string, playlist: TrackList, database: TrackStore) {
        this.id = id;
        this.players = [];
        this.game = new Game(this);
        this.playlist = playlist;
        this.database = database;
        this.timeouts = [];
    }

    /** Send a message to all players */
    sendAll(message: ServerWSMessage) {
        this.players.forEach((player) => sendMessage(player, message));
    }

    /** Send the current leaderboard to all players */
    sendLeaderboard() {
        this.sendAll({
            topic: Topic.LEADERBOARD,
            leaderboard: this.game.getActiveLeaderboard(),
            host: this.players[0].name,
        });
    }

    /** Add player (back) to room, restoring previous standing if previously disconnected */
    addPlayer(player: Player) {
        this.players.push(player);
        this.game.enterPlayer(player.name);
        this.sendLeaderboard();
        if (this.game.state != State.LOBBY) {
            sendMessage(player, this.getGameConfigMessage());
        }
    }

    /** Delete player from room and label them "inactive" on the leaderboard */
    deletePlayer(player: Player) {
        this.players = this.players.filter((p) => p != player);
        this.game.deactivatePlayer(player.name);
        this.sendLeaderboard();
    }

    getGameConfigMessage(): WSGameConfig {
        return {
            topic: Topic.GAME_CONFIG,
            time_between_tracks: this.game.secs_between_tracks!,
            tracks_per_round: this.game.tracks_per_round!,
            current_game_state: this.game.state!,
        };
    }

    setGameConfig(tracks_per_round: number, time_between_tracks: number) {
        //Setting game config should only be done from the lobby
        if (this.game.state != State.LOBBY) {
            return;
        }

        this.game.setGameConfig(tracks_per_round, time_between_tracks);
        this.sendAll(this.getGameConfigMessage());
    }

    setGameState(state: State) {
        logger.debug(`Game state of room ${this.id} is now ${State[state]}`);
        this.game.state = state;
    }

    /**
     * Start a round, in which multiple tracks are played. After all tracks are
     * played, the room creator can start a new round. The leaderboard is reset
     * before each round.
     */
    startRound() {
        //Round should only start from lobby or between rounds
        if (this.game.state != State.LOBBY && this.game.state != State.BETWEEN_ROUNDS) {
            return;
        }

        this.setGameState(State.BETWEEN_TRACKS);
        this.game.resetLeaderboard();
        this.sendLeaderboard();
        this.selectTrack();
    }

    /** Start a timeout and keep track of its existence */
    addTimeout(delay_secs: number, callback: () => void) {
        this.timeouts.push(setTimeout(callback, delay_secs * 1000));
    }

    /** Clear every timeout that has ever been started for this room */
    clearTimeouts() {
        this.timeouts.forEach((timeout) => clearTimeout(timeout));
    }

    /** Notify guesser of their correctness and update leaderboard if correct */
    processGuess(player: Player, guess: string, guess_epoch_millis: number) {
        //Guesses can only be made while a track is playing
        if (this.game.state != State.TRACK) {
            return;
        }

        const result = this.game.processGuess(player.name, guess, guess_epoch_millis);
        sendMessage(player, {
            topic: Topic.GUESS_RESULT,
            result: result,
        });
        if (result != GuessResult.INCORRECT) {
            this.sendLeaderboard();
        }
    }

    /** Select a track to play (called one second before track plays) */
    selectTrack() {
        //Send the next track to play
        const track = this.game.nextTrack();
        this.sendAll({
            topic: Topic.TRACK_INFO,
            url: track.preview_url!,
            album_cover_url: track.image_url,
            title: track.title,
            aritsts: track.artists,
            track_number: this.game.current_track_number,
            when_to_start: Date.now() + 1000, //now + 1
        });

        //Set game state to TRACK once the track starts playing
        this.addTimeout(
            1, //now + 1
            () => this.setGameState(State.TRACK)
        );

        //Set game state to BETWEEN_TRACKS once the track ends
        this.addTimeout(
            1 + TRACK_PLAY_LENGTH_SECS, //now + 1 + track
            () => this.setGameState(State.BETWEEN_TRACKS)
        );

        //Update the leaderboard once the next track and subsequent wait period end
        this.addTimeout(
            1 + TRACK_PLAY_LENGTH_SECS + this.game.secs_between_tracks!, //now + 1 + track + wait
            () => {
                this.game.endTrack();
                this.sendLeaderboard();
            }
        );

        //If round is not over, select another track one second before the next track plays
        if (this.game.current_track_number < this.game.tracks_per_round!) {
            this.addTimeout(
                TRACK_PLAY_LENGTH_SECS + this.game.secs_between_tracks!, //now + 1 + track + (wait-1)
                () => this.selectTrack()
            );
        }
        //If round is over, set game state to BETWEEN_ROUNDS once track and subsequent wait period end
        else {
            this.addTimeout(
                1 + TRACK_PLAY_LENGTH_SECS + this.game.secs_between_tracks!, //now + 1 + track + wait
                () => this.setGameState(State.BETWEEN_ROUNDS)
            );
        }
    }
}

/** Send a message to a single player */
function sendMessage(player: Player, message: ServerWSMessage) {
    const message_json: string = JSON.stringify(message, (_key, value) =>
        value instanceof Map ? Object.fromEntries(value) : value
    );
    logger.debug(`Message sent to player ${player.name} in room ${player.room}...\n${prettyJson(message_json)}`);
    player.client.send(message_json);
}

/** When client connects: create player, add player to room (create room first if it does not exist) */
function handleNewConnection(
    rooms: Map<string, Room>,
    tracks: TrackList,
    data: TrackStore,
    ws: WebSocket,
    request_url: string
): [Room, Player] {
    logger.debug(`Client connected with URL... ${request_url}`);
    let [room_id, player_name] = request_url.split('/').slice(-2);
    player_name = decodeURIComponent(player_name);
    const new_player: Player = {
        client: ws,
        name: player_name,
        room: room_id,
    };
    let room: Room;
    if (rooms.has(room_id)) {
        room = rooms.get(room_id)!;
    } else {
        logger.debug(`Room ${room_id} has been created`);
        room = new Room(room_id, tracks, data);
    }
    rooms.set(room_id, room);
    room.addPlayer(new_player);
    return [room, new_player];
}

/** When client disconnects: delete player, delete room if empty */
function handleClosedConnection(rooms: Map<string, Room>, room: Room, player: Player) {
    logger.debug(`Player ${player.name} has left room ${room.id}`);
    if (room.players.length == 1) {
        logger.debug(`Room ${room.id} has been deleted`);
        room.clearTimeouts();
        rooms.delete(room.id);
    } else {
        room.deletePlayer(player);
    }
}

/** Handle incoming message from client */
function handleMessage(room: Room, player: Player, message_json: string) {
    //Try parsing message JSON
    let message;
    try {
        message = JSON.parse(message_json);
    } catch (e) {
        logger.error(
            `Message received from player ${player.name} for room ${room.id} is not valid JSON...\n${message_json}`
        );
        return;
    }

    //Ensure message matches one of our defined formats
    if (!ClientWSMessage.guard(message)) {
        logger.error(
            `Message received from player ${player.name} for room ${
                room.id
            } is not in an accepted format...\n${prettyJson(message_json)}`
        );
        return;
    }

    logger.debug(`Message received from player ${player.name} for room ${room.id}...\n${prettyJson(message_json)}`);

    //Process message
    switch (message.topic) {
        case Topic.START_GAME_COMMAND:
            room.setGameConfig(message.tracks_per_round, message.time_between_tracks); //Missing break is intentional
        case Topic.START_ROUND_COMMAND:
            room.startRound();
            break;
        case Topic.MAKE_GUESS_COMMAND:
            room.processGuess(player, message.guess, message.time_of_guess);
            break;
    }
}

/** Return pretty JSON string given any valid JSON string */
function prettyJson(input: string) {
    return JSON.stringify(JSON.parse(input), null, 2);
}

/** Delete any tracks that don't have a preview URL */
function removeTracksWithNullURL(tracks: TrackList): TrackList {
    return tracks.filter((t) => t.preview_url);
}

async function main() {
    //Open database, fetch songs
    const data = new TrackStore();

    const args = process.argv.slice(2);
    let playlist_id;
    if (args.length == 2) {
        const [playlist_arg, access_token] = args;
        playlist_id = playlist_arg;
        logger.info('Pulling tracks from Spotify.');
        const tracks = await fetchTracks(playlist_id, access_token!);
        logger.info('Loading songs into database.');
        data.loadSongs(playlist_id, tracks);
    }
    logger.info('Retrieving songs from database.');
    const tracks = removeTracksWithNullURL(data.getSongs(playlist_id ? playlist_id : DEFAULT_PLAYLIST));
    if (tracks.length == 0) {
        logger.error('No tracks found in playlist. Rerun with playlist-id and access-token arguments.');
        process.exit(1);
    }
    logger.info('Ready to start.');

    //Start server
    const rooms = new Map();
    const wss = new Server({ port: 8080 });
    wss.on('connection', (ws, request) => {
        const [room, player] = handleNewConnection(rooms, tracks, data, ws, request.url!);
        ws.on('close', () => handleClosedConnection(rooms, room, player));
        ws.on('message', (data) => handleMessage(room, player, data.toString()));
    });
    logger.info('TrackStar server started!');
}

void main();
