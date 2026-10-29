// Client Game Controller for GREED VAULT

const socket = io();

// State
let myId = null;
let currentRoom = null;
let selectedAvatar = '🦊';
let isAudioMuted = false;

// DOM Elements
const screenWelcome = document.getElementById('screen-welcome');
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');
const screenSummary = document.getElementById('screen-summary');
const screenGameover = document.getElementById('screen-gameover');

const dangerVignette = document.getElementById('danger-vignette');
const soundBtn = document.getElementById('sound-btn');
const roomBadge = document.getElementById('room-badge');
const roomCodeDisplay = document.getElementById('room-code-display');
const lobbyCodeDisplay = document.getElementById('lobby-code-display');
const toast = document.getElementById('toast');

// Inputs & Buttons
const playerNameInput = document.getElementById('player-name-input');
const roomCodeInput = document.getElementById('room-code-input');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnCopyLink2 = document.getElementById('btn-copy-link-2');
const btnAddBot = document.getElementById('btn-add-bot');
const btnStartGame = document.getElementById('btn-start-game');
const btnCashOut = document.getElementById('btn-cash-out');
const btnPassLoot = document.getElementById('btn-pass-loot');
const btnSabotage = document.getElementById('btn-sabotage');
const btnSnatch = document.getElementById('btn-snatch');
const btnNextRound = document.getElementById('btn-next-round');
const btnRestartGame = document.getElementById('btn-restart-game');

// Game Displays
const valueTicker = document.getElementById('value-ticker');
const dangerBar = document.getElementById('danger-bar');
const dangerText = document.getElementById('danger-text');
const holderStatusTitle = document.getElementById('holder-status-title');
const holderIndicator = document.getElementById('holder-indicator');
const holderAvatar = document.getElementById('holder-avatar');
const holderName = document.getElementById('holder-name');
const lootIcon = document.getElementById('loot-icon');
const lootName = document.getElementById('loot-name');
const gameRoundBadge = document.getElementById('game-round-badge');
const liveEventBanner = document.getElementById('live-event-banner');

// Control Groups
const controlsHolder = document.getElementById('controls-holder');
const controlsSpectator = document.getElementById('controls-spectator');
const controlsSafe = document.getElementById('controls-safe');

// Avatar selection
document.querySelectorAll('.avatar-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.avatar-opt').forEach(b => {
      b.classList.remove('bg-amber-500/20', 'border-amber-400');
      b.classList.add('bg-slate-800', 'border-slate-700');
    });
    btn.classList.add('bg-amber-500/20', 'border-amber-400');
    btn.classList.remove('bg-slate-800', 'border-slate-700');
    selectedAvatar = btn.getAttribute('data-avatar');
    if (window.sounds) window.sounds.playTick(0.2);
  });
});

// Sound toggle
soundBtn.addEventListener('click', () => {
  isAudioMuted = !isAudioMuted;
  if (window.sounds) window.sounds.isMuted = isAudioMuted;
  soundBtn.innerText = isAudioMuted ? '🔇' : '🔊';
  showToast(isAudioMuted ? 'Sound Muted' : 'Sound Enabled');
});

// User audio unlocking gesture
function ensureAudio() {
  if (window.sounds && !isAudioMuted) {
    window.sounds.init();
  }
}

// Toast helper
function showToast(message) {
  toast.innerText = message;
  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 2200);
}

// Screen switcher
function showScreen(screen) {
  [screenWelcome, screenLobby, screenGame, screenSummary, screenGameover].forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('flex');
  });
  screen.classList.remove('hidden');
  screen.classList.add('flex');
}

// Check URL query parameters for direct room joining
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    roomCodeInput.value = roomParam.toUpperCase();
    showToast(`Joining Room ${roomParam.toUpperCase()}`);
  }
});

// Socket Connected
socket.on('connect', () => {
  myId = socket.id;
  console.log(`Connected with ID: ${myId}`);
});

// Create Room Handler
btnCreateRoom.addEventListener('click', () => {
  ensureAudio();
  const name = playerNameInput.value.trim() || 'Master Thief';
  socket.emit('create_room', { playerName: name, avatar: selectedAvatar });
});

