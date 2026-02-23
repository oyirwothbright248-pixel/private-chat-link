const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Function to generate a short 6-character ID
function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 1. Route to create a new private room link
app.get('/create', (req, res) => {
    const roomId = generateShortId(); 
    res.redirect(`/room/${roomId}`);
});

// 2. Route to join a specific room
app.get('/room/:id', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    
    // Handle user joining a room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    // Handle text messages
    socket.on('chat-msg', (data) => {
        io.to(data.roomId).emit('render-msg', {
            msg: data.msg,
            sender: socket.id
        });
    });

    // Handle "Ringing" notification for Voice/Video
    socket.on('call-request', (payload) => {
        // Sends to everyone in the room EXCEPT the person calling
        socket.to(payload.roomId).emit('incoming-call', payload);
    });

    // Handle WebRTC signaling (Video/Voice data)
    socket.on('signal', (payload) => {
        socket.to(payload.roomId).emit('signal', payload.data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));