// Every preset has a distinct most-specific classification.
const quadrilaterals = [
  {
    label: "ריבוע",
    points: [
      [-90, -90],
      [90, -90],
      [90, 90],
      [-90, 90],
    ],
  },
  {
    label: "מלבן",
    points: [
      [-140, -65],
      [140, -65],
      [140, 65],
      [-140, 65],
    ],
  },
  {
    label: "מקבילית",
    points: [
      [-65, -80],
      [145, -80],
      [65, 80],
      [-145, 80],
    ],
  },
  {
    label: "מעוין",
    points: [
      [0, -120],
      [85, 0],
      [0, 120],
      [-85, 0],
    ],
  },
  {
    label: "טרפז",
    points: [
      [-65, -80],
      [65, -80],
      [140, 80],
      [-140, 80],
    ],
  },
  {
    label: "דלתון",
    points: [
      [0, -125],
      [85, -25],
      [0, 125],
      [-85, -25],
    ],
  },
];
const triangleAngles = [
  {
    label: "משולש ישר זווית",
    points: [
      [-110, 90],
      [110, 90],
      [-110, -90],
    ],
  },
  {
    label: "משולש חד זווית",
    points: [
      [-120, 90],
      [120, 90],
      [0, -118],
    ],
  },
  {
    label: "משולש קהה זווית",
    points: [
      [-140, 65],
      [140, 65],
      [-50, -15],
    ],
  },
];
const triangleSides = [
  {
    label: "משולש שווה שוקיים (שו״ש)",
    points: [
      [-90, 90],
      [90, 90],
      [0, -30],
    ],
    lengths: [6, 5, 5],
  },
  {
    label: "משולש שווה צלעות",
    points: [
      [-100, 70],
      [100, 70],
      [0, 70 - Math.sqrt(3) * 100],
    ],
    lengths: [6, 6, 6],
  },
  {
    label: "משולש שונה צלעות",
    points: [
      [-90, 80],
      [90, 80],
      [-90, -55],
    ],
    lengths: [4, 5, 3],
  },
];
const angles = [
  { label: "זווית ישרה", degrees: 90 },
  { label: "זווית חדה - פחות מ-90 מעלות", degrees: 45 },
  { label: "זווית קהה - מעל 90 מעלות", degrees: 125 },
  { label: "זווית שטוחה - 180 מעלות", degrees: 180 },
];
let svg = document.getElementById("shape");
const namespace = "http://www.w3.org/2000/svg";
let currentShape = null;
let previousKey = "",
  solved = false;
