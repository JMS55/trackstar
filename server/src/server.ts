import { Server, WebSocket } from 'ws';
import { inspect } from 'util';
import { getRandomUnplayedTrack, isCorrectTitle, isCorrectArtist, Track } from './spotify';
import { Literal, Record, Union, Number, String } from 'runtypes';

const DEBUG = true;
const TRACK_PLAY_LENGTH = 30;

// SERVER->CLIENT MESSAGES
// ** also note that the string literals in the 'topic' field have to be updated in the code
//    if they're changed.
type ServerWSMessage = WSPlayersChanged | WSGameStarted | WSTrackInfo | WSGuessMade;

interface WSPlayersChanged {
    topic: 'players_changed',
    players: string[]
}

interface WSGameStarted {
    topic: 'game_started',
    time_between_tracks: number,
    tracks_per_round: number
}

interface WSTrackInfo {
    topic: 'track_info',
    url: string,
    title: string,
    aritsts: string[],
    track_number: number,
    when_to_start: number
}

interface WSGuessMade {
    topic: 'guess_made',
    player: string,
    result: Result,
    time_of_guess: number
};

const enum Result {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    INCORRECT = 'incorrect'
}


// CLIENT->SERVER MESSAGES
// these look a little different because they're validated at runtime, 
// but everything is the same generally

const WSStartGame = Record({
    topic: Literal('start_game_command'),
    tracks_per_round: Number,
    time_between_tracks: Number
});

const WSMakeGuess = Record({
    topic: Literal('make_guess_command'),
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
        this.players.forEach(player => this.sendOne(player.client, json));
    }

    sendOne(client: WebSocket, json: ServerWSMessage) {
        DEBUG && console.log('Sending message to client:\n' + inspect(json));
        client.send(JSON.stringify(json));
    }

    notifyPlayersChanged() {
        this.sendAll({
            topic: 'players_changed',
            players: this.players.map(player => player.name)
        });
    }

    addPlayer(player: Player) {
        this.players.push(player);
        this.notifyPlayersChanged();
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
            topic: 'game_started',
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
            topic: 'track_info',
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
        if (!this.game_info || !this.game_info!.track) {
            console.log('Game/round hasn\'t started yet.');
        }
        let result;
        if (isCorrectTitle(this.game_info!.track!, guess)) {
            result = Result.TITLE;
        } else if (isCorrectArtist(this.game_info!.track!, guess)) {
            result = Result.ARTIST;
        } else {
            result = Result.INCORRECT;
        }
        this.sendAll({
            topic: 'guess_made',
            player: player.name,
            result: result,
            time_of_guess: time_of_guess
        });
    }
}

function handleNewConnection(ws: WebSocket, request_url: string): [Room, Player] {
    DEBUG && console.log('Client connected with URL %s', request_url);
    //const { pathname } = new URL(request_url);
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
