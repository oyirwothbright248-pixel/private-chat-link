const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

app.use(express.static('public'));

// 1. Route to create a new private room link
app.get('/create', (req, res) => {
    const roomId = uuidv4(); // Generates a unique ID
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
        // Broadcasts ONLY to people in the same room
        io.to(data.roomId).emit('render-msg', data.msg);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));