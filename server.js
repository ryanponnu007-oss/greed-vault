const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Serve from both 'public' subfolder and root directory (for 100% deployment compatibility)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(publicPath)) {
    return res.sendFile(publicPath);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

const MAP_W = 900;
const MAP_H = 600;

const PILLARS = [
  { x: 180, y: 160, w: 70, h: 70 },
  { x: 650, y: 160, w: 70, h: 70 },
  { x: 180, y: 370, w: 70, h: 70 },
  { x: 650, y: 370, w: 70, h: 70 },
  { x: 415, y: 265, w: 70, h: 70 }
];

const ESCAPE_ZONE = { x: 350, y: 10, w: 200, h: 55 };
const SPAWN_ZONE = { x: 420, y: 530 };

const POWERUPS = ['banana', 'rocket', 'magnet', 'smoke'];

function createLoots() {
  return [
    { id: 1, type: 'diamond', name: 'Master Diamond', icon: '💎', x: 450, y: 365, value: 1000, carriedBy: null, respawnAt: 0 },
    { id: 2, type: 'gold', name: 'Gold Ingot', icon: '🪙', x: 140, y: 120, value: 300, carriedBy: null, respawnAt: 0 },
    { id: 3, type: 'gold', name: 'Gold Ingot', icon: '🪙', x: 760, y: 120, value: 300, carriedBy: null, respawnAt: 0 },
    { id: 4, type: 'gold', name: 'Gold Ingot', icon: '🪙', x: 140, y: 460, value: 300, carriedBy: null, respawnAt: 0 },
    { id: 5, type: 'gold', name: 'Gold Ingot', icon: '🪙', x: 760, y: 460, value: 300, carriedBy: null, respawnAt: 0 }
  ];
}

function createItemBoxes() {
  return [
    { id: 1, x: 300, y: 230, respawnAt: 0 },
    { id: 2, x: 600, y: 230, respawnAt: 0 },
    { id: 3, x: 450, y: 160, respawnAt: 0 },
    { id: 4, x: 450, y: 470, respawnAt: 0 }
  ];
}

function createGuards() {
  return [
    {
      id: 1,
      x: 200,
      y: 100,
      patrol: [{ x: 200, y: 100 }, { x: 700, y: 100 }],
      targetIdx: 1,
      angle: 0,
      speed: 2.2,
      state: 'patrol',
      chaseTargetId: null,
      visionDist: 175,
      visionFov: Math.PI / 3,
      blindedUntil: 0
    },
    {
      id: 2,
      x: 700,
      y: 470,
      patrol: [{ x: 700, y: 470 }, { x: 200, y: 470 }],
      targetIdx: 1,
      angle: Math.PI,
      speed: 2.2,
      state: 'patrol',
      chaseTargetId: null,
      visionDist: 175,
      visionFov: Math.PI / 3,
      blindedUntil: 0
    }
  ];
}

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return rooms.has(code) ? generateRoomCode() : code;
}

function collidesWithPillars(x, y, radius = 16) {
  for (const p of PILLARS) {
    if (x + radius > p.x && x - radius < p.x + p.w &&
        y + radius > p.y && y - radius < p.y + p.h) {
      return true;
    }
  }
  return false;
}

function hasLineOfSight(x1, y1, x2, y2) {
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const rx = x1 + (x2 - x1) * (i / steps);
    const ry = y1 + (y2 - y1) * (i / steps);
    if (collidesWithPillars(rx, ry, 6)) return false;
  }
  return true;
}

