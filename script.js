const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayButton = document.getElementById('overlay-button');
const hudScore = document.getElementById('hud-score');
const hudLives = document.getElementById('hud-lives');
const hudLevel = document.getElementById('hud-level');

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 56;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT =
  (480 - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_PADDING)) / 2;
const BRICK_ROW_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];

const LEVEL_LAYOUTS = [
  [
    '########',
    '########',
    '########',
    '########',
    '########',
  ],
  [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
  ],
  [
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
  ],
];
const TOTAL_LEVELS = LEVEL_LAYOUTS.length;

const INITIAL_LIVES = 3;

const SPEED_INCREASE_INTERVAL = 10000;
const SPEED_INCREASE_AMOUNT = 0.5;
const MAX_BALL_SPEED = 10;

const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;
const MIN_BOUNCE_ANGLE = (12 * Math.PI) / 180;
const LAUNCH_ANGLE = (35 * Math.PI) / 180;

const PARTICLES_PER_BRICK = 10;
const PARTICLE_LIFE = 40;
const PARTICLE_SIZE = 3;
const PARTICLE_GRAVITY = 0.15;
const PARTICLE_SPEED_MIN = 1;
const PARTICLE_SPEED_MAX = 3.5;
const MAX_PARTICLES = 400;

const POPUP_LIFE = 35;
const POPUP_RISE_SPEED = 0.8;
const POPUP_FONT = 'bold 14px sans-serif';

const WALL_SOUND_FREQUENCY = 880;
const PADDLE_SOUND_FREQUENCY = 523;
const TONE_SOUND_DURATION = 0.08;
const TONE_SOUND_GAIN = 0.15;

const BREAK_SOUND_DURATION = 0.12;
const BREAK_SOUND_GAIN = 0.3;
const BREAK_FILTER_FREQUENCY = 1200;

let audioContext = null;
let audioMuted = false;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playToneSound(frequency) {
  if (audioMuted || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(TONE_SOUND_GAIN, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + TONE_SOUND_DURATION);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + TONE_SOUND_DURATION);
}

function playBrickBreakSound() {
  if (audioMuted || !audioContext) return;

  const sampleCount = Math.floor(audioContext.sampleRate * BREAK_SOUND_DURATION);
  const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = BREAK_FILTER_FREQUENCY;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(BREAK_SOUND_GAIN, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + BREAK_SOUND_DURATION);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  source.start();
  source.stop(audioContext.currentTime + BREAK_SOUND_DURATION);
}

function createBricks(level) {
  const bricks = [];
  const layout = LEVEL_LAYOUTS[level];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      if (layout[row][col] !== '#') continue;
      bricks.push({
        x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: BRICK_ROW_COLORS[row],
        alive: true,
        row,
      });
    }
  }
  return bricks;
}

const state = {
  lives: INITIAL_LIVES,
  score: 0,
  status: 'ready',
  level: 0,
  paddle: { x: 200, y: 600, width: 80, height: 12, speed: 6 },
  ball: {
    x: 240, y: 588, radius: 6,
    prevX: 240, prevY: 588,
    dx: 0, dy: 0,
    speed: 4,
    attached: true,
  },
  bricks: createBricks(0),
  particles: [],
  popups: [],
};

const keys = {
  left: false,
  right: false,
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') keys.left = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.key === ' ') launchBall();
  if (e.key === 'm' || e.key === 'M') audioMuted = !audioMuted;
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
});

canvas.addEventListener('click', () => {
  launchBall();
});

function setBallDirection(ball, angle) {
  const limited = Math.max(-MAX_BOUNCE_ANGLE, Math.min(MAX_BOUNCE_ANGLE, angle));
  ball.dx = ball.speed * Math.sin(limited);
  ball.dy = -ball.speed * Math.cos(limited);
}

function launchBall() {
  if (state.status === 'win' || state.status === 'gameover') return;
  const ball = state.ball;
  if (!ball.attached) return;
  ensureAudioContext();
  ball.attached = false;
  const towardsCenter = ball.x <= canvas.width / 2 ? 1 : -1;
  setBallDirection(ball, towardsCenter * LAUNCH_ANGLE);
}

