const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Loot items catalog
const LOOT_CATALOG = [
  { name: 'Royal Diamond Crown', icon: '👑', desc: 'Stolen from the high palace vault.' },
  { name: 'Glowing Alien Core', icon: '👽', desc: 'Unstable extraterrestrial power source.' },
  { name: 'Cursed Golden Skull', icon: '💀', desc: 'Whispers dark secrets of ancient wealth.' },
  { name: 'Cyber Data Shard', icon: '💾', desc: 'Contains billions in encrypted cryptocurrency.' },
  { name: 'Quantum Plasma Orb', icon: '⚡', desc: 'Fluctuates between dimensions rapidly.' },
  { name: 'Ruby Dragon Eye', icon: '👁️', desc: 'Glows hotter the longer you hold it.' }
];

const AVATARS = ['🦊', '🐱', '🐺', '🐼', '🐵', '🐸', '🦁', '🐯', '🤖', '🦝'];

// Rooms memory store
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastRoom(room) {
  const safeData = {
    code: room.code,
    gameState: room.gameState,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    hostId: room.hostId,
    loot: room.loot,
    currentHolderId: room.currentHolderId,
    currentValue: room.currentValue,
    dangerLevel: room.dangerLevel,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      roundScore: p.roundScore,
      status: p.status, // 'holding', 'safe', 'busted', 'spectating'
      isHost: p.id === room.hostId
    })),
    lastEvent: room.lastEvent
  };
  io.to(room.code).emit('room_update', safeData);
}

function startRound(room) {
  room.gameState = 'active';
  room.loot = LOOT_CATALOG[Math.floor(Math.random() * LOOT_CATALOG.length)];
  room.currentValue = 100;
  room.dangerLevel = 5;
  room.elapsedSeconds = 0;
  room.lastEvent = { type: 'ROUND_START', text: `Round ${room.currentRound}: The ${room.loot.name} is up for grabs!` };

  // Reset round statuses
  room.players.forEach(p => {
    p.status = 'spectating';
    p.roundScore = 0;
  });

  // Pick first holder randomly
  const initialHolder = room.players[Math.floor(Math.random() * room.players.length)];
  room.currentHolderId = initialHolder.id;
  initialHolder.status = 'holding';

  // Secret fuse time between 14 and 26 seconds total
  room.secretAlarmLimit = 14 + Math.random() * 12;

  broadcastRoom(room);

  // Clear any existing timer
  if (room.timer) clearInterval(room.timer);

  // 100ms game tick loop
  room.timer = setInterval(() => {
    if (room.gameState !== 'active') {
      clearInterval(room.timer);
      return;
    }

    room.elapsedSeconds += 0.1;

    // Exponential value growth formula: starts at $100, accelerates thrillingly
    room.currentValue = Math.floor(100 * Math.pow(1.15, room.elapsedSeconds * 2.2));

    // Danger calculation: percentage towards secretAlarmLimit
    const ratio = room.elapsedSeconds / room.secretAlarmLimit;
    room.dangerLevel = Math.min(100, Math.floor(ratio * 100));

    // Check if alarm triggered (LOCKDOWN / BUST)
    if (room.elapsedSeconds >= room.secretAlarmLimit) {
      triggerBust(room);
      return;
    }

    // Bot AI decision making
    if (room.currentHolderId && room.currentHolderId.startsWith('bot_')) {
      const bot = room.players.find(p => p.id === room.currentHolderId);
      if (bot && (room.dangerLevel > 40 || room.currentValue > 1200) && Math.random() < 0.12) {
        if (Math.random() < 0.55) {
          // Bot passes loot to another player
          const targets = room.players.filter(p => p.id !== bot.id && p.status !== 'safe');
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            bot.status = 'spectating';
            bot.score += 150;
            target.status = 'holding';
            room.currentHolderId = target.id;
            room.lastEvent = { type: 'PASS', text: `💣 ${bot.name} flung the loot to ${target.name}!` };
            io.to(room.code).emit('sound_effect', { type: 'whoosh' });
            broadcastRoom(room);
          }
        } else {
          // Bot cashes out safely
          const banked = room.currentValue;
          bot.score += banked;
          bot.roundScore = banked;
          bot.status = 'safe';
          room.lastEvent = { type: 'CASH_OUT', text: `💰 ${bot.name} CASHED OUT with $${banked.toLocaleString()}!` };
          io.to(room.code).emit('sound_effect', { type: 'cash_out', player: bot.name, amount: banked });
          
          const remaining = room.players.filter(p => p.status === 'spectating');
          if (remaining.length === 0) {
            clearInterval(room.timer);
            room.gameState = 'safe_end';
            broadcastRoom(room);
            setTimeout(() => endRound(room), 2500);
          } else {
            const nextHolder = remaining[Math.floor(Math.random() * remaining.length)];
            room.currentHolderId = nextHolder.id;
            nextHolder.status = 'holding';
            room.secretAlarmLimit += 4;
            broadcastRoom(room);
          }
        }
      }
    }

    // Broadcast tick updates efficiently
    io.to(room.code).emit('tick_update', {
      currentValue: room.currentValue,
      dangerLevel: room.dangerLevel,
      currentHolderId: room.currentHolderId
    });
  }, 100);
}

