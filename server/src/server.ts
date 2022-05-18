import { Server, WebSocket } from 'ws';
import { inspect } from 'util';
import { Game, GuessResult, Standing } from './game';
import { Literal, Record, Union, Number, String } from 'runtypes';

const DEBUG = true;
const TRACK_PLAY_LENGTH = 30;

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

// SERVER->CLIENT MESSAGES

type ServerWSMessage = WSPlayersChanged | WSGameConfig | WSTrackInfo | WSGuessResult | WSLeaderBoard;

interface WSPlayersChanged {
    topic: Topic.PLAYERS_CHANGED,
    players: string[]
}

interface WSGameConfig {
    topic: Topic.GAME_CONFIG,
    time_between_tracks: number,
    tracks_per_round: number
}

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

// CLIENT->SERVER MESSAGES
// these look a little different because they're validated at runtime,
// but everything is the same generally

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
})

const ClientWSMessage = Union(WSStartGame, WSStartRound, WSMakeGuess);

// END WS MESSAGES


interface Player {
    client: WebSocket,
    name: string
}

class Room {
    id: string
    players: Array<Player>
    creator: Player
    game: Game | null

    constructor(id: string, creator: Player) {
        this.id = id;
        this.creator = creator;
        this.players = [];
        this.game = null;
    }

    sendAll(json: ServerWSMessage) {
        this.players.forEach(player => this.sendOne(player, json));
    }

    sendOne(player: Player, json: ServerWSMessage) {
        DEBUG && console.log('Message sent to client:\n' + inspect(json));
        player.client.send(JSON.stringify(json));
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
        this.game?.addOrResetPlayer(player.name);
        if (this.game) {
            this.sendOne(player, {
                topic: Topic.GAME_CONFIG,
                time_between_tracks: this.game!.time_between_tracks,
                tracks_per_round: this.game!.tracks_per_round
            });
        }
    }

    deletePlayer(player: Player) {
        this.players = this.players.filter(p => p != player);
        this.notifyPlayersChanged();
        this.game?.deletePlayer(player.name);
    }

    setGameConfig(tracks_per_round: number, time_between_tracks: number) {
        this.game = new Game(tracks_per_round, time_between_tracks);
        for (const player of this.players) {
            this.game.addOrResetPlayer(player.name);
        }
        this.sendAll({
            topic: Topic.GAME_CONFIG,
            time_between_tracks: time_between_tracks,
            tracks_per_round: tracks_per_round
        });
    }

    startRound() {
        this.game!.resetLeaderboard();
        setTimeout(() => { this.selectTrack() }, this.game!.time_between_tracks / 2 * 1000);
    }

    selectTrack() {
        if (!rooms.has(this.id)) return;
        const track = this.game!.nextTrack();
        this.sendAll({
            topic: Topic.TRACK_INFO,
            url: track.preview_url!,
            title: track.title,
            aritsts: track.artists,
            track_number: this.game!.current_track_number,
            when_to_start: Date.now() + this.game!.time_between_tracks / 2
        });
        if (this.game!.current_track_number <= this.game!.tracks_per_round) {
            setTimeout(() => { this.selectTrack() }, (this.game!.time_between_tracks + TRACK_PLAY_LENGTH) * 1000);
            setTimeout(() => { this.updateLeaderboard(true) }, (this.game!.time_between_tracks / 2 + TRACK_PLAY_LENGTH) * 1000);
        }
    }

    processGuess(player: Player, guess: string, time_of_guess: number) {
        const result = this.game!.processGuess(player.name, guess, time_of_guess);
        this.sendOne(player, {
            topic: Topic.GUESS_RESULT,
            result: result,
        });
        if (result != GuessResult.INCORRECT) {
            this.updateLeaderboard(false);
        }
    }

    updateLeaderboard(track_end: boolean) {
        if (track_end) {
            this.game!.endTrack();
        }
        this.sendAll({
            topic: Topic.LEADERBOARD,
            leaderboard: this.game!.leaderboard
        });
    }
}

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

function handleClosedConnection(room: Room, player: Player) {
    DEBUG && console.log('Client disconnected for player %s', player.name);
    room.deletePlayer(player);
    if (room.players.length == 0) {
        DEBUG && console.log('Room deleted with ID %s', room.id);
        rooms.delete(room.id);
    }
}

function handleMessage(room: Room, player: Player, message: string) {
    let message_obj;
    try {
        message_obj = JSON.parse(message);
    } catch (e) {
        console.log('Not JSON');
        return;
    }
    DEBUG && console.log('Message received from client:\n' + inspect(message_obj));
    if (ClientWSMessage.guard(message_obj)) {
        switch (message_obj.topic) {
            case Topic.START_GAME_COMMAND:
                room.setGameConfig(message_obj.tracks_per_round, message_obj.time_between_tracks)
            case Topic.START_ROUND_COMMAND:
                room.startRound();
                break;
            case Topic.MAKE_GUESS_COMMAND:
                room.processGuess(player, message_obj.guess, message_obj.time_of_guess);
                break;
        }
    } else {
        console.log('Not a valid WS message!');
    }
}

const rooms = new Map();
const wss = new Server({ port: 8080 })
wss.on("connection", (ws, request) => {
    const [room, player] = handleNewConnection(ws, request.url!);
    ws.on('close', () => handleClosedConnection(room, player));
    ws.on('message', data => handleMessage(room, player, data.toString()));
});