function updatePaddle() {
  const paddle = state.paddle;
  if (keys.left) paddle.x -= paddle.speed;
  if (keys.right) paddle.x += paddle.speed;

  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function drawPaddle() {
  const paddle = state.paddle;
  ctx.fillStyle = '#fff';
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function updateBall() {
  const ball = state.ball;
  const paddle = state.paddle;

  if (ball.attached) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    return;
  }

  ball.prevX = ball.x;
  ball.prevY = ball.y;
  ball.x += ball.dx;
  ball.y += ball.dy;

  checkBrickCollision();
  collideWalls();
  collidePaddle();

  if (ball.y - ball.radius > canvas.height) {
    loseLife();
    return;
  }

  checkLevelComplete();
}

function collideWalls() {
  const ball = state.ball;
  let bounced = false;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx);
    bounced = true;
  } else if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx = -Math.abs(ball.dx);
    bounced = true;
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
    bounced = true;
  }

  if (bounced) {
    playToneSound(WALL_SOUND_FREQUENCY);
  }
}

function collidePaddle() {
  const ball = state.ball;
  const paddle = state.paddle;
  if (ball.dy <= 0) return;

  const contactY = paddle.y - ball.radius;
  if (ball.prevY > contactY || ball.y < contactY) return;

  const travel = ball.y - ball.prevY;
  const t = travel > 0 ? (contactY - ball.prevY) / travel : 0;
  const contactX = ball.prevX + (ball.x - ball.prevX) * t;

  if (contactX + ball.radius < paddle.x) return;
  if (contactX - ball.radius > paddle.x + paddle.width) return;

  ball.x = contactX;
  ball.y = contactY;

  const half = paddle.width / 2;
  const offset = (contactX - (paddle.x + half)) / half;
  const clamped = Math.max(-1, Math.min(1, offset));

  let angle = clamped * MAX_BOUNCE_ANGLE;
  if (Math.abs(angle) < MIN_BOUNCE_ANGLE) {
    const sign = ball.dx !== 0 ? Math.sign(ball.dx) : (ball.x <= canvas.width / 2 ? 1 : -1);
    angle = sign * MIN_BOUNCE_ANGLE;
  }

  setBallDirection(ball, angle);
  playToneSound(PADDLE_SOUND_FREQUENCY);
}

function checkLevelComplete() {
  const allDestroyed = state.bricks.every((brick) => !brick.alive);
  if (!allDestroyed) return;

  if (state.level >= TOTAL_LEVELS - 1) {
    state.status = 'win';
  } else {
    advanceLevel();
  }
}

function advanceLevel() {
  state.level += 1;
  state.lives = INITIAL_LIVES;
  state.bricks = createBricks(state.level);
  attachBall();
}

function checkBrickCollision() {
  const ball = state.ball;
  const r = ball.radius;
  let hit = null;
  let bestArea = 0;

  for (const brick of state.bricks) {
    if (!brick.alive) continue;

    const overlapX = Math.min(ball.x + r, brick.x + brick.width) - Math.max(ball.x - r, brick.x);
    if (overlapX <= 0) continue;
    const overlapY = Math.min(ball.y + r, brick.y + brick.height) - Math.max(ball.y - r, brick.y);
    if (overlapY <= 0) continue;

    const area = overlapX * overlapY;
    if (area > bestArea) {
      bestArea = area;
      hit = brick;
    }
  }

  if (!hit) return;

  hit.alive = false;
  state.score += 10;
  spawnBrickParticles(hit);
  spawnScorePopup(hit);
  playBrickBreakSound();
  bounceOffBrick(ball, hit);
}

function spawnBrickParticles(brick) {
  const centerX = brick.x + brick.width / 2;
  const centerY = brick.y + brick.height / 2;

  for (let i = 0; i < PARTICLES_PER_BRICK; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
    state.particles.push({
      x: centerX,
      y: centerY,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      size: PARTICLE_SIZE,
      color: brick.color,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE,
    });
  }

  if (state.particles.length > MAX_PARTICLES) {
    state.particles.splice(0, state.particles.length - MAX_PARTICLES);
  }
}

function spawnScorePopup(brick) {
  state.popups.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    dy: -POPUP_RISE_SPEED,
    text: '+10',
    life: POPUP_LIFE,
    maxLife: POPUP_LIFE,
  });
}

function bounceOffBrick(ball, brick) {
  const r = ball.radius;
  const wasInsideX = ball.prevX + r > brick.x && ball.prevX - r < brick.x + brick.width;
  const wasInsideY = ball.prevY + r > brick.y && ball.prevY - r < brick.y + brick.height;

  if (wasInsideX && !wasInsideY) {
    bounceBrickY(ball, brick);
  } else if (wasInsideY && !wasInsideX) {
    bounceBrickX(ball, brick);
  } else if (!wasInsideX && !wasInsideY) {
    bounceBrickX(ball, brick);
    bounceBrickY(ball, brick);
  } else {
    const penX = Math.min(ball.x + r - brick.x, brick.x + brick.width - (ball.x - r));
    const penY = Math.min(ball.y + r - brick.y, brick.y + brick.height - (ball.y - r));
    if (penY <= penX) bounceBrickY(ball, brick);
    else bounceBrickX(ball, brick);
  }
}

