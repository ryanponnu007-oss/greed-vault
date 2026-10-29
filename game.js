// 2D TOP-DOWN MARIO-KART HEIST MAYHEM
const socket = io();

class AudioFX {
  constructor() {
    this.ctx = null;
    this.isBgmPlaying = false;
    this.bgmTimer = null;
    this.noteIdx = 0;
  }
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggleBGM() {
    this.init();
    this.isBgmPlaying = !this.isBgmPlaying;
    if (this.isBgmPlaying) this.startBGM();
    else this.stopBGM();
    return this.isBgmPlaying;
  }
  startBGM() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    const bassline = [110, 110, 130.81, 110, 146.83, 110, 164.81, 130.81]; // 8-bit heist groove
    this.bgmTimer = setInterval(() => {
      if (!this.isBgmPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freq = bassline[this.noteIdx % bassline.length];
      this.noteIdx++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }, 180);
  }
  stopBGM() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  }
  playPickup() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }
  playCashOut() {
    this.init();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }
  playTackle() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }
  playSlip() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Cartoon slide whistle up then drop
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.15);
    osc.frequency.linearRampToValueAtTime(250, now + 0.35);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
  playSiren() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.25);
    osc.frequency.linearRampToValueAtTime(750, now + 0.5);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }
  playBusted() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }
  playWhoosh() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}
const sfx = new AudioFX();

let myId = null;
let currentRoom = null;
let isHost = false;
let selectedAvatar = '🦊';
let myHeldItem = null;

const MAP_W = 900;
const MAP_H = 600;
let mapData = {
  pillars: [
    { x: 180, y: 160, w: 70, h: 70 },
    { x: 650, y: 160, w: 70, h: 70 },
    { x: 180, y: 370, w: 70, h: 70 },
    { x: 650, y: 370, w: 70, h: 70 },
    { x: 415, y: 265, w: 70, h: 70 }
  ],
  escapeZone: { x: 350, y: 10, w: 200, h: 55 }
};

let worldState = { players: [], leaderboard: [], guards: [], loots: [], itemBoxes: [], bananas: [], smokes: [], timeLeft: 90 };

// Particle & Floating Text Systems for Game Juice!
let particles = [];
let floatingTexts = [];

function spawnConfetti(x, y) {
  const colors = ['#f59e0b', '#10b981', '#38bdf8', '#a855f7', '#fbbf24'];
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1.0,
      size: 3 + Math.random() * 4
    });
  }
}

function spawnFloatingText(text, x, y, color = '#34d399') {
  floatingTexts.push({ text, x, y, color, life: 1.0 });
}

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const scale = Math.min(cw / MAP_W, ch / MAP_H);
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  canvas.style.width = `${MAP_W * scale}px`;
  canvas.style.height = `${MAP_H * scale}px`;
}
window.addEventListener('resize', resizeCanvas);

// Inputs
let keys = { w: false, a: false, s: false, d: false };
let joystick = { active: false, startX: 0, startY: 0, vx: 0, vy: 0 };
let isDashing = false;

window.addEventListener('keydown', (e) => {
  sfx.init();
  if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.w = true;
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.a = true;
  if (['ArrowDown', 's', 'S'].includes(e.key)) keys.s = true;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.d = true;
  if (e.key === ' ' || e.key === 'Shift') isDashing = true;
  if (['e', 'E', 'f', 'F'].includes(e.key)) {
    socket.emit('use_powerup');
  }
  sendMovement();
});

window.addEventListener('keyup', (e) => {
  if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.w = false;
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.a = false;
  if (['ArrowDown', 's', 'S'].includes(e.key)) keys.s = false;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.d = false;
  if (e.key === ' ' || e.key === 'Shift') isDashing = false;
  sendMovement();
});

function sendMovement() {
  let vx = 0;
  let vy = 0;

  if (joystick.active) {
    vx = joystick.vx;
    vy = joystick.vy;
  } else {
    if (keys.a) vx -= 1;
    if (keys.d) vx += 1;
    if (keys.w) vy -= 1;
    if (keys.s) vy += 1;
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }
  }

  socket.emit('player_move', { vx, vy, isDashing });
}

// Touch Virtual Joystick
const touchZone = document.getElementById('touch-zone-left');
const joyBase = document.getElementById('joystick-base');
const joyKnob = document.getElementById('joystick-knob');
const btnActionMobile = document.getElementById('btn-mobile-action');
const btnItemMobile = document.getElementById('btn-mobile-item');

