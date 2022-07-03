import winston, { format } from 'winston';
import { Literal, Record, Union, Number, String } from 'runtypes';
import { Server, WebSocket } from 'ws';
import TrackStore, { Track } from './data';
import { GuessResult, State } from './game';
import Room, { Player } from './room';
import { fetchTracks } from './spotify';
import { Standing } from './leaderboard';

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
export const TRACK_PLAY_LENGTH_SECS = 30;

/** All games are this playlist (for now) */
export const DEFAULT_PLAYLIST = '5NeJXqMCPAspzrADl9ppKn';

/** Topics for server/client messages */
export const enum Topic {
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
export type ServerWSMessage = WSGameConfig | WSTrackInfo | WSGuessResult | WSLeaderBoard;

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
export const ClientWSMessage = Union(WSStartGame, WSStartRound, WSMakeGuess);

/////////////////////////////////////////////

/** When client connects: create player, add player to room (create room first if it does not exist) */
function handleNewConnection(
    rooms: Map<string, Room>,
    tracks: Track[],
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
    room.deletePlayer(player);
    if (room.players.length == 0) {
        logger.debug(`Room ${room.id} has been deleted`);
        room.clearTimeouts();
        rooms.delete(room.id);
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
export function prettyJson(input: string) {
    return JSON.stringify(JSON.parse(input), null, 2);
}

/** Delete any tracks that don't have a preview URL */
function removeTracksWithNullURL(tracks: Track[]): Track[] {
    return tracks.filter((t) => t.preview_url);
}

async function main() {
    //Open database, fetch songs
    const data = new TrackStore();
    const config = data.getConfig()!;

    const args = process.argv.slice(2);
    let playlist_id = DEFAULT_PLAYLIST;
    if (args.length >= 1) {
        playlist_id = args[0];
    }
    logger.info('Retrieving songs from database.');
    let tracks = removeTracksWithNullURL(data.getSongs(playlist_id));
    if (tracks.length == 0) {
        logger.warn('No tracks found in playlist. Will try to pull from spotify');
        const res = await fetchTracks(playlist_id, config.spotify);
        tracks = res[0];
        logger.info('Loading songs into database.');
        data.loadSongs(playlist_id, res[0]);
        if (res[1]) data.setConfig('spotify.accessToken', res[1]);
        if (res[2]) data.setConfig('spotify.refreshToken', res[2]);
        if (tracks.length == 0) {
            logger.error('No tracks loaded. Quitting.');
            return;
        }
    }
    logger.info('Ready to start.');

    //Start server
    const rooms = new Map();
    const wss = new Server({ port: config.ws_port.val });
    wss.on('connection', (ws, request) => {
        const [room, player] = handleNewConnection(rooms, tracks, data, ws, request.url!);
        ws.on('close', () => handleClosedConnection(rooms, room, player));
        ws.on('message', (data) => handleMessage(room, player, data.toString()));
    });
    logger.info(`TrackStar server started on port ${config.ws_port.val}!`);
}

if (require.main === module) {
    void main();
}

export const forTests = {
    handleMessage,
};