function bounceBrickY(ball, brick) {
  if (ball.prevY <= brick.y + brick.height / 2) {
    ball.y = brick.y - ball.radius;
    ball.dy = -Math.abs(ball.dy);
  } else {
    ball.y = brick.y + brick.height + ball.radius;
    ball.dy = Math.abs(ball.dy);
  }
}

function bounceBrickX(ball, brick) {
  if (ball.prevX <= brick.x + brick.width / 2) {
    ball.x = brick.x - ball.radius;
    ball.dx = -Math.abs(ball.dx);
  } else {
    ball.x = brick.x + brick.width + ball.radius;
    ball.dx = Math.abs(ball.dx);
  }
}

function increaseBallSpeed() {
  const ball = state.ball;
  if (ball.speed >= MAX_BALL_SPEED) return;

  const newSpeed = Math.min(ball.speed + SPEED_INCREASE_AMOUNT, MAX_BALL_SPEED);
  const currentSpeed = Math.hypot(ball.dx, ball.dy);
  if (currentSpeed > 0) {
    const ratio = newSpeed / currentSpeed;
    ball.dx *= ratio;
    ball.dy *= ratio;
  }
  ball.speed = newSpeed;
}

function attachBall() {
  const ball = state.ball;
  ball.attached = true;
  ball.dx = 0;
  ball.dy = 0;
  ball.x = state.paddle.x + state.paddle.width / 2;
  ball.y = state.paddle.y - ball.radius;
  ball.prevX = ball.x;
  ball.prevY = ball.y;
}

function loseLife() {
  state.lives -= 1;
  if (state.lives <= 0) {
    state.status = 'gameover';
  }
  attachBall();
}

function updateParticles() {
  const particles = state.particles;
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.x += particle.dx;
    particle.y += particle.dy;
    particle.dy += PARTICLE_GRAVITY;
    particle.life -= 1;
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updatePopups() {
  const popups = state.popups;
  for (let i = popups.length - 1; i >= 0; i--) {
    const popup = popups[i];
    popup.y += popup.dy;
    popup.life -= 1;
    if (popup.life <= 0) {
      popups.splice(i, 1);
    }
  }
}

function drawBall() {
  const ball = state.ball;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBricks() {
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    ctx.fillStyle = brick.color;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawPopups() {
  ctx.font = POPUP_FONT;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  for (const popup of state.popups) {
    ctx.globalAlpha = popup.life / popup.maxLife;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;
}

function updateHud() {
  hudScore.textContent = `Score: ${state.score}`;
  hudLives.textContent = `Vidas: ${state.lives}`;
  hudLevel.textContent = `Nivel: ${state.level + 1}/${TOTAL_LEVELS}`;
}

function showOverlay(title) {
  overlayTitle.textContent = title;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function syncOverlay() {
  if (state.status === 'win') {
    showOverlay('¡Ganaste!');
  } else if (state.status === 'gameover') {
    showOverlay('Game Over');
  } else {
    hideOverlay();
  }
}

function restartGame() {
  state.lives = INITIAL_LIVES;
  state.score = 0;
  state.status = 'ready';
  state.level = 0;
  state.paddle.x = 200;
  state.bricks = createBricks(0);
  state.particles = [];
  state.popups = [];

  state.ball.speed = 4;
  attachBall();

  startTime = null;
  lastSpeedIncreaseElapsed = 0;
}

overlayButton.addEventListener('click', restartGame);

function update() {
  if (state.status === 'win' || state.status === 'gameover') return;
  updatePaddle();
  updateBall();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawPaddle();
  drawBall();
  drawParticles();
  drawPopups();
  updateHud();
  syncOverlay();
}

let startTime = null;
let lastSpeedIncreaseElapsed = 0;

function updateDifficulty(timestamp) {
  if (startTime === null) startTime = timestamp;
  const elapsed = timestamp - startTime;
  if (elapsed - lastSpeedIncreaseElapsed >= SPEED_INCREASE_INTERVAL) {
    lastSpeedIncreaseElapsed = elapsed;
    increaseBallSpeed();
  }
}

function loop(timestamp) {
  updateDifficulty(timestamp);
  update();
  updateParticles();
  updatePopups();
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
