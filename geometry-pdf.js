const geometryPdfDialog = document.getElementById("geometry-pdf-dialog");
const geometryPdfStatus = document.getElementById("geometry-pdf-status");
document.getElementById("open-pdf").onclick = () =>
  geometryPdfDialog.showModal();
document.getElementById("geometry-pdf-close").onclick = () =>
  geometryPdfDialog.close();

function geometryExercise() {
  const game = document.body.dataset.geometry;
  const mode =
    game === "quadrilaterals"
      ? "polygon"
      : game === "angles"
        ? "angle"
        : Math.random() < 0.5
          ? "angles"
          : "sides";
  const choices =
    mode === "polygon"
      ? quadrilaterals
      : mode === "angle"
        ? angles
        : mode === "angles"
          ? triangleAngles
          : triangleSides;
  return {
    mode,
    choices,
    preset: choices[Math.floor(Math.random() * choices.length)],
    rotation: (Math.random() - 0.5) * 0.9,
  };
}
async function shapeImage(exercise) {
  const screenSvg = svg;
  const temporary = document.createElementNS(namespace, "svg");
  temporary.setAttribute("xmlns", namespace);
  temporary.setAttribute("width", "500");
  temporary.setAttribute("height", "380");
  temporary.setAttribute("viewBox", "0 0 500 380");
  try {
    svg = temporary;
    if (exercise.mode === "angle")
      drawAngle(exercise.preset, exercise.rotation);
    else drawPolygon(exercise.preset, exercise.rotation, exercise.mode);
  } finally {
    svg = screenSvg;
  }
  const blob = new Blob([new XMLSerializer().serializeToString(temporary)], {
    type: "image/svg+xml",
  });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function geometryWorksheet(count) {
  await document.fonts.ready;
  const exercises = Array.from({ length: count }, geometryExercise),
    images = [];
  const titles = {
    quadrilaterals: "מרובעים",
    triangles: "משולשים",
    angles: "זוויות",
  };
  const addPage = async (canvas) => {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.94),
    );
    if (!blob) throw new Error("לא ניתן ליצור את הדף.");
    images.push(new Uint8Array(await blob.arrayBuffer()));
    geometryPdfStatus.textContent = `נוצרו ${images.length} דפים…`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  // Four cards in a two-column grid: keep degree labels and all choices legible.
  const problemsPerPage = 4;
  for (let start = 0; start < count; start += problemsPerPage) {
    const { canvas, context } = worksheetPage(
      `${titles[document.body.dataset.geometry]} - דף תרגילים`,
      images.length + 1,
    );
    for (
      let offset = 0;
      offset < problemsPerPage && start + offset < count;
      offset++
    ) {
      const exercise = exercises[start + offset];
      // Read down each row from the right, matching Hebrew reading order.
      const column = offset % 2;
      const row = Math.floor(offset / 2);
      const left = column === 0 ? 630 : 90;
      const right = left + 500;
      const top = 220 + row * 710;
      context.direction = "rtl";
      context.textAlign = "right";
      context.font = "bold 27px Heebo, Arial";
      context.fillText(`תרגיל ${start + offset + 1}`, right - 18, top + 30);
      context.font = "21px Heebo, Arial";
      context.fillText(
        exercise.mode === "sides"
          ? "זהו לפי אורכי הצלעות."
          : exercise.mode === "angles"
            ? "זהו לפי הזוויות."
            : "בחרו את השם המדויק ביותר.",
        right - 18,
        top + 65,
      );
      context.drawImage(
        await shapeImage(exercise),
        left + 15,
        top + 75,
        470,
        357,
      );
      context.font = "21px Heebo, Arial";
      exercise.choices.forEach((choice, i) => {
        context.fillText(`□ ${choice.label}`, right - 18, top + 455 + i * 34);
      });
      context.strokeStyle = "#dbe3d6";
      context.strokeRect(left, top - 5, 520, 685);
    }
    await addPage(canvas);
  }
  for (let start = 0; start < count; start += 20) {
    const { canvas, context } = worksheetPage(
      `${titles[document.body.dataset.geometry]} - פתרונות`,
      images.length + 1,
    );
    context.font = "27px Heebo, Arial";
    exercises
      .slice(start, start + 20)
      .forEach((exercise, i) =>
        context.fillText(
          `תרגיל ${start + i + 1}: ${exercise.preset.label}`,
          1130,
          250 + i * 65,
        ),
      );
    await addPage(canvas);
  }
  return encodePdf(images);
}
document.getElementById("geometry-pdf-form").onsubmit = async (event) => {
  event.preventDefault();
  const count = Number(document.getElementById("geometry-pdf-count").value);
  if (!Number.isSafeInteger(count) || count <= 0) {
    geometryPdfStatus.textContent = "הקלידו מספר שלם וחיובי.";
    return;
  }
  const button = document.getElementById("geometry-pdf-generate");
  button.disabled = true;
  try {
    const pdf = await geometryWorksheet(count),
      url = URL.createObjectURL(pdf),
      link = document.createElement("a");
    link.href = url;
    link.download = `${document.body.dataset.geometry}-exercises.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    geometryPdfStatus.textContent = "הקובץ מוכן! ההורדה התחילה.";
  } catch {
    geometryPdfStatus.textContent = "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    button.disabled = false;
  }
};
