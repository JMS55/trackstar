/* eslint-disable spaced-comment */
import { Server, WebSocket } from 'ws';
import TrackStore from './data';
import type { Track } from './data';
import Room, { Player } from './room';
import { fetchTracks } from './spotify';
import logger, { prettyJson } from './logging';
import { ClientWSMessage, Topic } from './types';

/** All games are this playlist (for now) */
export const DEFAULT_PLAYLIST = '5NeJXqMCPAspzrADl9ppKn';

/////////////////////////////////////////////

/** Delete any tracks that don't have a preview URL */
function removeTracksWithNullURL(tracks: Track[]): Track[] {
    return tracks.filter((t) => t.preview_url);
}

/** When client connects: create player, add player to room (create room first if it does not exist) */
function handleNewConnection(
    rooms: Map<string, Room>,
    tracks: Track[],
    data: TrackStore,
    ws: WebSocket,
    request_url: string
): [Room, Player] {
    logger.debug(`Client connected with URL... ${request_url}`);
    const sliced = request_url.split('/').slice(-2);
    const roomId = sliced[0];
    const playerName = decodeURIComponent(sliced[1]);
    const newPlayer: Player = {
        client: ws,
        name: playerName,
    };
    let room: Room;
    if (rooms.has(roomId)) {
        room = rooms.get(roomId)!;
    } else {
        logger.debug(`Room ${roomId} has been created`);
        room = new Room(roomId, tracks, data);
    }
    rooms.set(roomId, room);
    room.addPlayer(newPlayer);
    return [room, newPlayer];
}

/** When client disconnects: delete player, delete room if empty */
function handleClosedConnection(rooms: Map<string, Room>, room: Room, player: Player) {
    logger.debug(`Player ${player.name} has left room ${room.id}`);
    room.deletePlayer(player);
    if (room.players.length === 0) {
        logger.debug(`Room ${room.id} has been deleted`);
        room.clearTimeouts();
        rooms.delete(room.id);
    }
}

/** Handle incoming message from client */
function handleMessage(room: Room, player: Player, message_json: string) {
    // Try parsing message JSON
    let message;
    try {
        message = JSON.parse(message_json);
    } catch (e) {
        logger.error(
            `Message received from player ${player.name} for room ${room.id} is not valid JSON...\n${message_json}`
        );
        return;
    }

    // Ensure message matches one of our defined formats
    if (!ClientWSMessage.guard(message)) {
        logger.error(
            `Message received from player ${player.name} for room ${room.id}
            is not in an accepted format...\n${prettyJson(message_json)}`
        );
        return;
    }

    logger.debug(`Message received from player ${player.name} for room ${room.id}...\n${prettyJson(message_json)}`);

    // Process message
    // Format is already checked above so it must be one of these
    // eslint-disable-next-line default-case
    switch (message.topic) {
        case Topic.START_GAME_COMMAND:
            room.setGameConfig(message.tracks_per_round, message.time_between_tracks);
            room.startRound();
            break;
        case Topic.START_ROUND_COMMAND:
            room.startRound();
            break;
        case Topic.MAKE_GUESS_COMMAND:
            room.processGuess(player, message.guess, message.time_of_guess);
            break;
    }
}

async function main() {
    // Open database, fetch songs
    const data = new TrackStore();
    const config = data.getConfig()!;

    const args = process.argv.slice(2);
    let playlistId = DEFAULT_PLAYLIST;
    if (args.length >= 1) {
        [playlistId] = args;
    }
    logger.info('Retrieving songs from database.');
    let tracks = removeTracksWithNullURL(data.getSongs(playlistId));
    if (tracks.length === 0) {
        logger.warn('No tracks found in playlist. Will try to pull from spotify');
        const res = await fetchTracks(playlistId, config.spotify);
        [tracks] = res;
        logger.info('Loading songs into database.');
        data.loadSongs(playlistId, res[0]);
        if (res[1]) data.setConfig('spotify.accessToken', res[1]);
        if (res[2]) data.setConfig('spotify.refreshToken', res[2]);
        if (tracks.length === 0) {
            logger.error('No tracks loaded. Quitting.');
            return;
        }
    }
    logger.info('Ready to start.');

    // Start server
    const rooms = new Map();
    const wss = new Server({ port: config.ws_port.val });
    wss.on('connection', (ws, request) => {
        const [room, player] = handleNewConnection(rooms, tracks, data, ws, request.url!);
        ws.on('close', () => handleClosedConnection(rooms, room, player));
        ws.on('message', (msg) => handleMessage(room, player, msg.toString()));
    });
    logger.info(`TrackStar server started on port ${config.ws_port.val}!`);
}

if (require.main === module) {
    main();
}

export const forTests = {
    handleMessage,
};
