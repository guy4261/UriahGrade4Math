const $ = (id) => document.getElementById(id);
const canvas = $("board");
const ctx = canvas.getContext("2d");
let squares = [],
  squareValue = 1,
  width = 0,
  height = 0,
  size = 32,
  drag = null;
let theme = GAME_THEMES[0];
const noun = (word, count) => (count === 1 ? word.singular : word.plural);
const randomDigit = () => 1 + Math.floor(Math.random() * 9);

let animation = 0,
  activeField = null;
const fields = [...document.querySelectorAll(".formula input")];
// Store a separate tally for each local calendar date, matching the child's browser.
const SCORE_STORAGE_KEY = "uriah-math-daily-correct";
let scoreDate = "";
let dailyCorrect = 0;
let roundCounted = false;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function updateDailyScore(increment = false) {
  const date = todayKey();
  if (scoreDate !== date) {
    scoreDate = date;
    dailyCorrect = 0;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || "null");
    if (
      saved?.date === date &&
      Number.isSafeInteger(saved.count) &&
      saved.count >= 0
    ) {
      dailyCorrect = saved.count;
    }
  } catch {
    // The in-memory counter still works when storage is unavailable.
  }
  if (increment) dailyCorrect += 1;
  try {
    localStorage.setItem(
      SCORE_STORAGE_KEY,
      JSON.stringify({ date, count: dailyCorrect }),
    );
  } catch {
    // Saving progress is optional; the game remains playable.
  }
  $("daily-score").textContent = `תשובות נכונות היום: ${dailyCorrect}`;
}

// Refresh after returning to the tab, and across midnight while it stays open.
window.addEventListener("focus", () => updateDailyScore());
setInterval(() => updateDailyScore(), 60_000);

