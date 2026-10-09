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