if (touchZone) {
  touchZone.addEventListener('touchstart', (e) => {
    sfx.init();
    e.preventDefault();
    const touch = e.touches[0];
    const rect = touchZone.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    joystick.active = true;
    joystick.startX = x;
    joystick.startY = y;
    joystick.vx = 0;
    joystick.vy = 0;

    joyBase.style.left = `${x}px`;
    joyBase.style.top = `${y}px`;
    joyBase.classList.remove('hidden');
    joyKnob.style.transform = `translate(-50%, -50%)`;
  }, { passive: false });

  touchZone.addEventListener('touchmove', (e) => {
    if (!joystick.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = touchZone.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const dx = x - joystick.startX;
    const dy = y - joystick.startY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);

    joyKnob.style.transform = `translate(${Math.cos(angle) * clampedDist - 24}px, ${Math.sin(angle) * clampedDist - 24}px)`;

    joystick.vx = Math.cos(angle) * (clampedDist / maxRadius);
    joystick.vy = Math.sin(angle) * (clampedDist / maxRadius);

    sendMovement();
  }, { passive: false });

  const endTouch = () => {
    joystick.active = false;
    joystick.vx = 0;
    joystick.vy = 0;
    joyBase.classList.add('hidden');
    sendMovement();
  };

  touchZone.addEventListener('touchend', endTouch);
  touchZone.addEventListener('touchcancel', endTouch);
}

if (btnActionMobile) {
  btnActionMobile.addEventListener('touchstart', (e) => {
    sfx.init();
    e.preventDefault();
    isDashing = true;
    sendMovement();
    if (navigator.vibrate) navigator.vibrate(40);
  });
  btnActionMobile.addEventListener('touchend', () => {
    isDashing = false;
    sendMovement();
  });
}

if (btnItemMobile) {
  btnItemMobile.addEventListener('touchstart', (e) => {
    sfx.init();
    e.preventDefault();
    socket.emit('use_powerup');
    if (navigator.vibrate) navigator.vibrate([30, 30]);
  });
}

// Socket Events
socket.on('connect', () => {
  myId = socket.id;
});

socket.on('room_created', (data) => {
  currentRoom = data.code;
  isHost = true;
  document.getElementById('room-code-display').innerText = data.code;
  const sbCode = document.getElementById('sidebar-room-code');
  if (sbCode) sbCode.innerText = data.code;
  showScreen('screen-lobby');
});

socket.on('room_joined', (data) => {
  currentRoom = data.code;
  isHost = data.isHost;
  document.getElementById('room-code-display').innerText = data.code;
  const sbCode = document.getElementById('sidebar-room-code');
  if (sbCode) sbCode.innerText = data.code;
  showScreen('screen-lobby');
});

socket.on('lobby_update', ({ code, players, hostId }) => {
  document.getElementById('lobby-players-count').innerText = players.length;
  const list = document.getElementById('lobby-players-grid');
  list.innerHTML = '';

  players.forEach(p => {
    const isMe = p.id === myId;
    const card = document.createElement('div');
    card.className = `flex items-center gap-2.5 p-3 rounded-2xl border ${isMe ? 'bg-amber-500/15 border-amber-400' : 'bg-slate-900 border-slate-800'}`;
    card.innerHTML = `
      <span class="text-3xl">${p.avatar}</span>
      <div>
        <p class="text-sm font-bold text-white">${p.name} ${isMe ? '<span class="text-amber-400 text-xs font-normal">(You)</span>' : ''}</p>
        <span class="text-[10px] text-slate-400 uppercase font-mono">${p.id === hostId ? '👑 Lobby Host' : 'Rival Thief'}</span>
      </div>
    `;
    list.appendChild(card);
  });

  const startBtn = document.getElementById('btn-start-game');
  if (startBtn) startBtn.style.display = (hostId === myId) ? 'block' : 'none';
});

socket.on('game_started', () => {
  showScreen('screen-game');
  resizeCanvas();
  sfx.init();
});

