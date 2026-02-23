const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { createClient } = require('@supabase/supabase-js');

// 1. Connect to Supabase
const SUPABASE_URL = 'https://bcdnzmnmaxopmsimdetn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_C8ygL8VNGGJ2L2qqTP6g2g_hPYokDmy';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.static('public'));

function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get('/create', (req, res) => {
    const roomId = generateShortId(); 
    res.redirect(`/room/${roomId}`);
});

app.get('/room/:id', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    
    // 2. Load History when joining
    socket.on('join-room', async (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        // Fetch last 50 messages for this specific room
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .limit(50);

        if (!error && data) {
            // Send history only to the user who just joined
            socket.emit('load-history', data);
        }
    });

    // 3. Save Message to Supabase
    socket.on('chat-msg', async (data) => {
        // Broadcast immediately for speed
        io.to(data.roomId).emit('render-msg', {
            msg: data.msg,
            sender: socket.id
        });

        // Save to Database in the background
        const { error } = await supabase
            .from('messages')
            .insert([{ 
                room_id: data.roomId, 
                sender_id: socket.id, 
                message: data.msg 
            }]);
        
        if (error) console.error('Supabase Save Error:', error.message);
    });

    socket.on('call-request', (payload) => {
        socket.to(payload.roomId).emit('incoming-call', payload);
    });

    socket.on('signal', (payload) => {
        socket.to(payload.roomId).emit('signal', payload.data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));