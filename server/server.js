import { Server } from 'ws';
import { inspect } from 'util';
import { getRandomUnplayedTrack, isCorrectTitle, isCorrectArtist } from './spotify';
import { url } from 'inspector';

const DEBUG = true;
const TRACK_PLAY_LENGTH = 30;

class Room {
    constructor(id, creator) {
        this.id = id;
        this.creator = creator;
        this.players = {creator};
        this.clients = new Set();
        this.played_tracks = new Set();
    }

    sendAll(json) {
        this.clients.forEach(client => sendOne(client, json));
    }

    sendOne(client, json) {
        DEBUG && console.log('Sending message to client:\n' + inspect(json));
        client.send(JSON.stringify(json));
    }

    notifyPlayersChanged() {
        this.sendAll({
            topic: 'players_changed',
            players: this.players
        });
    }

    addPlayer(player) {
        this.players.add(player);
        this.notifyPlayersChanged();
    }

    deletePlayer(player) {
        this.players.delete(player);
        this.notifyPlayersChanged();
    }

    startGame(tracks_per_round, time_between_tracks) {
        this.tracks_per_round = tracks_per_round;
        this.time_between_tracks = time_between_tracks;
        this.track_number = 1;
        this.sendAll({
            topic: 'game_started',
            time_between_tracks: time_between_tracks,
            tracks_per_round: tracks_per_round
        });
        setTimeout(this.selectTrack, time_between_tracks / 2 * 1000, room_id);
    }

    selectTrack() {
        if (!rooms.has(id)) return;
        this.track = getRandomUnplayedTrack(played_tracks);
        played_tracks.add(this.track);
        this.sendAll({
            topic: 'track_info',
            url: this.track.preview_url,
            title: this.track.title,
            aritsts: this.track.artists,
            track_number: this.track_number,
            when_to_start: Date.now() + this.time_between_tracks / 2
        });
        this.track_number++;
        if (this.track_number <= TRACKS_PER_ROUND) {
            setTimeout(this.selectTrack, (this.time_between_tracks + TRACK_PLAY_LENGTH) * 1000);
        }
    }

    processGuess(client, guess, time_of_guess) {
        if (isCorrectTitle(this.track, guess)) {
            result = 'correct_title';
        } else if (isCorrectArtist(this.track, guess)) {
            result = 'correct_artist';
        } else {
            result = 'incorrect';
        }
        this.sendAll({
            topic: 'guess_made',
            player: client.player,
            result: result,
            time_of_guess: time_of_guess
        });
    }
}

function handleNewConnection(ws, request) {
    DEBUG && console.log('Client connected');
    const { pathname } = url.parse(request.url);
    [room_id, player] = pathname.slice(1).split('/');
    ws.player = player;
    const room = rooms.has(room_id) ? rooms.get(room_id) : new Room(room_id, player);
    room.clients.add(ws);
    room.addPlayer(player);
    return room;
}

function handleClosedConnection(ws, room) {
    DEBUG && console.log('Client disconnected');
    room.clients.delete(ws);
    if (room.clients.size == 0) {
        rooms.delete(room.id);
        return;
    }
    room.deletePlayer(ws.player);
}

function handleMessage(ws, room, message) {
    DEBUG && console.log('Message received from client:\n' + inspect(message));
    switch (message.topic) {
        case 'start_game_command':
            room.startGame(message.tracks_per_round, message.time_between_tracks);
        case 'make_guess_command':
            room.processGuess(ws, message.guess, message.time_of_guess);
    }
}

const rooms = new Map();
const wss = new Server({ port: 8080 })
wss.on("connection", (ws, request) => {
    const room = handleNewConnection(ws, request);
    ws.on('close', () => handleClosedConnection(ws, room));
    ws.on('message', data => handleMessage(ws, room, JSON.parse(data)));
});
