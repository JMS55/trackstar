const WebSocketServer = require('ws');
const util = require('util')

const DEBUG = true;
const MAX_PLAYER_ID = 99999;
const MAX_ROOM_ID = 99999;
const TRACKS_PER_ROUND = 15;
const TRACK_PLAY_LENGTH = 30 * 1000;
const TIME_BETWEEN_ROUNDS = 15 * 1000;

class Player {
    constructor(name) {
        this.id = Math.floor(Math.random() * (MAX_PLAYER_ID + 1));
        this.name = name;
    }
}

class Room {
    constructor(creator_name) {
        this.id = Math.floor(Math.random() * (MAX_ROOM_ID + 1));
        this.state = 'lobby';
        this.players = new Map();
        const creator = new Player(creator_name);
        this.creator_id = creator.id;
        this.players.set(creator.id, creator);
        this.track_number = 1;
        this.played_tracks = new Array();
    }
}

const rooms = new Map();
const clients = new Map();

function sendEachClientInRoom(room_id, json) {
    room = rooms.get(room_id);
    room.players.forEach((player, player_id) => {
        client = clients.get(player_id);
        client.send(JSON.stringify(json));
    });
}

function playTrack(room_id) {
    rooms.get(room_id).state = 'track_playing'
    sendEachClientInRoom(room_id, {
        topic: 'track_started',
        track_number: room.track_number,
        tracks_per_round: TRACKS_PER_ROUND,
        track_url: 'https://p.scdn.co/mp3-preview/baa8859b39dc78685642e1adfe60ec5ef8b3a5cf', //TODO
        start_time: Date.now()
    });
    setTimeout(revealTrackAndWait, TRACK_PLAY_LENGTH, room_id);
}

function revealTrackAndWait(room_id) {
    rooms.get(room_id).state = 'waiting'
    sendEachClientInRoom(room_id, {
        topic: 'track_ended',
        track_name: 'Levitating (feat. DaBaby)', //TODO
        track_artists: 'Dua Lipa, DaBaby' //TODO
    });
    room.track_number++;
    setTimeout(room.track_number <= TRACKS_PER_ROUND ? playTrack : endRound, TIME_BETWEEN_ROUNDS, room_id);
}

function endRound(room_id) {
    rooms.get(room_id).state = 'round_over'
    sendEachClientInRoom(room_id, {
        topic: 'round_over'
    });
}

const wss = new WebSocketServer.Server({ port: 8080 })
wss.on("connection", ws => {
    DEBUG && console.log('New client connected');
    ws.on("message", data => {
        const message = JSON.parse(data);
        DEBUG && console.log('Message received from client:');
        DEBUG && console.log(message);
        switch (message.topic) {
            case 'create_room':
                room = new Room(message.creator_name);
                rooms.set(room.id, room);
                clients.set(room.creator_id, ws);
                ws.send(JSON.stringify({
                    topic: 'create_room_response',
                    status: 'success',
                    room_id: message.room.id,
                    creator_id: room.creator_id
                }));
                break;
            case 'join_room':
                joining_player = new Player(message.player_name);
                room = rooms.get(message.room_id);
                room.players.set(joining_player.id, joining_player);
                clients.set(joining_player.id, ws);
                ws.send(JSON.stringify({
                    topic: 'join_room_response',
                    status: 'success',
                    player_id: joining_player.id
                }));
                sendEachClientInRoom(message.room_id, {
                    topic: 'player_joined',
                    room_id: message.room.id,
                    player_id: player.id,
                    player_name: player.name
                });
                break;
            case 'leave_room':
                rooms.get(message.room_id).players.delete(message.player_id);
                clients.delete(message.player_id);
                ws.send(JSON.stringify({
                    topic: 'leave_room_response',
                    status: 'success'
                }));
                sendEachClientInRoom(message.room_id, {
                    topic: 'player_left',
                    room_id: message.room.id,
                    player_id: player.id
                });
                break;
            case 'start_game':
                ws.send(JSON.stringify({
                    topic: 'start_game_response',
                    status: 'success'
                }));
                playTrack(message.room_id);
            case 'make_guess':
                result = 'wrong'; //TODO
                ws.send(JSON.stringify({
                    topic: 'make_guess_response',
                    result: result
                }));
                if (result != 'wrong') {
                    sendEachClientInRoom(message.room_id, {
                        topic: 'correct_guess_made',
                        player_id: message.player_id,
                        field_guessed: result == 'correct_artist' ? 'artist' : 'title',
                        time_of_guess: Date.now()
                    })
                }
            default:
                console.log('Invalid topic: ' + message.topic);
        }
        DEBUG && console.log('Current rooms list:\n' + util.inspect(rooms));
        DEBUG && console.log('Current clients list: ' + Array.from(clients.keys()));
    });
});