// Join Room Handler
btnJoinRoom.addEventListener('click', () => {
  ensureAudio();
  const name = playerNameInput.value.trim() || 'Shadow Infiltrator';
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    showToast('Please enter a 4-letter room code!');
    return;
  }
  socket.emit('join_room', { code, playerName: name, avatar: selectedAvatar });
});

// Copy Invite Link
function copyInviteLink() {
  if (!currentRoom) return;
  const inviteUrl = `${window.location.origin}/?room=${currentRoom.code}`;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showToast('Invite link copied to clipboard!');
  }).catch(() => {
    showToast(`Share Code: ${currentRoom.code}`);
  });
}

btnCopyLink.addEventListener('click', copyInviteLink);
if (btnCopyLink2) btnCopyLink2.addEventListener('click', copyInviteLink);

// Add Bot
if (btnAddBot) {
  btnAddBot.addEventListener('click', () => {
    ensureAudio();
    socket.emit('add_bot');
    showToast('Added AI Bot Thief!');
  });
}

// Start Game
btnStartGame.addEventListener('click', () => {
  ensureAudio();
  socket.emit('start_game');
});

// Cash Out
btnCashOut.addEventListener('click', () => {
  ensureAudio();
  if (navigator.vibrate) navigator.vibrate(80);
  socket.emit('cash_out');
});

// Pass Loot
btnPassLoot.addEventListener('click', () => {
  ensureAudio();
  if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
  socket.emit('pass_loot', {});
});

// Sabotage / Trip Alarm
btnSabotage.addEventListener('click', () => {
  ensureAudio();
  if (navigator.vibrate) navigator.vibrate(40);
  socket.emit('sabotage_alarm');
});

// Snatch
btnSnatch.addEventListener('click', () => {
  ensureAudio();
  socket.emit('snatch_loot');
});

// Next Round & Restart
btnNextRound.addEventListener('click', () => {
  ensureAudio();
  socket.emit('next_round');
});

btnRestartGame.addEventListener('click', () => {
  ensureAudio();
  socket.emit('restart_game');
});

// Server Room Update Listener
socket.on('room_update', (room) => {
  currentRoom = room;

  // Header room badge
  roomBadge.classList.remove('hidden');
  roomCodeDisplay.innerText = room.code;
  lobbyCodeDisplay.innerText = room.code;

  // Check state
  if (room.gameState === 'lobby') {
    showScreen(screenLobby);
    renderLobby(room);
  } else if (room.gameState === 'active') {
    showScreen(screenGame);
    renderActiveGame(room);
  } else if (room.gameState === 'busted') {
    handleBustedState(room);
  } else if (room.gameState === 'safe_end' || room.gameState === 'round_summary') {
    showScreen(screenSummary);
    renderSummary(room);
  } else if (room.gameState === 'game_over') {
    showScreen(screenGameover);
    renderGameOver(room);
  }

  // Update live event feed
  if (room.lastEvent) {
    liveEventBanner.innerText = room.lastEvent.text;
  }
});

// Fast Tick Update Listener (every 100ms)
socket.on('tick_update', ({ currentValue, dangerLevel, currentHolderId }) => {
  valueTicker.innerText = `$${currentValue.toLocaleString()}`;
  dangerBar.style.width = `${dangerLevel}%`;

  // Danger Threat text & colors
  if (dangerLevel < 40) {
    dangerText.innerText = `NORMAL (${dangerLevel}%)`;
    dangerText.className = 'text-emerald-400 font-bold';
    dangerVignette.className = 'danger-vignette';
  } else if (dangerLevel < 70) {
    dangerText.innerText = `ELEVATED (${dangerLevel}%)`;
    dangerText.className = 'text-amber-400 font-bold';
    dangerVignette.className = 'danger-vignette danger-high';
    if (Math.random() < 0.15 && window.sounds) window.sounds.playTick(dangerLevel / 100);
  } else {
    dangerText.innerText = `🚨 CRITICAL (${dangerLevel}%)`;
    dangerText.className = 'text-rose-500 font-black animate-pulse';
    dangerVignette.className = 'danger-vignette danger-critical';
    if (Math.random() < 0.3 && window.sounds) {
      window.sounds.playTick(dangerLevel / 100);
      window.sounds.playHeartbeat();
    }
  }

  // If holder changed
  if (currentRoom) {
    currentRoom.currentHolderId = currentHolderId;
    updateControlVisibility(currentRoom);
  }
});

