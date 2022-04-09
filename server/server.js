const WebSocketServer = require('ws');
const util = require('util')

const DEBUG = true;
const MAX_PLAYER_ID = 99999999;
const MAX_ROOM_ID = 99999999;

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
    }
}

const rooms = new Map();
const clients = new Map();

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
                    room_id: room.id,
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
                room.players.forEach((player, player_id) => {
                    client = clients.get(player_id);
                    client.send(JSON.stringify({
                        topic: 'player_joined',
                        room_id: room.id,
                        player_id: player.id,
                        player_name: player.name
                    }));
                })
                break;
            case 'leave_room':
                rooms.get(message.room_id).players.delete(message.player_id);
                clients.delete(message.player_id);
                ws.send(JSON.stringify({
                    topic: 'leave_room_response',
                    status: 'success'
                }));
                room.players.forEach((player, player_id) => {
                    client = clients.get(player_id);
                    client.send(JSON.stringify({
                        topic: 'player_left',
                        room_id: room.id,
                        player_id: player.id
                    }));
                })
                break;
            default:
                console.log('Invalid topic: ' + message.topic);
        }
        DEBUG && console.log('Current rooms list:\n' + util.inspect(rooms, false, null, true));
        DEBUG && console.log('Current clients list: ' + Array.from(clients.keys()));
    });
});
