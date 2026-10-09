// Printable pages use browser canvas text so Hebrew and emoji match the game.
// Each PDF page is a high-resolution JPEG, with no external PDF dependency.
const worksheetDialog = document.getElementById("pdf-dialog");
const worksheetStatus = document.getElementById("pdf-status");
document.getElementById("open-pdf").onclick = () => worksheetDialog.showModal();
document.getElementById("close-pdf").onclick = () => worksheetDialog.close();

function makeExercise() {
  const digit = () => 1 + Math.floor(Math.random() * 9);
  return {
    rows: digit(),
    columns: digit(),
    items: digit(),
    theme: GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)],
  };
}

function worksheetPage(title, pageNumber) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#213d36";
  context.direction = "rtl";
  context.textAlign = "right";
  context.font = "bold 40px Heebo, Arial, sans-serif";
  context.fillText(title, 1150, 100);
  context.font = "24px Heebo, Arial, sans-serif";
  context.fillText("מעבדת החשבון · מגלים במחסן", 1150, 145);
  context.strokeStyle = "#cedbc4";
  context.beginPath();
  context.moveTo(90, 175);
  context.lineTo(1150, 175);
  context.stroke();
  context.textAlign = "center";
  context.fillText(`עמוד ${pageNumber}`, 620, 1695);
  context.textAlign = "right";
  return { canvas, context };
}

function drawExercise(context, exercise, index, top) {
  const { rows, columns, items, theme } = exercise;
  context.fillStyle = "#213d36";
  context.font = "bold 29px Heebo, Arial, sans-serif";
  context.fillText(`תרגיל ${index + 1}`, 1120, top + 35);
  context.font = "27px Heebo, Arial, sans-serif";
  context.fillText(
    `במחסן ${theme.object.plural} כמתואר בציור.`,
    1120,
    top + 82,
  );
  const itemWord = items === 1 ? theme.item.singular : theme.item.plural;
  context.fillText(
    `בכל ${theme.object.singular} יש ${items} ${itemWord}.`,
    1120,
    top + 125,
  );
  context.fillText(
    `כמה ${theme.item.plural} יש במחסן בסך הכול?`,
    1120,
    top + 168,
  );
  const spacing = 42;
  const startX = 620 - ((columns - 1) * spacing) / 2;
  const startY = top + 210;
  context.textAlign = "center";
  context.font =
    '35px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      context.fillText(
        theme.object.emoji,
        startX + col * spacing,
        startY + row * spacing,
      );
    }
  }
  context.textAlign = "right";
  context.font = "25px Heebo, Arial, sans-serif";
  context.fillText(
    "תרגיל: __________________________________________________",
    1120,
    top + 600,
  );
  context.fillText(
    "תשובה: _________________________________________________",
    1120,
    top + 652,
  );
  context.strokeStyle = "#e2e8dc";
  context.strokeRect(90, top - 5, 1060, 690);
}

// Build a PDF with explicit byte offsets and one image per A4 page.
function encodePdf(images) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const append = (value) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (number, content) => {
    offsets[number] = length;
    append(`${number} 0 obj\n${content}\nendobj\n`);
  };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = images.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${kids}] >>`);
  images.forEach((image, i) => {
    const number = 3 + i * 3;
    object(
      number,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Image ${number + 1} 0 R >> >> /Contents ${number + 2} 0 R >>`,
    );
    offsets[number + 1] = length;
    append(
      `${number + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
    );
    append(image);
    append("\nendstream\nendobj\n");
    const commands = "q\n595.28 0 0 841.89 0 0 cm\n/Image Do\nQ\n";
    object(
      number + 2,
      `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`,
    );
  });
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets
    .slice(1)
    .forEach((offset) =>
      append(`${String(offset).padStart(10, "0")} 00000 n \n`),
    );
  append(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
  );
  return new Blob(chunks, { type: "application/pdf" });
}

async function generateWorksheet(count) {
  await document.fonts.ready;
  const exercises = Array.from({ length: count }, makeExercise);
  const images = [];
  const addPage = async (canvas) => {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.94),
    );
    if (!blob) throw new Error("לא ניתן ליצור את הדף. נסו שוב.");
    images.push(new Uint8Array(await blob.arrayBuffer()));
    worksheetStatus.textContent = `נוצרו ${images.length} דפים…`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  for (let i = 0; i < exercises.length; i += 2) {
    const { canvas, context } = worksheetPage("דף תרגילים", images.length + 1);
    drawExercise(context, exercises[i], i, 225);
    if (exercises[i + 1]) drawExercise(context, exercises[i + 1], i + 1, 945);
    await addPage(canvas);
  }
  // Solutions always start on a new page, with up to 18 answers per page.
  for (let i = 0; i < exercises.length; i += 18) {
    const { canvas, context } = worksheetPage("פתרונות", images.length + 1);
    exercises.slice(i, i + 18).forEach((exercise, offset) => {
      const { rows, columns, items, theme } = exercise;
      const total = rows * columns * items;
      const y = 245 + offset * 76;
      context.font = "bold 25px Heebo, Arial, sans-serif";
      context.fillText(`תרגיל ${i + offset + 1}`, 1120, y);
      context.direction = "ltr";
      context.textAlign = "left";
      context.font = "28px Heebo, Arial, sans-serif";
      context.fillText(`${rows} x ${columns} x ${items} = ${total}`, 120, y);
      context.direction = "rtl";
      context.textAlign = "right";
      context.font = "23px Heebo, Arial, sans-serif";
      context.fillText(
        `${total} ${total === 1 ? theme.item.singular : theme.item.plural}`,
        830,
        y,
      );
    });
    await addPage(canvas);
  }
  return encodePdf(images);
}

document.getElementById("pdf-form").onsubmit = async (event) => {
  event.preventDefault();
  const count = Number(document.getElementById("exercise-count").value);
  if (!Number.isSafeInteger(count) || count <= 0) {
    worksheetStatus.textContent = "הקלידו מספר שלם וחיובי של תרגילים.";
    return;
  }
  const button = document.getElementById("generate-pdf");
  button.disabled = true;
  worksheetStatus.textContent = "מכינים את דף התרגילים…";
  try {
    const pdf = await generateWorksheet(count);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = "warehouse-exercises.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    worksheetStatus.textContent = "הקובץ מוכן! ההורדה התחילה.";
  } catch (error) {
    worksheetStatus.textContent =
      error.message || "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    button.disabled = false;
  }
};