// Sound Effect Events
socket.on('sound_effect', (data) => {
  if (!window.sounds) return;
  if (data.type === 'cash_out') {
    window.sounds.playCashOut();
    showToast(`💰 ${data.player} banked $${data.amount.toLocaleString()}!`);
  } else if (data.type === 'whoosh') {
    window.sounds.playWhoosh();
  } else if (data.type === 'glitch') {
    window.sounds.playGlitch();
  } else if (data.type === 'snatch') {
    window.sounds.playSnatch();
  }
});

// Sabotage Pulse Event
socket.on('sabotage_pulse', ({ hackerName }) => {
  liveEventBanner.innerText = `⚡ ${hackerName} hacked security systems!`;
  if (dangerVignette) {
    dangerVignette.classList.add('danger-critical');
    setTimeout(() => {
      if (currentRoom && currentRoom.dangerLevel < 70) {
        dangerVignette.classList.remove('danger-critical');
      }
    }, 250);
  }
});

socket.on('snatch_failed', (msg) => {
  showToast(msg);
});

socket.on('error_message', (msg) => {
  showToast(msg);
});

// Render Lobby
function renderLobby(room) {
  document.getElementById('player-count').innerText = room.players.length;
  const listEl = document.getElementById('players-list');
  listEl.innerHTML = '';

  room.players.forEach(p => {
    const isMe = p.id === myId;
    const card = document.createElement('div');
    card.className = `flex items-center gap-2.5 p-2.5 rounded-xl border ${isMe ? 'bg-amber-500/10 border-amber-400/50' : 'bg-slate-800/80 border-slate-700/60'}`;
    card.innerHTML = `
      <span class="text-2xl">${p.avatar}</span>
      <div class="overflow-hidden">
        <p class="text-xs font-bold text-slate-100 truncate flex items-center gap-1">
          ${p.name} ${isMe ? '<span class="text-[10px] text-amber-400 font-normal">(You)</span>' : ''}
        </p>
        <span class="text-[10px] text-slate-400">${p.isHost ? '👑 Host' : 'Thief'}</span>
      </div>
    `;
    listEl.appendChild(card);
  });

  // Host button state
  const isHost = room.hostId === myId;
  btnStartGame.style.display = isHost ? 'block' : 'none';
  document.getElementById('lobby-host-note').style.display = isHost ? 'none' : 'block';
}

// Render Active Game
function renderActiveGame(room) {
  gameRoundBadge.innerText = `${room.currentRound}/${room.maxRounds}`;
  if (room.loot) {
    lootIcon.innerText = room.loot.icon;
    lootName.innerText = room.loot.name;
  }

  const holder = room.players.find(p => p.id === room.currentHolderId);
  if (holder) {
    holderAvatar.innerText = holder.avatar;
    holderName.innerText = holder.name + (holder.id === myId ? ' (YOU!)' : '');
  }

  updateControlVisibility(room);
}

// Dynamic Action Control Toggle
function updateControlVisibility(room) {
  const isHolder = room.currentHolderId === myId;
  const me = room.players.find(p => p.id === myId);

  controlsHolder.classList.add('hidden');
  controlsSpectator.classList.add('hidden');
  controlsSafe.classList.add('hidden');

  if (isHolder) {
    controlsHolder.classList.remove('hidden');
    holderStatusTitle.innerText = '🚨 YOU ARE HOLDING THE LOOT!';
    holderStatusTitle.className = 'text-xs uppercase font-black tracking-widest text-emerald-400 animate-pulse';
  } else if (me && me.status === 'safe') {
    controlsSafe.classList.remove('hidden');
    controlsSpectator.classList.remove('hidden'); // Safe players can still sabotage!
    holderStatusTitle.innerText = 'CURRENT VAULT VALUE';
    holderStatusTitle.className = 'text-xs uppercase font-black tracking-widest text-slate-400';
  } else {
    controlsSpectator.classList.remove('hidden');
    holderStatusTitle.innerText = 'CURRENT VAULT VALUE';
    holderStatusTitle.className = 'text-xs uppercase font-black tracking-widest text-slate-400';
  }
}

