const WebSocket = require('ws');
const ws1 = new WebSocket('ws://localhost:8080');
var room_id;
ws1.addEventListener('open', () => {
    ws1.on('message', data => {
        message = JSON.parse(data);
        if (message.topic == 'create_room_response') {
            room_id = message.room_id;
            const ws2 = new WebSocket('ws://localhost:8080');
            ws2.addEventListener('open', () => {
                ws2.on('message', data => {
                    const message = JSON.parse(data);
                    if (message.topic == 'join_room_response') {
                        ws2.send(JSON.stringify({
                            topic: 'leave_room',
                            room_id: room_id,
                            player_id: message.player_id
                        }));
                    }
                    console.log('Bob received:');
                    console.log(message);
                });
                ws2.send(JSON.stringify({
                    topic: 'join_room',
                    room_id: room_id,
                    player_name: 'Bob'
                }));
            });
        }
        console.log('Alice received:');
        console.log(message);
    });
    ws1.send(JSON.stringify({
        topic: 'create_room',
        creator_name: 'Alice'
    }));
});