function calculate() {
  const values = fields.map((field) => field.value || field.placeholder);
  const numbers = [values[0], values[2], values[4]].map((v) => {
    if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)))
      throw new Error("הקלידו מספרים שלמים קטנים מספיק לחישוב.");
    return Number(v);
  });
  const ops = [values[1], values[3]].map((op) => (op === "x" ? "*" : op));
  if (ops.some((op) => !["+", "-", "*", "/"].includes(op)))
    throw new Error("בחרו פעולת חשבון בכל אחד משני הרווחים.");
  const terms = [numbers[0]],
    additions = [];
  for (let i = 0; i < 2; i++) {
    if (ops[i] === "*" || ops[i] === "/") {
      if (ops[i] === "/" && numbers[i + 1] === 0)
        throw new Error("אי אפשר לחלק באפס. נסו מספר אחר.");
      terms[terms.length - 1] =
        ops[i] === "*"
          ? terms.at(-1) * numbers[i + 1]
          : terms.at(-1) / numbers[i + 1];
    } else {
      additions.push(ops[i]);
      terms.push(numbers[i + 1]);
    }
  }
  const result = terms.reduce(
    (total, term, i) =>
      i === 0 ? term : additions[i - 1] === "+" ? total + term : total - term,
    0,
  );
  if (!Number.isFinite(result) || Math.abs(result) > Number.MAX_SAFE_INTEGER)
    throw new Error("המספרים בתרגיל גדולים מדי. נסו מספרים קטנים יותר.");
  return result;
}
function stopAnimation() {
  cancelAnimationFrame(animation);
  animation = 0;
}
function clearFeedback() {
  $("feedback").textContent = "";
  $("feedback").className = "";
  $("next-round").hidden = true;
}
function showKeypad(field) {
  activeField = field;
  fields.forEach((f) => f.classList.toggle("active", f === field));
  const operator = field.classList.contains("operator-field");
  const pad = $("keypad");
  pad.hidden = false;
  pad.classList.toggle("operators", operator);
  pad.replaceChildren();
  const keys = operator
    ? ["+", "-", "x", "/"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "ניקוי", "0", "⌫"];
  for (const key of keys) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = key;
    if (key === "⌫") button.setAttribute("aria-label", "מחיקת הספרה האחרונה");
    button.onpointerdown = (e) => e.preventDefault();
    button.onclick = () => {
      if (operator) field.value = key;
      else if (key === "ניקוי") field.value = "";
      else if (key === "⌫") field.value = field.value.slice(0, -1);
      else field.value += key;
      clearFeedback();
      if (operator) fields[fields.indexOf(field) + 1].focus();
    };
    pad.append(button);
  }
}
fields.forEach((field) => {
  field.onfocus = () => showKeypad(field);
  field.oninput = () => {
    field.value = field.value.replace(/[^0-9]/g, "");
    clearFeedback();
  };
  field.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      $("answer-form").requestSubmit();
    }
    if (
      field.classList.contains("operator-field") &&
      ["+", "-", "x", "X", "*", "/"].includes(event.key)
    ) {
      event.preventDefault();
      field.value = ["*", "X"].includes(event.key) ? "x" : event.key;
      clearFeedback();
    }
  };
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".formula, #keypad")) {
    $("keypad").hidden = true;
    fields.forEach((f) => f.classList.remove("active"));
  }
});
function draw() {
  ctx.clearRect(0, 0, width, height);
  for (const s of squares) {
    if (s === drag?.square) {
      ctx.fillStyle = "#dcebcf";
      ctx.beginPath();
      ctx.roundRect(s.x - 2, s.y - 2, size + 4, size + 4, 6);
      ctx.fill();
    }
    ctx.font = `${size * 0.9}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(theme.object.emoji, s.x + size / 2, s.y + size / 2);
  }
}
function arrange(animated = false) {
  stopAnimation();
  drag = null;
  const options = [];
  for (let rows = 1; rows <= squares.length; rows++)
    if (squares.length % rows === 0) {
      const columns = squares.length / rows;
      const fit = Math.min(
        34,
        (width - 36) / columns - 7,
        (height - 90) / rows - 7,
      );
      if (fit >= 16) options.push({ rows, columns, fit });
    }
  const best = options.length
    ? options
    : [
        {
          rows: 1,
          columns: squares.length,
          fit: Math.min(34, (width - 36) / squares.length - 7),
        },
      ];
  const layout = best[Math.floor(Math.random() * best.length)];
  size = Math.max(3, layout.fit);
  const gap = 7,
    left = (width - layout.columns * (size + gap) + gap) / 2;
  const top = 60 + (height - 60 - layout.rows * (size + gap) + gap) / 2;
  const starts = squares.map((s) => ({ x: s.x, y: s.y }));
  const targets = squares.map((s, i) => ({
    x: left + (i % layout.columns) * (size + gap),
    y: top + Math.floor(i / layout.columns) * (size + gap),
  }));
  if (!animated) {
    squares.forEach((s, i) => Object.assign(s, targets[i]));
    draw();
    return;
  }
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / 650),
      ease = 1 - Math.pow(1 - t, 3);
    squares.forEach((s, i) => {
      s.x = starts[i].x + (targets[i].x - starts[i].x) * ease;
      s.y = starts[i].y + (targets[i].y - starts[i].y) * ease;
    });
    draw();
    if (t < 1) animation = requestAnimationFrame(frame);
    else animation = 0;
  }
  animation = requestAnimationFrame(frame);
}
function explode() {
  stopAnimation();
  drag = null;
  // Give every square a radial kick, then resolve wall and square collisions.
  squares.forEach((s) => {
    const angle =
      Math.atan2(s.y + size / 2 - height / 2, s.x + size / 2 - width / 2) +
      (Math.random() - 0.5) * 1.3;
    const speed = 400 + Math.random() * 450;
    s.vx = Math.cos(angle) * speed;
    s.vy = Math.sin(angle) * speed;
  });
  let last = performance.now(),
    elapsed = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.025);
    last = now;
    elapsed += dt;
    for (let step = 0; step < 3; step++) {
      const delta = dt / 3;
      squares.forEach((s) => {
        s.x += s.vx * delta;
        s.y += s.vy * delta;
        if (s.x < 0) {
          s.x = 0;
          s.vx = Math.abs(s.vx) * 0.8;
        }
        if (s.x > width - size) {
          s.x = width - size;
          s.vx = -Math.abs(s.vx) * 0.8;
        }
        if (s.y < 58) {
          s.y = 58;
          s.vy = Math.abs(s.vy) * 0.8;
        }
        if (s.y > height - size - 3) {
          s.y = height - size - 3;
          s.vy = -Math.abs(s.vy) * 0.8;
        }
        const friction = Math.exp(-1.15 * delta);
        s.vx *= friction;
        s.vy *= friction;
      });
      for (let i = 0; i < squares.length; i++)
        for (let j = i + 1; j < squares.length; j++) {
          const a = squares[i],
            b = squares[j],
            dx = b.x - a.x,
            dy = b.y - a.y;
          const overlapX = size - Math.abs(dx),
            overlapY = size - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;
          const axis = overlapX < overlapY ? "x" : "y",
            velocity = axis === "x" ? "vx" : "vy",
            sign = (axis === "x" ? dx : dy) >= 0 ? 1 : -1;
          const overlap = axis === "x" ? overlapX : overlapY;
          a[axis] -= (sign * (overlap + 0.01)) / 2;
          b[axis] += (sign * (overlap + 0.01)) / 2;
          const relative = (b[velocity] - a[velocity]) * sign;
          if (relative < 0) {
            const impulse = -relative * 0.85;
            a[velocity] -= sign * impulse;
            b[velocity] += sign * impulse;
          }
        }
    }
    squares.forEach((s) => {
      s.x = Math.max(0, Math.min(width - size, s.x));
      s.y = Math.max(58, Math.min(height - size - 3, s.y));
    });
    draw();
    if (elapsed < 7 && squares.some((s) => Math.hypot(s.vx, s.vy) > 2))
      animation = requestAnimationFrame(frame);
    else {
      squares.forEach((s) => {
        s.vx = 0;
        s.vy = 0;
      });
      animation = 0;
    }
  }
  animation = requestAnimationFrame(frame);
}
function resize() {
  stopAnimation();
  const previousWidth = width,
    previousHeight = height;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  width = rect.width;
  height = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!previousWidth) arrange();
  else {
    squares.forEach((s) => {
      s.x = Math.max(0, Math.min(width - size, (s.x * width) / previousWidth));
      s.y = Math.max(
        0,
        Math.min(height - size - 3, (s.y * height) / previousHeight),
      );
    });
    draw();
  }
}
function newRound() {
  stopAnimation();
  roundCounted = false;
  updateDailyScore();
  squares = Array.from({ length: randomDigit() * randomDigit() }, () => ({
    x: 0,
    y: 0,
  }));
  squareValue = randomDigit();
  drag = null;
  theme = GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];
  $("question").textContent =
    `במחסן ${theme.object.plural} כמתואר בציור. בכל ${theme.object.singular} יש ${squareValue} ${noun(theme.item, squareValue)}.`;
  $("object-emoji").textContent = theme.object.emoji;
  $("item-emoji").textContent = theme.item.emoji;
  $("legend-title").textContent = `בכל ${theme.object.singular}`;
  $("legend-description").textContent =
    `בכל ${theme.object.singular} יש אותה כמות של ${theme.item.plural}.`;
  $("drag-help").textContent = `✥ גררו ${theme.object.singular} כדי להזיז אותו`;
  canvas.setAttribute(
    "aria-label",
    `${theme.object.plural} שאפשר לגרור ולסדר בקבוצות.`,
  );
  $("explode").title = `פזרו את ה${theme.object.plural}`;
  $("order").title = `סדרו את ה${theme.object.plural} במלבן`;
  $("value").textContent = squareValue;
  $("count").hidden = true;
  $("count").textContent = "";
  fields.forEach((f) => (f.value = ""));
  $("keypad").hidden = true;
  clearFeedback();
  resize();
  arrange();
}
$("new-round").onclick = newRound;
$("next-round").onclick = newRound;
$("order").onclick = () => arrange(true);
$("explode").onclick = explode;
$("answer-form").onsubmit = (event) => {
  event.preventDefault();
  const feedback = $("feedback");
  $("next-round").hidden = true;
  updateDailyScore();
  try {
    const result = calculate();
    const won = Math.abs(result - squares.length * squareValue) < 1e-9;
    if (won) {
      $("next-round").hidden = false;
      if (!roundCounted) {
        updateDailyScore(true);
        roundCounted = true;
      }
      $("count").hidden = false;
      $("count").textContent =
        `${squares.length} ${noun(theme.object, squares.length)}`;
    }
    feedback.className = won ? "success" : "error";
    feedback.textContent = won
      ? `כל הכבוד! פתרתם נכון! יש ${squares.length} ${noun(theme.object, squares.length)} ובהם ${result} ${noun(theme.item, result)}. \u2066${squares.length} x ${squareValue} = ${result}\u2069. יופי של גילוי! ✦`
      : `תוצאת התרגיל שלכם היא \u2066${result}\u2069. ספרו את ה${theme.object.plural} והיעזרו בכמות ה${theme.item.plural} שבכל ${theme.object.singular}. נסו שוב!`;
  } catch (error) {
    feedback.className = "error";
    feedback.textContent = error.message;
  }
};
function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
canvas.onpointerdown = (event) => {
  const p = point(event);
  const square = [...squares]
    .reverse()
    .find(
      (s) => p.x >= s.x && p.x <= s.x + size && p.y >= s.y && p.y <= s.y + size,
    );
  if (!square) return;
  stopAnimation();
  drag = {
    square,
    dx: p.x - square.x,
    dy: p.y - square.y,
    pointerId: event.pointerId,
  };
  squares.splice(squares.indexOf(square), 1);
  squares.push(square);
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add("dragging");
  draw();
};
canvas.onpointermove = (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const p = point(event);
  drag.square.x = Math.max(0, Math.min(width - size, p.x - drag.dx));
  drag.square.y = Math.max(58, Math.min(height - size - 3, p.y - drag.dy));
  draw();
};
function endDrag() {
  drag = null;
  canvas.classList.remove("dragging");
  draw();
}
canvas.onpointerup = endDrag;
canvas.onpointercancel = endDrag;
canvas.onlostpointercapture = endDrag;
new ResizeObserver(resize).observe(canvas);

newRound();
