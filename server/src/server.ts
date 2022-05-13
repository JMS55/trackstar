import { Server, WebSocket } from 'ws';
import { inspect } from 'util';
import { getRandomUnplayedTrack, isCorrectTitle, isCorrectArtist, Track } from './spotify';
import { Literal, Record, Union, Number, String } from 'runtypes';

const DEBUG = true;
const TRACK_PLAY_LENGTH = 30;

const enum Result {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    INCORRECT = 'incorrect'
}

const enum Topic {
    PLAYERS_CHANGED = 'players_changed',
    GAME_CONFIG = 'game_config',
    TRACK_INFO = 'track_info',
    GUESS_MADE = 'guess_made',
    START_GAME_COMMAND = 'start_game_command',
    MAKE_GUESS_COMMAND = 'make_guess_command'
}

// SERVER->CLIENT MESSAGES

type ServerWSMessage = WSPlayersChanged | WSGameStarted | WSTrackInfo | WSGuessMade;

interface WSPlayersChanged {
    topic: Topic.PLAYERS_CHANGED,
    players: string[]
}

interface WSGameStarted {
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

interface WSGuessMade {
    topic: Topic.GUESS_MADE,
    player: string,
    result: Result,
    time_of_guess: number
};

// CLIENT->SERVER MESSAGES
// these look a little different because they're validated at runtime, 
// but everything is the same generally

const WSStartGame = Record({
    topic: Literal(Topic.START_GAME_COMMAND),
    tracks_per_round: Number,
    time_between_tracks: Number
});

const WSMakeGuess = Record({
    topic: Literal(Topic.MAKE_GUESS_COMMAND),
    guess: String,
    time_of_guess: Number
})

const ClientWSMessage = Union(WSStartGame, WSMakeGuess); 

// END WS MESSAGES


interface Player {
    client: WebSocket,
    name: string
}

interface GameInfo {
    tracks_per_round: number,
    time_between_tracks: number,
    track_number: number,
    played_tracks: Set<Track>
    track: Track | null
}

class Room {
    id: string
    players: Array<Player>
    creator: Player
    game_info: GameInfo | null

    constructor(id: string, creator: Player) {
        this.id = id;
        this.creator = creator;
        this.players = [];
        this.game_info = null;
    }

    sendAll(json: ServerWSMessage) {
        this.players.forEach(player => this.sendOne(player, json));
    }

    sendOne(player: Player, json: ServerWSMessage) {
        DEBUG && console.log('Sending message to client:\n' + inspect(json));
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
        if (this.game_info) {
            this.sendOne(player, {
                topic: Topic.GAME_CONFIG,
                time_between_tracks: this.game_info!.time_between_tracks,
                tracks_per_round: this.game_info!.tracks_per_round
            })
        }
    }

    deletePlayer(player: Player) {
        this.players = this.players.filter(p => p != player);
        this.notifyPlayersChanged();
    }

    startGame(tracks_per_round: number, time_between_tracks: number) {
        this.game_info = {
            tracks_per_round: tracks_per_round,
            time_between_tracks: time_between_tracks,
            track_number: 1,
            track: null,
            played_tracks: new Set()
        }
        this.sendAll({
            topic: Topic.GAME_CONFIG,
            time_between_tracks: time_between_tracks,
            tracks_per_round: tracks_per_round
        });
        setTimeout(() => {this.selectTrack()}, time_between_tracks / 2 * 1000);
    }

    selectTrack() {
        if (!rooms.has(this.id)) return;
        const track = getRandomUnplayedTrack(this.game_info!.played_tracks)
        this.game_info!.track = track;
        this.game_info!.played_tracks.add(track);
        this.sendAll({
            topic: Topic.TRACK_INFO,
            url: track.preview_url!,
            title: track.title,
            aritsts: track.artists,
            track_number: this.game_info!.track_number,
            when_to_start: Date.now() + this.game_info!.time_between_tracks / 2
        });
        this.game_info!.track_number++;
        if (this.game_info!.track_number <= this.game_info!.tracks_per_round) {
            setTimeout(() => {this.selectTrack()}, (this.game_info!.time_between_tracks + TRACK_PLAY_LENGTH) * 1000);
        }
    }

    processGuess(player:Player, guess: string, time_of_guess: number) {
        let result;
        if (isCorrectTitle(this.game_info!.track!, guess)) {
            result = Result.TITLE;
        } else if (isCorrectArtist(this.game_info!.track!, guess)) {
            result = Result.ARTIST;
        } else {
            result = Result.INCORRECT;
        }
        this.sendAll({
            topic: Topic.GUESS_MADE,
            player: player.name,
            result: result,
            time_of_guess: time_of_guess
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
    const room: Room = rooms.has(room_id) ? rooms.get(room_id) : new Room(room_id, new_player);
    rooms.set(room_id, room);
    room.addPlayer(new_player);
    return [room, new_player];
}

function handleClosedConnection(room: Room, player: Player) {
    DEBUG && console.log('Client disconnected');
    room.deletePlayer(player);
    if (room.players.length == 0) {
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
            case 'start_game_command':
                room.startGame(message_obj.tracks_per_round, message_obj.time_between_tracks);
                break;
            case 'make_guess_command':
                room.processGuess(player, message_obj.guess, message_obj.time_of_guess);
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
