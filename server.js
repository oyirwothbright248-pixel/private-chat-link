const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { createClient } = require('@supabase/supabase-js');

// 1. Connect to Supabase
const SUPABASE_URL = 'https://bcdnzmnmaxopmsimdetn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_C8ygL8VNGGJ2L2qqTP6g2g_hPYokDmy'; // Note: Use Service Role Key for backend if available
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.static('public'));

// Helper to create a consistent room name between two users
function getRoomId(id1, id2) {
    return [id1, id2].sort().join('--');
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/room/:id', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    
    // --- SESSION JOINING ---
    socket.on('join-session', async (data) => {
        const { myId, targetId } = data;
        socket.join(myId); // Join personal room for notifications
        
        console.log(`User ${myId} is online`);

        if (targetId) {
            const room = getRoomId(myId, targetId);
            socket.join(room);
            console.log(`${myId} joined conversation with ${targetId}`);

            // Fetch history for this specific duo
            const { data: history, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', room)
                .order('created_at', { ascending: true })
                .limit(100);

            if (!error && history) {
                socket.emit('load-history', history);
            }
        }
    });

    // --- MESSAGING (Text, Voice, File) ---
    socket.on('chat-msg', async (data) => {
        const room = getRoomId(data.sender, data.target);
        
        // Save to Database
        const { error } = await supabase
            .from('messages')
            .insert([{ 
                room_id: room, 
                sender_id: data.sender, 
                message: data.msg,
                type: data.type || 'text',
                file_url: data.file_url || null 
            }]);
        
        if (error) console.error("DB Save Error:", error.message);

        // Send to the target user specifically (for notifications) 
        // and to the room (for active chat)
        socket.to(room).emit('render-msg', data);
        socket.to(data.target).emit('render-msg', data); 
    });

    // --- WEBRTC SIGNALING (Restored) ---
    socket.on('call-request', (payload) => {
        // Direct ring to the target user's personal ID room
        socket.to(payload.target).emit('incoming-call', payload);
    });

    socket.on('signal', (payload) => {
        // Direct signaling to the target user
        socket.to(payload.target).emit('signal', payload.data);
    });

    // --- UTILITIES ---
    socket.on('clear-history', async (data) => {
        const room = getRoomId(data.myId, data.targetId);
        await supabase.from('messages').delete().eq('room_id', room);
    });

    socket.on('disconnect', () => {
        console.log('User offline');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`BrightTech Server running on port ${PORT}`));