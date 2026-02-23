const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

app.use(express.static('public'));

// 1. Route to create a new private room link
// Function to generate a short 6-character ID
function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get('/create', (req, res) => {
    const roomId = generateShortId(); // Now results in something like 'KJ82S1'
    res.redirect(`/room/${roomId}`);
});

// 2. Route to join a specific room
app.get('/room/:id', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined: ${roomId}`);
    });

    socket.on('chat-msg', (data) => {
        // We send the message AND the sender's ID back to the room
        io.to(data.roomId).emit('render-msg', {
            msg: data.msg,
            sender: socket.id
        });

        socket.on('signal', (payload) => {
    // This broadcasts the video signal to the other person in the room
    socket.to(payload.roomId).emit('signal', payload.data);
});
    });
}); // This was the missing bracket!

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));