socket.on('world_state', (state) => {
  worldState = state;
  const timerEl = document.getElementById('hud-timer');
  if (timerEl) timerEl.innerText = `${state.timeLeft}s`;

  // Render live rank scoreboard on HUD
  const boardEl = document.getElementById('hud-rankings');
  if (boardEl && state.leaderboard) {
    boardEl.innerHTML = state.leaderboard.map((p, i) => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${i === 0 ? 'bg-amber-500/25 text-amber-300 font-black' : 'bg-slate-900/80 text-slate-300 font-bold'} text-[11px] font-mono">
        ${i === 0 ? '👑' : `#${i + 1}`} ${p.avatar} ${p.name}: $${p.score}
      </span>
    `).join('');
  }

  const me = state.players.find(p => p.id === myId);
  const scoreEl = document.getElementById('hud-score');
  if (scoreEl && me) scoreEl.innerText = `$${me.score.toLocaleString()}`;

  // Update item button UI
  if (btnItemMobile && me) {
    myHeldItem = me.heldItem;
    if (me.heldItem) {
      const icons = { banana: '🍌', rocket: '🚀', magnet: '🧲', smoke: '💨' };
      btnItemMobile.classList.remove('opacity-30', 'pointer-events-none');
      btnItemMobile.classList.add('opacity-100', 'animate-pulse');
      btnItemMobile.querySelector('.item-icon').innerText = icons[me.heldItem] || '📦';
      btnItemMobile.querySelector('.item-name').innerText = me.heldItem.toUpperCase();
    } else {
      btnItemMobile.classList.add('opacity-30', 'pointer-events-none');
      btnItemMobile.classList.remove('opacity-100', 'animate-pulse');
      btnItemMobile.querySelector('.item-icon').innerText = '📦';
      btnItemMobile.querySelector('.item-name').innerText = 'NO ITEM';
    }
  }
});

socket.on('got_item', ({ item }) => {
  const names = { banana: '🍌 Banana Peel', rocket: '🚀 Rocket Boost', magnet: '🧲 Loot Magnet', smoke: '💨 Smoke Bomb' };
  showBanner(`Got ${names[item]}! Tap [ITEM] or press E!`, 'text-yellow-300');
});

socket.on('item_used', () => {
  myHeldItem = null;
});

socket.on('sound', (type) => {
  if (type === 'pickup') sfx.playPickup();
  else if (type === 'cash_out') sfx.playCashOut();
  else if (type === 'tackle') sfx.playTackle();
  else if (type === 'slip') sfx.playSlip();
  else if (type === 'siren') sfx.playSiren();
  else if (type === 'busted') sfx.playBusted();
  else if (type === 'whoosh') sfx.playWhoosh();
});

socket.on('event_msg', ({ text }) => {
  showBanner(text);
  if (text.includes('ESCAPED')) {
    spawnConfetti(450, 40);
    const amount = text.includes('2500') ? '+$2,500!' : (text.includes('1000') ? '+$1,000!' : '+$300!');
    spawnFloatingText(`💰 ${amount}`, 450, 45, '#34d399');
  } else if (text.includes('TACKLED') || text.includes('SLIPPED')) {
    spawnFloatingText('💥 YOINK!', 450, 250, '#f87171');
  } else if (text.includes('SUDDEN DEATH')) {
    spawnConfetti(450, 365);
    spawnFloatingText('👑 MEGA EMERALD DROPPED!', 450, 320, '#fbbf24');
  }
});

socket.on('game_over', ({ players, winner }) => {
  showScreen('screen-gameover');
  const podium = document.getElementById('gameover-podium');
  podium.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];

  players.forEach((p, idx) => {
    const isMe = p.id === myId;
    const card = document.createElement('div');
    card.className = `flex items-center justify-between p-3.5 rounded-2xl border ${idx === 0 ? 'bg-amber-500/25 border-amber-400 shadow-xl shadow-amber-500/20' : 'bg-slate-900 border-slate-800'}`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-3xl">${medals[idx] || '🎖️'}</span>
        <span class="text-2xl">${p.avatar}</span>
        <div class="text-left">
          <h4 class="text-sm font-black ${isMe ? 'text-amber-400' : 'text-white'}">${p.name}</h4>
          <span class="text-[10px] text-slate-400 uppercase font-mono">${idx === 0 ? '🏆 WINNER (KING OF THIEVES)' : 'Rival Infiltrator'}</span>
        </div>
      </div>
      <span class="text-lg font-black font-mono text-emerald-400">$${p.score.toLocaleString()}</span>
    `;
    podium.appendChild(card);
  });
});

socket.on('go_to_lobby', () => {
  showScreen('screen-lobby');
});