// Handle Busted / Lockdown Animation
function handleBustedState(room) {
  if (window.sounds) window.sounds.playLockdown();
  document.body.classList.add('shake');
  dangerVignette.className = 'danger-vignette danger-critical';
  setTimeout(() => document.body.classList.remove('shake'), 800);
}

// Render Round Summary
function renderSummary(room) {
  dangerVignette.className = 'danger-vignette';
  const summaryTitle = document.getElementById('summary-title');
  const summarySubtitle = document.getElementById('summary-subtitle');
  const summaryBadge = document.getElementById('summary-badge');

  if (room.lastEvent && room.lastEvent.type === 'LOCKDOWN') {
    summaryBadge.innerText = '🚨';
    summaryTitle.innerText = 'LOCKDOWN TRIGGERED!';
    summaryTitle.className = 'text-3xl font-black text-rose-500 uppercase tracking-tight';
    summarySubtitle.innerText = `${room.lastEvent.victimName || 'The holder'} was caught by vault security!`;
  } else {
    summaryBadge.innerText = '💰';
    summaryTitle.innerText = 'VAULT CLEARED!';
    summaryTitle.className = 'text-3xl font-black text-emerald-400 uppercase tracking-tight';
    summarySubtitle.innerText = 'Thieves successfully cashed out before security arrived!';
  }

  // Leaderboard
  const boardEl = document.getElementById('summary-leaderboard');
  boardEl.innerHTML = '';
  
  // Sort players by total score descending
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  sorted.forEach((p, idx) => {
    const isMe = p.id === myId;
    const row = document.createElement('div');
    row.className = `flex items-center justify-between p-2.5 rounded-xl border ${isMe ? 'bg-amber-500/10 border-amber-400/50' : 'bg-slate-800/60 border-slate-700/50'}`;
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs font-bold text-slate-500">#${idx + 1}</span>
        <span class="text-xl">${p.avatar}</span>
        <span class="text-xs font-bold ${isMe ? 'text-amber-400' : 'text-slate-200'}">${p.name}</span>
      </div>
      <div class="text-right">
        <span class="text-xs font-black font-mono text-emerald-400">$${p.score.toLocaleString()}</span>
        ${p.roundScore > 0 ? `<span class="block text-[10px] text-emerald-300 font-mono">+${p.roundScore.toLocaleString()}</span>` : ''}
      </div>
    `;
    boardEl.appendChild(row);
  });

  // Next Round Button for host
  const isHost = room.hostId === myId;
  btnNextRound.style.display = isHost ? 'block' : 'none';
}

// Render Game Over Podium
function renderGameOver(room) {
  dangerVignette.className = 'danger-vignette';
  const podiumEl = document.getElementById('gameover-podium');
  podiumEl.innerHTML = '';

  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const trophies = ['🥇', '🥈', '🥉'];

  sorted.forEach((p, idx) => {
    const isMe = p.id === myId;
    const card = document.createElement('div');
    const isFirst = idx === 0;
    card.className = `flex items-center justify-between p-3.5 rounded-2xl border ${isFirst ? 'bg-amber-500/20 border-amber-400 shadow-xl shadow-amber-500/20' : 'bg-slate-900 border-slate-800'}`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl">${trophies[idx] || '🎖️'}</span>
        <span class="text-2xl">${p.avatar}</span>
        <div class="text-left">
          <h4 class="text-sm font-black ${isMe ? 'text-amber-400' : 'text-slate-100'}">${p.name}</h4>
          <span class="text-[10px] text-slate-400 font-mono">${isFirst ? 'Master Heist Kingpin' : 'Crew Member'}</span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-lg font-black font-mono text-emerald-400">$${p.score.toLocaleString()}</span>
      </div>
    `;
    podiumEl.appendChild(card);
  });

  const isHost = room.hostId === myId;
  btnRestartGame.style.display = isHost ? 'block' : 'none';
}
