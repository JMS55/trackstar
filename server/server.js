const WebSocketServer = require('ws');
const util = require('util')

const debug = true;
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

const wss = new WebSocketServer.Server({ port: 8080 })
wss.on("connection", ws => {
    ws.on("message", data => {
        const message = JSON.parse(data);
        switch (message.topic) {
            case 'create_room':
                room = new Room(message.creator_name);
                rooms.set(room.id, room);
                ws.send(JSON.stringify({
                    topic: 'create_room_response',
                    status: 'success',
                    room_id: room.id,
                    creator_id: room.creator_id
                }));
                break;
            case 'join_room':
                player = new Player(message.player_name);
                console.log(message.room_id)
                rooms.get(message.room_id).players.set(player.id, player);
                ws.send(JSON.stringify({
                    topic: 'join_room_response',
                    status: 'success',
                    player_id: player.id
                }));
                break;
            case 'leave_room':
                rooms.get(message.room_id).players.delete(message.player_id);
                ws.send(JSON.stringify({
                    topic: 'leave_room_response',
                    status: 'success'
                }));
                break;
            default:
                console.log('Invalid topic');
        }
        if (debug) {
            console.log(util.inspect(rooms, false, null, true));
        }
    });
});