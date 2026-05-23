const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const tileCount = 20;
const tileSize = canvas.width / tileCount;
const tickMs = 120;

let snake;
let food;
let direction;
let nextDirection;
let score;
let bestScore = Number(localStorage.getItem("snakeBestScore") || 0);
let timerId = null;
let isPaused = false;
let isGameOver = false;

bestScoreEl.textContent = bestScore;

function resetGame() {
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  isPaused = false;
  isGameOver = false;
  scoreEl.textContent = score;
  statusEl.textContent = "Керуй стрілками або WASD.";
  placeFood();
  draw();
}

function startGame() {
  if (timerId) {
    return;
  }
  if (isGameOver) {
    resetGame();
  }
  isPaused = false;
  statusEl.textContent = "Керуй стрілками або WASD.";
  timerId = setInterval(tick, tickMs);
}

function pauseGame() {
  if (!timerId) {
    return;
  }
  clearInterval(timerId);
  timerId = null;
  isPaused = true;
  statusEl.textContent = "Пауза. Натисни Старт або пробіл.";
}

function restartGame() {
  clearInterval(timerId);
  timerId = null;
  resetGame();
  startGame();
}

function tick() {
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (hitWall(head) || hitSnake(head)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreEl.textContent = score;
    if (score > bestScore) {
      bestScore = score;
      bestScoreEl.textContent = bestScore;
      localStorage.setItem("snakeBestScore", String(bestScore));
    }
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  clearInterval(timerId);
  timerId = null;
  isGameOver = true;
  statusEl.textContent = "Гру завершено. Натисни Заново або пробіл.";
  draw();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake.some((part) => part.x === food.x && part.y === food.y));
}

function hitWall(point) {
  return point.x < 0 || point.y < 0 || point.x >= tileCount || point.y >= tileCount;
}

function hitSnake(point) {
  return snake.some((part) => part.x === point.x && part.y === point.y);
}

function draw() {
  ctx.fillStyle = "#0f1217";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  drawSnake();

  if (isGameOver) {
    ctx.fillStyle = "rgba(15, 18, 23, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Кінець гри", canvas.width / 2, canvas.height / 2);
  }
}

function drawGrid() {
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  for (let i = 1; i < tileCount; i += 1) {
    const line = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(line, 0);
    ctx.lineTo(line, canvas.height);
    ctx.moveTo(0, line);
    ctx.lineTo(canvas.width, line);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? "#5eead4" : "#2dd4bf";
    ctx.fillRect(
      part.x * tileSize + 2,
      part.y * tileSize + 2,
      tileSize - 4,
      tileSize - 4
    );
  });
}

function drawFood() {
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(
    food.x * tileSize + tileSize / 2,
    food.y * tileSize + tileSize / 2,
    tileSize * 0.35,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function setDirection(x, y) {
  if (direction.x + x === 0 && direction.y + y === 0) {
    return;
  }
  nextDirection = { x, y };
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === " " || key === "enter") {
    event.preventDefault();
    if (timerId) {
      pauseGame();
    } else if (isPaused || isGameOver) {
      startGame();
    } else {
      startGame();
    }
    return;
  }

  if (key === "arrowup" || key === "w") {
    event.preventDefault();
    setDirection(0, -1);
  } else if (key === "arrowdown" || key === "s") {
    event.preventDefault();
    setDirection(0, 1);
  } else if (key === "arrowleft" || key === "a") {
    event.preventDefault();
    setDirection(-1, 0);
  } else if (key === "arrowright" || key === "d") {
    event.preventDefault();
    setDirection(1, 0);
  }
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);

resetGame();
