const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');
var room_id;
var player_id;
ws.addEventListener('open', () => {
    ws.on('message', data => {
        const message = JSON.parse(data);
        if (message.topic == 'create_room_response') {
            room_id = message.room_id;
            ws.send(JSON.stringify({
                topic: 'join_room',
                room_id: message.room_id,
                player_name: 'Bob'
            }));
        }
        if (message.topic == 'join_room_response') {
            ws.send(JSON.stringify({
                topic: 'leave_room',
                room_id: room_id,
                player_id: message.player_id
            }));
        }
        console.log(JSON.parse(data));
    });
    ws.send(JSON.stringify({
        topic: 'create_room',
        creator_name: 'Alice'
    }));
});