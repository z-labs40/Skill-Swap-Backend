import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { supabaseAdmin } from './config/supabase';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow frontend to connect
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Track online users: { userId: Set<socketId> }
const onlineUsers: Record<string, Set<string>> = {};

// Track group call rooms: { roomId: [socketId1, socketId2, ...] }
const groupRooms: Record<string, string[]> = {};

// Setup Socket Connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Users can join their own private room using their User ID
  socket.on('join_room', (userId) => {
    socket.join(userId);
    
    if (!onlineUsers[userId]) {
      onlineUsers[userId] = new Set();
    }
    onlineUsers[userId].add(socket.id);
    
    console.log(`User ${userId} (socket ${socket.id}) is now ONLINE. Total tabs: ${onlineUsers[userId].size}`);
    
    // Broadcast to EVERYONE that this user is online (only if it's their first tab)
    if (onlineUsers[userId].size === 1) {
      socket.broadcast.emit('user_online', userId);
    }

    // Send the current user the list of ALL users who are already online
    socket.emit('get_online_users', Object.keys(onlineUsers).filter(id => onlineUsers[id].size > 0));
  });

  // Handle incoming private messages
  socket.on('send_private_message', (data) => {
    console.log('Private message received:', data);
    // Emitting the message directly to the receiver's room
    io.to(data.receiverId).emit('receive_private_message', data);
  });

  // --- WebRTC Voice/Video Call Signaling ---

  // 1. Caller initiates a call (Sends SDP Offer)
  socket.on('call_user', (data) => {
    // data = { userToCall: string, signalData: any, from: string, name: string, callType: 'voice' | 'video' }
    console.log(`[SIGNAL] User ${data.from} is calling ${data.userToCall} (${data.callType})`);
    
    // Check if receiver room exists or has users
    const room = io.sockets.adapter.rooms.get(data.userToCall);
    if (!room) {
      console.warn(`[SIGNAL] Warning: Room ${data.userToCall} not found or empty. User might be offline.`);
    } else {
      console.log(`[SIGNAL] Forwarding call to ${room.size} sockets in room ${data.userToCall}`);
    }

    io.to(data.userToCall).emit('call_incoming', { 
      signal: data.signalData, 
      from: data.from, 
      name: data.name,
      callType: data.callType
    });
  });

  // 2. Callee answers the call (Sends SDP Answer)
  socket.on('answer_call', (data) => {
    // data = { to: string, signal: any }
    console.log(`[SIGNAL] Call answered by user. Forwarding answer to ${data.to}`);
    io.to(data.to).emit('call_accepted', data.signal);
  });

  // 3. ICE Candidates (Trickle ICE for connection stability)
  socket.on('ice_candidate', (data) => {
    // data = { to: string, candidate: any }
    // console.log(`[SIGNAL] ICE candidate forwarded to ${data.to}`);
    io.to(data.to).emit('ice_candidate', data.candidate);
  });

  // 4. End/Reject Call
  socket.on('end_call', (data) => {
    // data = { to: string }
    console.log(`[SIGNAL] Call ended/rejected. Notifying ${data.to}`);
    io.to(data.to).emit('call_ended');
  });

  // --- Group Call Signaling (Mesh WebRTC) ---

  socket.on('join_group_call', (roomId) => {
    if (!groupRooms[roomId]) {
      groupRooms[roomId] = [];
    }
    
    // Add user to room
    groupRooms[roomId].push(socket.id);
    socket.join(roomId);
    
    // Send the new user the list of existing users in the room so they can initiate P2P connections
    const usersInThisRoom = groupRooms[roomId].filter(id => id !== socket.id);
    socket.emit('all_group_users', usersInThisRoom);
    console.log(`Socket ${socket.id} joined group ${roomId}. Other users:`, usersInThisRoom);
  });

  // New user sends their signal (Offer) to an existing user
  socket.on('send_group_signal', (payload) => {
    // payload = { userToSignal: string, callerID: string, signal: any }
    io.to(payload.userToSignal).emit('user_joined_group', { 
      signal: payload.signal, 
      callerID: payload.callerID 
    });
  });

  // Existing user sends their signal (Answer) back to the new user
  socket.on('return_group_signal', (payload) => {
    // payload = { callerID: string, signal: any }
    io.to(payload.callerID).emit('receive_returned_signal', { 
      signal: payload.signal, 
      id: socket.id 
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    let disconnectedUserId: string | null = null;
    
    // Find the user associated with this socket and remove it from their set
    for (const userId in onlineUsers) {
      const sockets = onlineUsers[userId];
      if (sockets instanceof Set && sockets.has(socket.id)) {
        sockets.delete(socket.id);
        console.log(`Socket ${socket.id} removed for user ${userId}. Remaining tabs: ${sockets.size}`);
        
        if (sockets.size === 0) {
          disconnectedUserId = userId;
          delete onlineUsers[userId];
        }
        break;
      }
    }

    if (disconnectedUserId) {
      console.log(`User ${disconnectedUserId} has closed ALL tabs and is now OFFLINE`);
      // Broadcast to EVERYONE that this user is offline
      io.emit('user_offline', disconnectedUserId);
    }

    // Remove user from any group rooms they were in
    for (const roomId in groupRooms) {
      let room = groupRooms[roomId];
      if (room.includes(socket.id)) {
        groupRooms[roomId] = room.filter(id => id !== socket.id);
        // Tell others in the room that this user left
        socket.to(roomId).emit('user_left_group', socket.id);
        
        if (groupRooms[roomId].length === 0) {
          delete groupRooms[roomId];
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} with Socket.io enabled`);
});