function showBanner(text, color = 'text-amber-300') {
  const el = document.getElementById('hud-banner');
  if (!el) return;
  el.innerText = text;
  el.className = `text-xs font-bold ${color} tracking-wide truncate max-w-xs transition`;
}

function showScreen(id) {
  ['screen-welcome', 'screen-lobby', 'screen-game', 'screen-gameover'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.remove('hidden');
    if (id === 'screen-game') {
      document.body.classList.add('in-game');
    } else {
      document.body.classList.remove('in-game');
    }
  }
}

// UI Handlers
document.querySelectorAll('.avatar-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.avatar-opt').forEach(b => {
      b.classList.remove('bg-amber-500/25', 'border-amber-400');
      b.classList.add('bg-slate-800', 'border-slate-700');
    });
    btn.classList.add('bg-amber-500/25', 'border-amber-400');
    btn.classList.remove('bg-slate-800', 'border-slate-700');
    selectedAvatar = btn.getAttribute('data-avatar');
    sfx.playPickup();
  });
});

document.getElementById('btn-create-room').addEventListener('click', () => {
  sfx.init();
  const name = document.getElementById('player-name-input').value.trim() || 'Master Thief';
  socket.emit('create_room', { playerName: name, avatar: selectedAvatar });
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  sfx.init();
  const name = document.getElementById('player-name-input').value.trim() || 'Rival Thief';
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (!code) return alert('Please enter room code!');
  socket.emit('join_room', { code, playerName: name, avatar: selectedAvatar });
});

document.getElementById('btn-start-game').addEventListener('click', () => {
  socket.emit('start_game');
});

document.getElementById('btn-play-again').addEventListener('click', () => {
  socket.emit('start_game');
});

const btnBackLobby = document.getElementById('btn-back-lobby');
if (btnBackLobby) {
  btnBackLobby.addEventListener('click', () => {
    socket.emit('return_to_lobby');
  });
}

// Music Toggle Listener
const btnToggleBgm = document.getElementById('btn-toggle-bgm');
if (btnToggleBgm) {
  btnToggleBgm.addEventListener('click', () => {
    const isPlaying = sfx.toggleBGM();
    btnToggleBgm.innerText = isPlaying ? '🔊' : '🎵';
    btnToggleBgm.className = isPlaying 
      ? 'p-2 rounded-xl bg-amber-500/20 border border-amber-400 text-xs font-bold text-amber-300 transition animate-pulse'
      : 'p-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-300 hover:text-amber-400 transition';
  });
}

// Mobile Rules sidebar toggle
const btnToggleRulesMobile = document.getElementById('btn-toggle-rules-mobile');
const btnCloseSidebarMobile = document.getElementById('btn-close-sidebar-mobile');
const gameSidebar = document.getElementById('game-sidebar');

if (btnToggleRulesMobile && gameSidebar) {
  btnToggleRulesMobile.addEventListener('click', () => {
    gameSidebar.classList.remove('hidden');
    gameSidebar.classList.add('fixed', 'inset-y-0', 'right-0', 'w-5/6', 'z-50', 'flex');
  });
}

if (btnCloseSidebarMobile && gameSidebar) {
  btnCloseSidebarMobile.addEventListener('click', () => {
    gameSidebar.classList.add('hidden');
    gameSidebar.classList.remove('fixed', 'inset-y-0', 'right-0', 'w-5/6', 'z-50', 'flex');
  });
}

const btnMainMenu = document.getElementById('btn-main-menu');
if (btnMainMenu) {
  btnMainMenu.addEventListener('click', () => {
    window.location.href = '/';
  });
}

document.getElementById('btn-copy-code').addEventListener('click', () => {
  if (!currentRoom) return;
  navigator.clipboard.writeText(currentRoom);
  alert(`Room Code copied: ${currentRoom}`);
});

