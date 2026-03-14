// ===== Configuration =====
const GRID_SIZE = 30;
const CELL_SIZE = 20; // 600 / 30
let gameSpeed = 120;
let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');

// ===== State =====
let snake, direction, nextDirection, food, specialFood, score, gameLoop, isPaused, isRunning, particles, trail;

// ===== DOM =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameoverScreen = document.getElementById('gameoverScreen');
const pauseOverlay = document.getElementById('pauseOverlay');

// ===== Screens =====
function showScreen(screen) {
  [startScreen, gameScreen, gameoverScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

// ===== Difficulty =====
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSpeed = parseInt(btn.dataset.speed);
  });
});

// ===== Init Game =====
function initGame() {
  const mid = Math.floor(GRID_SIZE / 2);
  snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  isPaused = false;
  isRunning = true;
  particles = [];
  trail = [];
  specialFood = null;

  spawnFood();
  updateHUD();
  showScreen(gameScreen);
  pauseOverlay.classList.add('hidden');

  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(gameStep, gameSpeed);
}

// ===== Spawn Food =====
function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;

  // 15% chance to also spawn special food
  if (!specialFood && Math.random() < 0.15) {
    let sPos;
    do {
      sPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(s => s.x === sPos.x && s.y === sPos.y) || (sPos.x === food.x && sPos.y === food.y));
    specialFood = { ...sPos, timer: 80 };
  }
}

// ===== Game Step =====
function gameStep() {
  if (isPaused) return;

  direction = { ...nextDirection };
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Wall collision (wrap mode)
  head.x = (head.x + GRID_SIZE) % GRID_SIZE;
  head.y = (head.y + GRID_SIZE) % GRID_SIZE;

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  // Trail effect
  trail.push({ x: snake[snake.length - 1].x, y: snake[snake.length - 1].y, alpha: 0.4 });
  if (trail.length > 12) trail.shift();

  snake.unshift(head);

  // Eat food
  let ate = false;
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    ate = true;
    spawnParticles(food.x, food.y, '#00ffaa', 12);
    spawnFood();
  } else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
    score += 30;
    ate = true;
    spawnParticles(specialFood.x, specialFood.y, '#ffd740', 18);
    specialFood = null;
  } else {
    snake.pop();
  }

  // Special food timer
  if (specialFood) {
    specialFood.timer--;
    if (specialFood.timer <= 0) specialFood = null;
  }

  if (ate) updateHUD();
  render();
}

// ===== Particles =====
function spawnParticles(gx, gy, color, count) {
  const cx = gx * CELL_SIZE + CELL_SIZE / 2;
  const cy = gy * CELL_SIZE + CELL_SIZE / 2;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ===== Render =====
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid (subtle)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }

  // Trail
  trail.forEach((t, i) => {
    t.alpha -= 0.03;
    if (t.alpha > 0) {
      ctx.fillStyle = `rgba(0, 255, 170, ${t.alpha * 0.15})`;
      ctx.beginPath();
      ctx.roundRect(t.x * CELL_SIZE + 1, t.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
      ctx.fill();
    }
  });

  // Snake body
  snake.forEach((seg, i) => {
    const progress = i / snake.length;
    const r = Math.round(0 + progress * 80);
    const g = Math.round(255 - progress * 120);
    const b = Math.round(170 - progress * 60);

    // Glow for head
    if (i === 0) {
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 15;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.roundRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, i === 0 ? 6 : 4);
    ctx.fill();

    // Eyes on head
    if (i === 0) {
      ctx.shadowBlur = 0;
      const ex = seg.x * CELL_SIZE + CELL_SIZE / 2;
      const ey = seg.y * CELL_SIZE + CELL_SIZE / 2;

      const eyeOffX = direction.x * 3;
      const eyeOffY = direction.y * 3;
      const perpX = direction.y * 4;
      const perpY = direction.x * 4;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex + eyeOffX + perpX, ey + eyeOffY - perpY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + eyeOffX - perpX, ey + eyeOffY + perpY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a0a1a';
      ctx.beginPath();
      ctx.arc(ex + eyeOffX * 1.3 + perpX, ey + eyeOffY * 1.3 - perpY, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + eyeOffX * 1.3 - perpX, ey + eyeOffY * 1.3 + perpY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.shadowBlur = 0;

  // Food
  const pulse = Math.sin(Date.now() / 200) * 2;
  ctx.shadowColor = '#00ffaa';
  ctx.shadowBlur = 12 + pulse;
  ctx.fillStyle = '#00ffaa';
  ctx.beginPath();
  ctx.arc(
    food.x * CELL_SIZE + CELL_SIZE / 2,
    food.y * CELL_SIZE + CELL_SIZE / 2,
    CELL_SIZE / 2 - 3 + pulse * 0.3,
    0, Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  // Special food
  if (specialFood) {
    const sp = Math.sin(Date.now() / 150) * 3;
    const opacity = specialFood.timer < 20 ? (specialFood.timer % 4 < 2 ? 1 : 0.3) : 1;
    ctx.globalAlpha = opacity;
    ctx.shadowColor = '#ffd740';
    ctx.shadowBlur = 16 + sp;
    ctx.fillStyle = '#ffd740';
    ctx.beginPath();
    // Draw diamond shape
    const sx = specialFood.x * CELL_SIZE + CELL_SIZE / 2;
    const sy = specialFood.y * CELL_SIZE + CELL_SIZE / 2;
    const sz = CELL_SIZE / 2 - 2 + sp * 0.3;
    ctx.moveTo(sx, sy - sz);
    ctx.lineTo(sx + sz, sy);
    ctx.lineTo(sx, sy + sz);
    ctx.lineTo(sx - sz, sy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Particles
  updateParticles();
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ===== HUD =====
function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('highScore').textContent = highScore;
  document.getElementById('length').textContent = snake.length;
}

// ===== Game Over =====
function gameOver() {
  isRunning = false;
  clearInterval(gameLoop);

  const isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore.toString());
  }

  document.getElementById('finalScore').textContent = score;
  document.getElementById('newRecord').classList.toggle('hidden', !isNewRecord);
  showScreen(gameoverScreen);
}

// ===== Input =====
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (key === 'p' && isRunning) {
    isPaused = !isPaused;
    pauseOverlay.classList.toggle('hidden', !isPaused);
    return;
  }

  const dirs = {
    arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
  };

  const newDir = dirs[key];
  if (newDir) {
    e.preventDefault();
    // Prevent reversing
    if (newDir.x !== -direction.x || newDir.y !== -direction.y) {
      nextDirection = newDir;
    }
  }
});

// ===== Touch Controls =====
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

  let newDir;
  if (Math.abs(dx) > Math.abs(dy)) {
    newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }

  if (newDir.x !== -direction.x || newDir.y !== -direction.y) {
    nextDirection = newDir;
  }
});

// ===== Buttons =====
document.getElementById('playBtn').addEventListener('click', initGame);
document.getElementById('retryBtn').addEventListener('click', initGame);
document.getElementById('menuBtn').addEventListener('click', () => showScreen(startScreen));

// ===== Init =====
document.getElementById('highScore').textContent = highScore;
