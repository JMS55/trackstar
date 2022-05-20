import { inspect } from 'util';
import { Server, WebSocket } from 'ws';
import { Literal, Record, Union, Number, String } from 'runtypes';
import { Game, State, GuessResult, Standing } from './game';

const DEBUG = true;

/** We use Spotify previews, which are 30 seconds long */
const TRACK_PLAY_LENGTH_SECS = 30;

/** Topics for server/client messages */
const enum Topic {
    PLAYERS_CHANGED = 'players_changed',
    GAME_CONFIG = 'game_config',
    TRACK_INFO = 'track_info',
    GUESS_RESULT = 'guess_result',
    LEADERBOARD = 'leaderboard',
    START_GAME_COMMAND = 'start_game_command',
    START_ROUND_COMMAND = 'start_round_command',
    MAKE_GUESS_COMMAND = 'make_guess_command'
}

/////////////////////////////////////////////

/** All Server -> Client messages */
type ServerWSMessage = WSPlayersChanged | WSGameConfig | WSTrackInfo | WSGuessResult | WSLeaderBoard;

/** A player has entered or left the room */
interface WSPlayersChanged {
    topic: Topic.PLAYERS_CHANGED,
    players: string[]
}

/** Configuration of the room's game */
interface WSGameConfig {
    topic: Topic.GAME_CONFIG,
    time_between_tracks: number,
    tracks_per_round: number
}

/** Info for the next track to be played */
interface WSTrackInfo {
    topic: Topic.TRACK_INFO,
    url: string,
    title: string,
    aritsts: string[],
    track_number: number,
    when_to_start: number
}

interface WSGuessResult {
    topic: Topic.GUESS_RESULT,
    result: GuessResult
};

interface WSLeaderBoard {
    topic: Topic.LEADERBOARD,
    leaderboard: Map<string, Standing>
};

/////////////////////////////////////////////

const WSStartGame = Record({
    topic: Literal(Topic.START_GAME_COMMAND),
    tracks_per_round: Number,
    time_between_tracks: Number
});

const WSStartRound = Record({
    topic: Literal(Topic.START_ROUND_COMMAND)
});

const WSMakeGuess = Record({
    topic: Literal(Topic.MAKE_GUESS_COMMAND),
    guess: String,
    time_of_guess: Number
});

/** All Client -> Server messages */
const ClientWSMessage = Union(WSStartGame, WSStartRound, WSMakeGuess);

/////////////////////////////////////////////

interface Player {
    client: WebSocket,
    name: string
}

class Room {
    id: string
    players: Array<Player>
    creator: Player
    game: Game

    constructor(id: string, creator: Player) {
        this.id = id;
        this.creator = creator;
        this.players = [];
        this.game = new Game();
    }

    /** Send a message to all players */
    sendAll(message: ServerWSMessage) {
        this.players.forEach(player => this.sendOne(player, message));
    }

    /** Send a message to a single player */
    sendOne(player: Player, message: ServerWSMessage) {
        DEBUG && console.log('Message sent to client:\n' + inspect(message));
        player.client.send(JSON.stringify(message));
    }

    notifyPlayersChanged() {
        this.sendAll({
            topic: Topic.PLAYERS_CHANGED,
            players: this.players.map(player => player.name)
        });
    }

    addPlayer(player: Player) {
        this.players.push(player);
        this.notifyPlayersChanged();
        this.game.addPlayer(player.name);
        if (this.game.state != State.LOBBY) {
            this.sendOne(player, {
                topic: Topic.GAME_CONFIG,
                time_between_tracks: this.game.secs_between_tracks!,
                tracks_per_round: this.game.tracks_per_round!
            });
        }
    }

    deletePlayer(player: Player) {
        this.players = this.players.filter(p => p != player);
        this.notifyPlayersChanged();
        this.game.deletePlayer(player.name);
    }

    setGameConfig(tracks_per_round: number, time_between_tracks: number) {
        //Setting game config should only be done from the lobby
        if (this.game.state != State.LOBBY) {
            return;
        }

        this.game.setGameConfig(tracks_per_round, time_between_tracks);
        this.sendAll({
            topic: Topic.GAME_CONFIG,
            time_between_tracks: time_between_tracks,
            tracks_per_round: tracks_per_round
        });
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

        this.game.state = State.BETWEEN_TRACKS;
        this.game.resetLeaderboard();
        this.selectTrack();
    }