function triggerBust(room) {
  clearInterval(room.timer);
  room.gameState = 'busted';

  const victim = room.players.find(p => p.id === room.currentHolderId);
  if (victim) {
    victim.status = 'busted';
    victim.roundScore = 0;
  }

  room.lastEvent = {
    type: 'LOCKDOWN',
    victimName: victim ? victim.name : 'Unknown',
    text: `🚨 LOCKDOWN! Vault security trapped ${victim ? victim.name : 'the holder'}! Round earnings: $0!`
  };

  broadcastRoom(room);

  // Transition to round summary after 3.5 seconds
  setTimeout(() => {
    endRound(room);
  }, 3500);
}

function endRound(room) {
  clearInterval(room.timer);
  room.gameState = 'round_summary';

  // Check if match is finished
  if (room.currentRound >= room.maxRounds) {
    room.gameState = 'game_over';
    room.lastEvent = { type: 'GAME_OVER', text: '🏆 HEIST COMPLETED! Check out the final scores!' };
  } else {
    room.lastEvent = { type: 'ROUND_ENDED', text: `Round ${room.currentRound} finished. Get ready for the next vault!` };
  }

  broadcastRoom(room);
}

// Socket IO Event Handling
io.on('connection', (socket) => {
  console.log(`[Connect] Socket connected: ${socket.id}`);

  // Create room
  socket.on('create_room', ({ playerName, avatar }) => {
    const code = generateRoomCode();
    const room = {
      code,
      hostId: socket.id,
      gameState: 'lobby',
      currentRound: 1,
      maxRounds: 5,
      loot: LOOT_CATALOG[0],
      currentHolderId: null,
      currentValue: 100,
      dangerLevel: 0,
      elapsedSeconds: 0,
      secretAlarmLimit: 20,
      timer: null,
      lastEvent: { type: 'CREATED', text: `Vault room ${code} created.` },
      players: [
        {
          id: socket.id,
          name: playerName.trim().substring(0, 15) || 'Master Thief',
          avatar: avatar || '🦊',
          score: 0,
          roundScore: 0,
          status: 'spectating'
        }
      ]
    };

    rooms.set(code, room);
    socket.join(code);
    socket.roomCode = code;

    socket.emit('room_created', { code });
    broadcastRoom(room);
  });

  // Join room
  socket.on('join_room', ({ code, playerName, avatar }) => {
    const formattedCode = (code || '').toUpperCase().trim();
    const room = rooms.get(formattedCode);

    if (!room) {
      socket.emit('error_message', 'Room code not found. Please check and try again.');
      return;
    }

    if (room.players.length >= 12) {
      socket.emit('error_message', 'Room is currently full (maximum 12 players).');
      return;
    }

    const newPlayer = {
      id: socket.id,
      name: (playerName || '').trim().substring(0, 15) || `Thief #${room.players.length + 1}`,
      avatar: avatar || AVATARS[room.players.length % AVATARS.length],
      score: 0,
      roundScore: 0,
      status: 'spectating'
    };

    room.players.push(newPlayer);
    socket.join(formattedCode);
    socket.roomCode = formattedCode;

    room.lastEvent = { type: 'PLAYER_JOINED', text: `${newPlayer.name} infiltrated the room!` };

    socket.emit('room_joined', { code: formattedCode });
    broadcastRoom(room);
  });

  // Add Bot Thief (For solo testing and practice!)
  socket.on('add_bot', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length >= 12) return;

    const botNames = ['Cyber Shadow', 'Neon Fox', 'Glitch Rogue', 'Data Hound', 'Lucky Bandit'];
    const botAvatars = ['🤖', '🦾', '👾', '🕶️', '⚡'];
    const botIndex = room.players.filter(p => p.isBot).length;

    const botId = 'bot_' + Math.random().toString(36).substring(2, 8);
    const botPlayer = {
      id: botId,
      name: `${botNames[botIndex % botNames.length]}`,
      avatar: botAvatars[botIndex % botAvatars.length],
      score: 0,
      roundScore: 0,
      status: 'spectating',
      isBot: true
    };

    room.players.push(botPlayer);
    room.lastEvent = { type: 'BOT_ADDED', text: `${botPlayer.name} joined as AI crew!` };
    broadcastRoom(room);
  });

  // Start game (host only)
  socket.on('start_game', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;

    if (room.players.length < 2) {
      socket.emit('error_message', 'You need at least 2 players to start the heist!');
      return;
    }

    room.currentRound = 1;
    room.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
    });

    startRound(room);
  });

  // Next round (host only)
  socket.on('next_round', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;

    if (room.currentRound < room.maxRounds) {
      room.currentRound++;
      startRound(room);
    }
  });

  // Restart full match (host only)
  socket.on('restart_game', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;

    room.currentRound = 1;
    room.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.status = 'spectating';
    });

    startRound(room);
  });

  // Cash out action (holder banks money)
  socket.on('cash_out', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'active') return;
    if (room.currentHolderId !== socket.id) return;

    const holder = room.players.find(p => p.id === socket.id);
    if (!holder) return;

    const bankedAmount = room.currentValue;
    holder.score += bankedAmount;
    holder.roundScore = bankedAmount;
    holder.status = 'safe';

    room.lastEvent = {
      type: 'CASH_OUT',
      text: `💰 ${holder.name} CASHED OUT with $${bankedAmount.toLocaleString()}!`
    };

    io.to(room.code).emit('sound_effect', { type: 'cash_out', player: holder.name, amount: bankedAmount });

    // Check remaining active players who haven't cashed out
    const remainingPlayers = room.players.filter(p => p.status === 'spectating');

    if (remainingPlayers.length === 0) {
      // Everyone cashed out! Round ends in victory!
      clearInterval(room.timer);
      room.gameState = 'safe_end';
      broadcastRoom(room);
      setTimeout(() => endRound(room), 2500);
    } else {
      // Pass loot to one of the remaining players, keep adrenaline rolling!
      const nextHolder = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
      room.currentHolderId = nextHolder.id;
      nextHolder.status = 'holding';
      // Give a tiny safety buffer on fuse
      room.secretAlarmLimit += 4;
      broadcastRoom(room);
    }
  });

  // Pass loot to another player (Hot Potato throw!)
  socket.on('pass_loot', ({ targetId }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'active') return;
    if (room.currentHolderId !== socket.id) return;

    const currentHolder = room.players.find(p => p.id === socket.id);
    if (!currentHolder) return;

    // Eligible recipients: other players in room who haven't cashed out yet
    const eligiblePlayers = room.players.filter(p => p.id !== socket.id && p.status !== 'safe');
    if (eligiblePlayers.length === 0) return;

    let targetPlayer = eligiblePlayers.find(p => p.id === targetId);
    if (!targetPlayer) {
      targetPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    }

    currentHolder.status = 'spectating';
    // Passing bonus reward: +$150 guaranteed for passing successfully
    currentHolder.score += 150;

    targetPlayer.status = 'holding';
    room.currentHolderId = targetPlayer.id;

    room.lastEvent = {
      type: 'PASS',
      text: `💣 ${currentHolder.name} flung the loot to ${targetPlayer.name}!`
    };

    io.to(room.code).emit('sound_effect', { type: 'whoosh', from: currentHolder.name, to: targetPlayer.name });
    broadcastRoom(room);
  });

  // Sabotage / Hack Alarm (Spectators tap to increase danger on the holder!)
  socket.on('sabotage_alarm', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'active') return;
    // Holder cannot sabotage themselves
    if (room.currentHolderId === socket.id) return;

    const hacker = room.players.find(p => p.id === socket.id);
    if (!hacker) return;

    // Each sabotage tap reduces alarm limit by 0.3s (increasing danger)
    room.secretAlarmLimit = Math.max(room.elapsedSeconds + 1.2, room.secretAlarmLimit - 0.35);

    io.to(room.code).emit('sound_effect', { type: 'glitch', hacker: hacker.name });
    io.to(room.code).emit('sabotage_pulse', { hackerName: hacker.name });
  });

  // Snatch attempt (Spectators try to steal the bag!)
  socket.on('snatch_loot', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'active') return;
    if (room.currentHolderId === socket.id) return;

    const thief = room.players.find(p => p.id === socket.id);
    const oldHolder = room.players.find(p => p.id === room.currentHolderId);
    if (!thief || !oldHolder) return;

    // 40% success rate on snatch
    if (Math.random() < 0.4) {
      oldHolder.status = 'spectating';
      thief.status = 'holding';
      room.currentHolderId = thief.id;

      room.lastEvent = {
        type: 'SNATCH_SUCCESS',
        text: `🧲 YOINK! ${thief.name} SNATCHED the loot right out of ${oldHolder.name}'s hands!`
      };
      io.to(room.code).emit('sound_effect', { type: 'snatch' });
      broadcastRoom(room);
    } else {
      socket.emit('snatch_failed', 'Snatch failed! The holder held on tight!');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[Disconnect] Socket disconnected: ${socket.id}`);
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const index = room.players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      const removed = room.players.splice(index, 1)[0];
      room.lastEvent = { type: 'PLAYER_LEFT', text: `${removed.name} slipped into the shadows.` };

      // If room empty, clean up
      if (room.players.length === 0) {
        if (room.timer) clearInterval(room.timer);
        rooms.delete(room.code);
        return;
      }

      // If host left, elect new host
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
      }

      // If holder left during active game, transfer loot to next player
      if (room.currentHolderId === socket.id && room.gameState === 'active') {
        const remaining = room.players.filter(p => p.status !== 'safe');
        if (remaining.length > 0) {
          const nextHolder = remaining[0];
          room.currentHolderId = nextHolder.id;
          nextHolder.status = 'holding';
        } else {
          endRound(room);
        }
      }

      broadcastRoom(room);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 GREED VAULT SERVER RUNNING ON PORT ${PORT}`);
  console.log(`👉 Local: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