function element(tag, attributes, parent = svg) {
  const node = document.createElementNS(namespace, tag);
  Object.entries(attributes).forEach(([name, value]) =>
    node.setAttribute(name, value),
  );
  parent.append(node);
  return node;
}
function rotate(point, angle) {
  return [
    point[0] * Math.cos(angle) - point[1] * Math.sin(angle) + 250,
    point[0] * Math.sin(angle) + point[1] * Math.cos(angle) + 190,
  ];
}
function drawPolygon(preset, rotation, mode) {
  const points = preset.points.map((point) => rotate(point, rotation));
  element("polygon", {
    points: points.map((p) => p.join(",")).join(" "),
    fill: "#edf3e4",
    stroke: "#315c45",
    "stroke-width": 4,
    "stroke-linejoin": "round",
  });
  if (mode === "angles" || mode === "polygon") {
    const degrees = roundedAngles(preset.points);
    points.forEach((vertex, i) => {
      const before = points[(i + points.length - 1) % points.length],
        after = points[(i + 1) % points.length];
      const first = Math.atan2(before[1] - vertex[1], before[0] - vertex[0]);
      let delta =
        Math.atan2(after[1] - vertex[1], after[0] - vertex[0]) - first;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      const arcPoints = Array.from({ length: 21 }, (_, j) => [
        vertex[0] + 25 * Math.cos(first + (delta * j) / 20),
        vertex[1] + 25 * Math.sin(first + (delta * j) / 20),
      ]);
      const middle = first + delta / 2;
      degreeLabel(
        vertex[0] + 52 * Math.cos(middle),
        vertex[1] + 52 * Math.sin(middle),
        degrees[i],
      );
      element("polyline", {
        points: arcPoints.map((p) => p.join(",")).join(" "),
        fill: "none",
        stroke: "#b38632",
        "stroke-width": 3,
      });
    });
  }
  if (mode === "sides") {
    const center = points.reduce(
      (a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3],
      [0, 0],
    );
    points.forEach((p, i) => {
      const next = points[(i + 1) % 3],
        mid = [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2];
      // Edge-normal offset keeps labels outside the polygon, even after rotation.
      let normal = [-(next[1] - p[1]), next[0] - p[0]];
      if (
        normal[0] * (mid[0] - center[0]) + normal[1] * (mid[1] - center[1]) <
        0
      )
        normal = normal.map((v) => -v);
      const length = Math.hypot(...normal);
      const label = element("text", {
        x: mid[0] + (normal[0] / length) * 26,
        y: mid[1] + (normal[1] / length) * 26,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: "#315c45",
        "font-size": 24,
        "font-family": "Arial",
        direction: "ltr",
      });
      label.textContent = preset.lengths[i];
    });
  }
}
function drawAngle(preset, rotation) {
  const origin = [250, 215],
    radius = 145,
    arcRadius = 40;
  const start = rotation,
    end = rotation - (preset.degrees * Math.PI) / 180;
  const point = (angle, r) => [
    origin[0] + r * Math.cos(angle),
    origin[1] + r * Math.sin(angle),
  ];
  [start, end].forEach((angle) =>
    element("line", {
      x1: origin[0],
      y1: origin[1],
      x2: point(angle, radius)[0],
      y2: point(angle, radius)[1],
      stroke: "#315c45",
      "stroke-width": 4,
      "stroke-linecap": "round",
    }),
  );
  const labelPoint = point((start + end) / 2, 72);
  degreeLabel(labelPoint[0], labelPoint[1], preset.degrees);
  const a = point(start, arcRadius),
    b = point(end, arcRadius);
  element("path", {
    d: `M ${a} A ${arcRadius} ${arcRadius} 0 0 0 ${b}`,
    fill: "none",
    stroke: "#b38632",
    "stroke-width": 4,
  });
}
function newShape() {
  const game = document.body.dataset.geometry;
  let choices, mode;
  if (game === "quadrilaterals") {
    choices = quadrilaterals;
    mode = "polygon";
  } else if (game === "triangles") {
    mode = Math.random() < 0.5 ? "angles" : "sides";
    choices = mode === "angles" ? triangleAngles : triangleSides;
  } else {
    choices = angles;
    mode = "angle";
  }
  let preset;
  do {
    preset = choices[Math.floor(Math.random() * choices.length)];
  } while (`${mode}:${preset.label}` === previousKey);
  previousKey = `${mode}:${preset.label}`;
  solved = false;
  svg.replaceChildren();
  const rotation = (Math.random() - 0.5) * 0.9;
  currentShape = { preset, mode, rotation };
  if (mode === "angle") drawAngle(preset, rotation);
  else drawPolygon(preset, rotation, mode);
  document.getElementById("geometry-instruction").textContent =
    game === "quadrilaterals"
      ? "בחרו את השם המדויק ביותר של המרובע."
      : mode === "angles"
        ? "זהו את המשולש לפי הזוויות המסומנות בקשתות."
        : mode === "sides"
          ? "זהו את המשולש לפי אורכי הצלעות המסומנים."
          : "זהו את הזווית המסומנת בקשת.";
  document.getElementById("shape-feedback").textContent = "";
  document.getElementById("shape-feedback").disabled = true;
  const options = document.getElementById("shape-options");
  options.replaceChildren();
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.label;
    button.onclick = () => {
      if (solved) return;
      const won = choice === preset;
      button.classList.add(won ? "correct" : "incorrect");
      document.getElementById("shape-feedback").textContent = won
        ? "כל הכבוד! זיהיתם נכון. נסו ציור חדש."
        : "עוד ניסיון! הביטו שוב בציור.";
      if (won) {
        solved = true;
        document.getElementById("shape-feedback").disabled = false;
        options.querySelectorAll("button").forEach((b) => (b.disabled = true));
      }
    };
    options.append(button);
  });
}
document.getElementById("next-shape").onclick = newShape;
newShape();

// Largest-remainder rounding preserves the polygon's exact angle sum.
function roundedAngles(points) {
  const raw = points.map((vertex, i) => {
    const a = points[(i + points.length - 1) % points.length].map(
      (v, j) => v - vertex[j],
    );
    const b = points[(i + 1) % points.length].map((v, j) => v - vertex[j]);
    return (
      (Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b)),
          ),
        ),
      ) *
        180) /
      Math.PI
    );
  });
  const result = raw.map(Math.floor);
  const remaining =
    (points.length - 2) * 180 - result.reduce((a, b) => a + b, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remaining; i++) result[order[i].index]++;
  return result;
}
function degreeLabel(x, y, degrees) {
  const text = element("text", {
    x,
    y,
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    "font-size": 16,
    "font-family": "Arial",
    fill: "#8b661f",
    direction: "ltr",
  });
  text.textContent = `${degrees}°`;
}
function redrawCurrent() {
  svg.replaceChildren();
  if (currentShape.mode === "angle")
    drawAngle(currentShape.preset, currentShape.rotation);
  else
    drawPolygon(currentShape.preset, currentShape.rotation, currentShape.mode);
}
let dragPosition = null;
svg.onpointerdown = (event) => {
  dragPosition = { x: event.clientX, y: event.clientY, id: event.pointerId };
  svg.setPointerCapture(event.pointerId);
};
svg.onpointermove = (event) => {
  if (!dragPosition || event.pointerId !== dragPosition.id) return;
  currentShape.rotation +=
    (event.clientX - dragPosition.x + (event.clientY - dragPosition.y)) * 0.012;
  dragPosition.x = event.clientX;
  dragPosition.y = event.clientY;
  redrawCurrent();
};
svg.onpointerup =
  svg.onpointercancel =
  svg.onlostpointercapture =
    () => {
      dragPosition = null;
    };
document.getElementById("shape-feedback").onclick = () => {
  if (solved) newShape();
};