    /** Select a track to play (called halfway through the wait period) */
    selectTrack() {
        //Stop recurring if room has been deleted
        if (!rooms.has(this.id)) {
            return;
        }

        //Send the next track to play
        const track = this.game.nextTrack();
        this.sendAll({
            topic: Topic.TRACK_INFO,
            url: track.preview_url!,
            title: track.title,
            aritsts: track.artists,
            track_number: this.game.current_track_number,
            when_to_start: Date.now() + (this.game.secs_between_tracks! / 2) * 1000  //now + wait/2
        });

        //Set game state to TRACK once the track starts playing
        setTimeout(() => { this.game.state = State.TRACK },
            (this.game.secs_between_tracks! / 2) * 1000);  //now + wait/2

        //Set game state to BETWEEN_TRACKS once the track ends
        setTimeout(() => { this.game.state = State.BETWEEN_TRACKS },
            (this.game.secs_between_tracks! / 2 + TRACK_PLAY_LENGTH_SECS) * 1000);  //now + wait/2 + track

        //Update the leaderboard once the next track and subsequent wait period end
        setTimeout(() => { this.updateLeaderboard(true) },
            (this.game.secs_between_tracks! * 3 / 2 + TRACK_PLAY_LENGTH_SECS) * 1000);  //now + wait/2 + track + wait

        //If round is not over, select another track halfway through the next wait period
        if (this.game.current_track_number <= this.game.tracks_per_round!) {
            setTimeout(() => { this.selectTrack() },
                (this.game.secs_between_tracks! + TRACK_PLAY_LENGTH_SECS) * 1000);  //now + wait/2 + track + wait/2
            //If round is over, set game state to BETWEEN_ROUNDS once track and subsequent wait period end
        } else {
            setTimeout(() => { this.game.state = State.BETWEEN_ROUNDS },
                (this.game.secs_between_tracks! * 3 / 2 + TRACK_PLAY_LENGTH_SECS) * 1000);  //now + wait/2 + track + wait
        }
    }

    /** Notify guesser of their correctness and update leaderboard if correct */
    processGuess(player: Player, guess: string, guess_epoch_millis: number) {
        //Guesses can only be made while a track is playing
        if (this.game.state != State.TRACK) {
            return;
        }

        const result = this.game.processGuess(player.name, guess, guess_epoch_millis);
        this.sendOne(player, {
            topic: Topic.GUESS_RESULT,
            result: result,
        });
        if (result != GuessResult.INCORRECT) {
            this.updateLeaderboard(false);
        }
    }

    /**
     * Update the leaderboard and send it to all players
     * @param track_end Whether this update is being made because a track ended
     */
    updateLeaderboard(track_end: boolean) {
        if (track_end) {
            this.game.endTrack();
        }
        this.sendAll({
            topic: Topic.LEADERBOARD,
            leaderboard: this.game.leaderboard
        });
    }
}

/** When client connects: create player, add player to room (create room first if it does not exist) */
function handleNewConnection(ws: WebSocket, request_url: string): [Room, Player] {
    DEBUG && console.log('Client connected with URL %s', request_url);
    const [room_id, player_name] = request_url.slice(1).split('/');
    const new_player: Player = {
        client: ws,
        name: player_name
    }
    let room: Room;
    if (rooms.has(room_id)) {
        room = rooms.get(room_id);
    } else {
        DEBUG && console.log('Room created with ID %s', room_id);
        room = new Room(room_id, new_player);
    }
    rooms.set(room_id, room);
    room.addPlayer(new_player);
    return [room, new_player];
}

/** When client disconnects: delete player, delete room if empty */
function handleClosedConnection(room: Room, player: Player) {
    DEBUG && console.log('Client disconnected for player %s', player.name);
    room.deletePlayer(player);
    if (room.players.length == 0) {
        DEBUG && console.log('Room deleted with ID %s', room.id);
        rooms.delete(room.id);
    }
}

/** Handle incoming message from client */
function handleMessage(room: Room, player: Player, message_json: string) {
    //Try parsing message JSON
    let message;
    try {
        message = JSON.parse(message_json);
        DEBUG && console.log('Message received from client:\n' + inspect(message));
    } catch (e) {
        DEBUG && console.log('Message received from client is not valid JSON:\n' + message_json);
        return;
    }

    //Ensure message matches one of our defined formats
    if (!ClientWSMessage.guard(message)) {
        DEBUG && console.log('Not a valid WS message!');
    }

    //Process message
    switch (message.topic) {
        case Topic.START_GAME_COMMAND:
            room.setGameConfig(message.tracks_per_round, message.time_between_tracks);  //Missing break is intentional
        case Topic.START_ROUND_COMMAND:
            room.startRound();
            break;
        case Topic.MAKE_GUESS_COMMAND:
            room.processGuess(player, message.guess, message.time_of_guess);
            break;
    }
}

//Start server
const rooms = new Map();
const wss = new Server({ port: 8080 })
wss.on("connection", (ws, request) => {
    const [room, player] = handleNewConnection(ws, request.url!);
    ws.on('close', () => handleClosedConnection(room, player));
    ws.on('message', data => handleMessage(room, player, data.toString()));
});
