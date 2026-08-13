const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayButton = document.getElementById('overlay-button');
const hudScore = document.getElementById('hud-score');
const hudLives = document.getElementById('hud-lives');

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 56;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT =
  (480 - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_PADDING)) / 2;
const BRICK_ROW_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];

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

function createBricks() {
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
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
  lives: 3,
  score: 0,
  status: 'ready',
  paddle: { x: 200, y: 600, width: 80, height: 12, speed: 6 },
  ball: {
    x: 240, y: 588, radius: 6,
    prevX: 240, prevY: 588,
    dx: 0, dy: 0,
    speed: 4,
    attached: true,
  },
  bricks: createBricks(),
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

  checkWin();
}

function collideWalls() {
  const ball = state.ball;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx);
  } else if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx = -Math.abs(ball.dx);
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
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
}

function checkWin() {
  const allDestroyed = state.bricks.every((brick) => !brick.alive);
  if (allDestroyed) {
    state.status = 'win';
  }
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
  bounceOffBrick(ball, hit);
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

function updateHud() {
  hudScore.textContent = `Score: ${state.score}`;
  hudLives.textContent = `Vidas: ${state.lives}`;
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
  state.lives = 3;
  state.score = 0;
  state.status = 'ready';
  state.paddle.x = 200;
  state.bricks = createBricks();

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
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