// ==========================================
// 60FPS CANVAS RENDERING (WITH MAYHEM ITEMS)
// ==========================================
function render() {
  ctx.clearRect(0, 0, MAP_W, MAP_H);

  // 1. Vault Floor Grid
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  ctx.strokeStyle = '#141e33';
  ctx.lineWidth = 1;
  const gridSize = 45;
  for (let x = 0; x < MAP_W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_H);
    ctx.stroke();
  }
  for (let y = 0; y < MAP_H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_W, y);
    ctx.stroke();
  }

  // 2. Escape Zone (Getaway Van)
  const ez = mapData.escapeZone;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fillRect(ez.x, ez.y, ez.w, ez.h);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(ez.x, ez.y, ez.w, ez.h);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('🚐 GETAWAY VAN (BANK CASH HERE)', ez.x + ez.w / 2, ez.y + 32);

  // 3. Vault Safe in Center
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(415, 265, 70, 70);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(415, 265, 70, 70);
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔒', 450, 310);

  // Pillars
  for (const p of mapData.pillars) {
    if (p.x === 415 && p.y === 265) continue;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(p.x + 4, p.y + 6, p.w, p.h);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }

  // 4. Mystery Item Boxes (📦)
  if (worldState.itemBoxes) {
    for (const b of worldState.itemBoxes) {
      if (b.isAvailable) {
        ctx.save();
        ctx.translate(b.x, b.y);

        // Rainbow aura
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📦', 0, 0);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('ITEM', 0, 18);
        ctx.restore();
      }
    }
  }

  // 5. Banana Hazards on Floor (🍌)
  if (worldState.bananas) {
    for (const ban of worldState.bananas) {
      ctx.save();
      ctx.translate(ban.x, ban.y);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍌', 0, 0);
      ctx.restore();
    }
  }

  // 6. Smoke Clouds (💨)
  if (worldState.smokes) {
    for (const sm of worldState.smokes) {
      ctx.save();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(203, 213, 225, 0.3)';
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 7. Guards & Flashlight Vision Cones
  for (const g of worldState.guards) {
    if (g.state !== 'blinded') {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);

      const fov = Math.PI / 3;
      const dist = 175;
      const coneColor = g.state === 'chase' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(251, 191, 36, 0.22)';
      ctx.fillStyle = coneColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, dist, -fov / 2, fov / 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Guard Body
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);

    ctx.fillStyle = g.state === 'blinded' ? '#64748b' : (g.state === 'chase' ? '#ef4444' : '#f59e0b');
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = g.state === 'blinded' ? '#94a3b8' : (g.state === 'chase' ? '#f87171' : '#fbbf24');
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.state === 'blinded' ? '❓ BLINDED' : (g.state === 'chase' ? '🚨 ALERT' : '👮 GUARD'), g.x, g.y - 22);
  }

  // 8. Loots on Floor
  for (const l of worldState.loots) {
    if (!l.isCarried && l.isAvailable) {
      ctx.save();
      ctx.translate(l.x, l.y);

      let glowColor = 'rgba(251, 191, 36, 0.4)';
      let valText = '$300';
      if (l.type === 'diamond') {
        glowColor = 'rgba(56, 189, 248, 0.45)';
        valText = '$1,000';
      } else if (l.type === 'emerald') {
        glowColor = 'rgba(16, 185, 129, 0.65)';
        valText = 'MEGA $2,500!';
      }

      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, l.type === 'emerald' ? 30 : 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = l.type === 'emerald' ? '30px sans-serif' : '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.icon, 0, 0);

      ctx.fillStyle = l.type === 'emerald' ? '#34d399' : '#f8fafc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(valText, 0, l.type === 'emerald' ? 24 : 18);

      ctx.restore();
    }
  }

  // 9. Players
  for (const p of worldState.players) {
    ctx.save();
    ctx.translate(p.x, p.y);

    const isMe = p.id === myId;

    // Rocket Boost Flames 🔥
    if (p.isRocketing) {
      ctx.save();
      ctx.rotate(p.angle);
      ctx.font = '24px sans-serif';
      ctx.fillText('🔥', -28, 6);
      ctx.restore();
    }

    // Carrying Loot
    if (p.hasLoot) {
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💎', 0, -28);

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player Body
    ctx.fillStyle = isMe ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isMe ? '#fff' : '#0284c7';
    ctx.stroke();

    // Emoji Avatar
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.avatar, 0, 1);

    // Name Tag
    ctx.fillStyle = isMe ? '#fde047' : '#e2e8f0';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(p.name, 0, 26);

    // Stunned / Slipped Stars
    if (p.isStunned) {
      ctx.font = '14px sans-serif';
      ctx.fillText('💫💫', 0, -32);
    }

    // Busted Tag
    if (p.isBusted) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillRect(-24, -36, 48, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('BUSTED!', 0, -26);
    }

    ctx.restore();
  }

  // 10. Particles & Confetti
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // 11. Floating Score Popups
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 1.1;
    ft.life -= 0.016;
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    ctx.font = 'black 16px monospace';
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1.0;
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