function updateGame(room) {
  if (room.gameState !== 'active') return;

  const now = Date.now();

  // 1. Clean expired smoke
  room.smokes = room.smokes.filter(s => now < s.expiresAt);

  // 1b. Sudden Death: Final 30s Mega Emerald ($2,500) Spawn!
  const timeLeft = Math.max(0, Math.ceil((room.endTime - now) / 1000));
  if (timeLeft <= 30 && !room.megaLootSpawned) {
    room.megaLootSpawned = true;
    room.loots.push({
      id: 99,
      type: 'emerald',
      name: 'MEGA EMERALD',
      icon: '❇️',
      x: 450,
      y: 365,
      value: 2500,
      carriedBy: null,
      respawnAt: 0
    });
    io.to(room.code).emit('sound', 'siren');
    io.to(room.code).emit('event_msg', {
      text: '👑 SUDDEN DEATH (FINAL 30S)! MEGA EMERALD ($2,500) DROPPED IN THE VAULT!'
    });
  }

  // 2. Guard AI
  for (const guard of room.guards) {
    // Check if guard is inside a smoke cloud
    let inSmoke = false;
    for (const sm of room.smokes) {
      if (Math.hypot(guard.x - sm.x, guard.y - sm.y) < sm.radius) {
        inSmoke = true;
        guard.blindedUntil = Math.max(guard.blindedUntil, now + 1500);
        break;
      }
    }

    if (now < guard.blindedUntil) {
      guard.state = 'blinded';
      guard.angle += 0.05; // Spin around confused
      continue;
    }

    let targetX, targetY;
    let spottedPlayer = null;

    for (const player of room.players) {
      if (player.isBusted || player.isStunned) continue;

      const dx = player.x - guard.x;
      const dy = player.y - guard.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= guard.visionDist) {
        let angleToPlayer = Math.atan2(dy, dx);
        let diff = Math.abs(guard.angle - angleToPlayer);
        while (diff > Math.PI) diff -= Math.PI * 2;
        diff = Math.abs(diff);

        if (diff <= guard.visionFov / 2) {
          if (hasLineOfSight(guard.x, guard.y, player.x, player.y)) {
            if (!spottedPlayer || player.hasLoot) {
              spottedPlayer = player;
              if (player.hasLoot) break;
            }
          }
        }
      }
    }

    if (spottedPlayer) {
      guard.state = 'chase';
      guard.chaseTargetId = spottedPlayer.id;
      guard.speed = 3.2;
      targetX = spottedPlayer.x;
      targetY = spottedPlayer.y;

      if (now - room.lastSirenTime > 3000) {
        room.lastSirenTime = now;
        io.to(room.code).emit('sound', 'siren');
      }
    } else {
      guard.state = 'patrol';
      guard.speed = 2.0;
      const currentPatrol = guard.patrol[guard.targetIdx];
      targetX = currentPatrol.x;
      targetY = currentPatrol.y;

      const distToPatrol = Math.hypot(targetX - guard.x, targetY - guard.y);
      if (distToPatrol < 10) {
        guard.targetIdx = (guard.targetIdx + 1) % guard.patrol.length;
      }
    }

    const gdx = targetX - guard.x;
    const gdy = targetY - guard.y;
    guard.angle = Math.atan2(gdy, gdx);

    const nx = guard.x + Math.cos(guard.angle) * guard.speed;
    const ny = guard.y + Math.sin(guard.angle) * guard.speed;

    if (!collidesWithPillars(nx, ny, 20)) {
      guard.x = nx;
      guard.y = ny;
    }

    // Arrest Thief
    for (const player of room.players) {
      if (player.isBusted) continue;
      const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
      if (dist < 28) {
        player.isBusted = true;
        player.bustedUntil = now + 3000;
        player.hasLoot = false;
        io.to(room.code).emit('sound', 'busted');

        const carried = room.loots.find(l => l.carriedBy === player.id);
        if (carried) {
          carried.carriedBy = null;
          carried.x = player.x;
          carried.y = player.y;
          io.to(room.code).emit('event_msg', { text: `🚨 ${player.name} was arrested by the Drone!` });
        }

        player.x = SPAWN_ZONE.x + (Math.random() * 60 - 30);
        player.y = SPAWN_ZONE.y;
        break;
      }
    }
  }

  // 3. Update Players
  for (const player of room.players) {
    if (player.isBusted) {
      if (now > player.bustedUntil) player.isBusted = false;
      continue;
    }

    if (player.isStunned) {
      if (now > player.stunnedUntil) player.isStunned = false;
      continue;
    }

    // Check Banana Hazards on Floor
    for (let i = room.bananas.length - 1; i >= 0; i--) {
      const ban = room.bananas[i];
      if (Math.hypot(player.x - ban.x, player.y - ban.y) < 24) {
        // SLIP OUT!
        room.bananas.splice(i, 1);
        player.isStunned = true;
        player.stunnedUntil = now + 1800; // 1.8s spin
        player.isSpinning = true;

        io.to(room.code).emit('sound', 'slip');
        io.to(room.code).emit('event_msg', { text: `🍌 ${player.name} SLIPPED on a Banana peel and spun out!` });

        // Drop loot if holding
        const carried = room.loots.find(l => l.carriedBy === player.id);
        if (carried) {
          carried.carriedBy = null;
          player.hasLoot = false;
          carried.x = Math.max(40, Math.min(MAP_W - 40, player.x + (Math.random() * 80 - 40)));
          carried.y = Math.max(40, Math.min(MAP_H - 40, player.y + (Math.random() * 80 - 40)));
        }
        break;
      }
    }

    // Rocket Boost check
    const isRocketing = now < player.rocketUntil;
    let speed = isRocketing ? 10.5 : (player.isDashing ? 6.5 : 3.8);

    const carriedLoot = room.loots.find(l => l.carriedBy === player.id);
    player.hasLoot = !!carriedLoot;
    if (carriedLoot && carriedLoot.type === 'diamond' && !isRocketing) speed *= 0.82;

    let nx = player.x + player.vx * speed;
    let ny = player.y + player.vy * speed;

    nx = Math.max(20, Math.min(MAP_W - 20, nx));
    ny = Math.max(20, Math.min(MAP_H - 20, ny));

    if (!collidesWithPillars(nx, player.y, 16)) player.x = nx;
    if (!collidesWithPillars(player.x, ny, 16)) player.y = ny;

    // Rocket Ramming into rivals!
    if (isRocketing) {
      for (const target of room.players) {
        if (target.id === player.id || target.isBusted) continue;
        if (Math.hypot(player.x - target.x, player.y - target.y) < 36) {
          target.isStunned = true;
          target.stunnedUntil = now + 1500;
          io.to(room.code).emit('sound', 'tackle');
          io.to(room.code).emit('event_msg', { text: `🚀 ${player.name} RAMMED into ${target.name} at supersonic speed!` });

          const tLoot = room.loots.find(l => l.carriedBy === target.id);
          if (tLoot) {
            tLoot.carriedBy = null;
            target.hasLoot = false;
            tLoot.x = Math.max(40, Math.min(MAP_W - 40, target.x + Math.cos(player.angle) * 90));
            tLoot.y = Math.max(40, Math.min(MAP_H - 40, target.y + Math.sin(player.angle) * 90));
          }
        }
      }
    }

    // Mystery Item Box Pickups
    if (!player.heldItem) {
      for (const box of room.itemBoxes) {
        if (now > box.respawnAt && Math.hypot(player.x - box.x, player.y - box.y) < 28) {
          box.respawnAt = now + 10000; // 10s box respawn
          player.heldItem = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
          io.to(player.id).emit('got_item', { item: player.heldItem });
          io.to(room.code).emit('sound', 'pickup');
          break;
        }
      }
    }

    // Normal Loot Pickups
    if (!carriedLoot) {
      for (const loot of room.loots) {
        if (!loot.carriedBy && now > loot.respawnAt) {
          if (Math.hypot(player.x - loot.x, player.y - loot.y) < 32) {
            loot.carriedBy = player.id;
            player.hasLoot = true;
            io.to(room.code).emit('sound', 'pickup');
            io.to(room.code).emit('event_msg', { text: `💎 ${player.name} snatched the ${loot.name}!` });
            break;
          }
        }
      }
    } else {
      carriedLoot.x = player.x;
      carriedLoot.y = player.y - 12;

      // Escape at Van
      if (player.x > ESCAPE_ZONE.x && player.x < ESCAPE_ZONE.x + ESCAPE_ZONE.w &&
          player.y < ESCAPE_ZONE.y + ESCAPE_ZONE.h + 20) {
        player.score += carriedLoot.value;
        player.hasLoot = false;
        io.to(room.code).emit('sound', 'cash_out');
        io.to(room.code).emit('event_msg', { text: `💰 ${player.name} ESCAPED! Banked $${carriedLoot.value}!` });

        carriedLoot.carriedBy = null;
        carriedLoot.respawnAt = now + 7000;
        carriedLoot.x = carriedLoot.type === 'diamond' ? 450 : (carriedLoot.id % 2 === 0 ? 140 : 760);
        carriedLoot.y = carriedLoot.type === 'diamond' ? 365 : (carriedLoot.id < 4 ? 120 : 460);
      }
    }
  }

  // 4. Broadcast 30FPS World State
  const rankedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  io.to(room.code).emit('world_state', {
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: p.angle,
      score: p.score,
      isBusted: p.isBusted,
      isStunned: p.isStunned,
      hasLoot: p.hasLoot,
      isRocketing: now < p.rocketUntil,
      heldItem: p.heldItem
    })),
    leaderboard: rankedPlayers.map(p => ({ name: p.name, avatar: p.avatar, score: p.score })),
    guards: room.guards.map(g => ({
      id: g.id,
      x: Math.round(g.x),
      y: Math.round(g.y),
      angle: g.angle,
      state: g.state
    })),
    loots: room.loots.map(l => ({
      id: l.id,
      type: l.type,
      name: l.name,
      icon: l.icon,
      x: Math.round(l.x),
      y: Math.round(l.y),
      isCarried: !!l.carriedBy,
      isAvailable: now > l.respawnAt
    })),
    itemBoxes: room.itemBoxes.map(b => ({
      id: b.id,
      x: Math.round(b.x),
      y: Math.round(b.y),
      isAvailable: now > b.respawnAt
    })),
    bananas: room.bananas.map(b => ({ id: b.id, x: Math.round(b.x), y: Math.round(b.y) })),
    smokes: room.smokes.map(s => ({ id: s.id, x: Math.round(s.x), y: Math.round(s.y), radius: s.radius })),
    timeLeft: Math.max(0, Math.ceil((room.endTime - now) / 1000))
  });

  if (now >= room.endTime) {
    clearInterval(room.gameLoop);
    room.gameState = 'game_over';
    io.to(room.code).emit('game_over', { players: rankedPlayers, winner: rankedPlayers[0] });
  }
}

function startGame(room) {
  room.gameState = 'active';
  room.startTime = Date.now();
  room.endTime = Date.now() + 1000 * 90;
  room.lastSirenTime = 0;
  room.megaLootSpawned = false;
  room.loots = createLoots();
  room.itemBoxes = createItemBoxes();
  room.guards = createGuards();
  room.bananas = [];
  room.smokes = [];

  room.players.forEach((p, idx) => {
    p.x = SPAWN_ZONE.x + (idx * 40 - (room.players.length * 20));
    p.y = SPAWN_ZONE.y;
    p.vx = 0;
    p.vy = 0;
    p.angle = -Math.PI / 2;
    p.score = 0;
    p.isBusted = false;
    p.isStunned = false;
    p.hasLoot = false;
    p.heldItem = null;
    p.rocketUntil = 0;
    p.isDashing = false;
  });

  io.to(room.code).emit('game_started', {
    map: { width: MAP_W, height: MAP_H, pillars: PILLARS, escapeZone: ESCAPE_ZONE }
  });

  if (room.gameLoop) clearInterval(room.gameLoop);
  room.gameLoop = setInterval(() => updateGame(room), 33);
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName, avatar }) => {
    const code = generateRoomCode();
    const room = {
      code,
      hostId: socket.id,
      gameState: 'lobby',
      players: [{
        id: socket.id,
        name: (playerName || 'Master Thief').trim().slice(0, 14),
        avatar: avatar || '🦊',
        score: 0,
        x: SPAWN_ZONE.x,
        y: SPAWN_ZONE.y,
        vx: 0,
        vy: 0,
        angle: 0,
        isBusted: false,
        isStunned: false,
        hasLoot: false,
        heldItem: null,
        rocketUntil: 0,
        isDashing: false
      }],
      loots: createLoots(),
      itemBoxes: createItemBoxes(),
      guards: createGuards(),
      bananas: [],
      smokes: [],
      gameLoop: null
    };

    rooms.set(code, room);
    socket.join(code);
    socket.roomCode = code;

    socket.emit('room_created', { code, isHost: true });
    io.to(code).emit('lobby_update', { code, players: room.players, hostId: room.hostId });
  });

  socket.on('join_room', ({ code, playerName, avatar }) => {
    const formatted = (code || '').toUpperCase().trim();
    const room = rooms.get(formatted);
    if (!room) {
      socket.emit('error_msg', 'Room code not found!');
      return;
    }

    const player = {
      id: socket.id,
      name: (playerName || `Rival #${room.players.length + 1}`).trim().slice(0, 14),
      avatar: avatar || '🐺',
      score: 0,
      x: SPAWN_ZONE.x,
      y: SPAWN_ZONE.y,
      vx: 0,
      vy: 0,
      angle: 0,
      isBusted: false,
      isStunned: false,
      hasLoot: false,
      heldItem: null,
      rocketUntil: 0,
      isDashing: false
    };

    room.players.push(player);
    socket.join(formatted);
    socket.roomCode = formatted;

    socket.emit('room_joined', { code: formatted, isHost: false });
    io.to(formatted).emit('lobby_update', { code: formatted, players: room.players, hostId: room.hostId });
  });

  socket.on('start_game', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    startGame(room);
  });

  socket.on('return_to_lobby', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    if (room.gameLoop) clearInterval(room.gameLoop);
    room.gameState = 'lobby';
    io.to(room.code).emit('go_to_lobby');
    io.to(room.code).emit('lobby_update', { code: room.code, players: room.players, hostId: room.hostId });
  });

  socket.on('player_move', ({ vx, vy, isDashing }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'active') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.vx = vx;
    player.vy = vy;
    player.isDashing = isDashing;
    if (vx !== 0 || vy !== 0) player.angle = Math.atan2(vy, vx);
  });

  // 🎯 USE POWER-UP ITEM!
  socket.on('use_powerup', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'active') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.heldItem) return;

    const item = player.heldItem;
    player.heldItem = null; // consume item
    socket.emit('item_used');

    if (item === 'banana') {
      // Drop banana 30px behind player
      const bx = player.x - Math.cos(player.angle) * 32;
      const by = player.y - Math.sin(player.angle) * 32;
      room.bananas.push({ id: Date.now() + Math.random(), x: bx, y: by, placedBy: player.name });
      io.to(room.code).emit('sound', 'whoosh');
      io.to(room.code).emit('event_msg', { text: `🍌 ${player.name} dropped a BANANA peel!` });
    } else if (item === 'rocket') {
      player.rocketUntil = Date.now() + 2200; // 2.2s rocket boost
      io.to(room.code).emit('sound', 'whoosh');
      io.to(room.code).emit('event_msg', { text: `🚀 ${player.name} ACTIVATED ROCKET BOOST!` });
    } else if (item === 'smoke') {
      room.smokes.push({ id: Date.now(), x: player.x, y: player.y, radius: 120, expiresAt: Date.now() + 5000 });
      io.to(room.code).emit('sound', 'whoosh');
      io.to(room.code).emit('event_msg', { text: `💨 ${player.name} deployed a SMOKE BOMB!` });
    } else if (item === 'magnet') {
      // Pull nearest loose loot or steal from closest player within 220px
      let nearest = null;
      let minDist = 220;
      for (const l of room.loots) {
        const d = Math.hypot(player.x - l.x, player.y - l.y);
        if (d < minDist) {
          minDist = d;
          nearest = l;
        }
      }
      if (nearest) {
        if (nearest.carriedBy) {
          const victim = room.players.find(p => p.id === nearest.carriedBy);
          if (victim) victim.hasLoot = false;
        }
        nearest.carriedBy = player.id;
        player.hasLoot = true;
        io.to(room.code).emit('sound', 'pickup');
        io.to(room.code).emit('event_msg', { text: `🧲 ${player.name} USED A LOOT MAGNET and snatched the ${nearest.name}!` });
      }
    }
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        if (room.gameLoop) clearInterval(room.gameLoop);
        rooms.delete(room.code);
      } else {
        if (room.hostId === socket.id) room.hostId = room.players[0].id;
        io.to(room.code).emit('lobby_update', { code: room.code, players: room.players, hostId: room.hostId });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🍌 MARIO-KART HEIST MAYHEM RUNNING ON PORT ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
