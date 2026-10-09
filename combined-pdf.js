// Reuse each game's own generator, preserving its questions-then-solutions order.
const PDF_SUBJECTS = [
  { name: "מגלים במחסן", path: "squares/", generator: "generateWorksheet" },
  { name: "תרגילים", path: "exercises/", generator: "exercisePdf" },
  { name: "מרובעים", path: "quadrilaterals/", generator: "geometryWorksheet" },
  { name: "משולשים", path: "triangles/", generator: "geometryWorksheet" },
  { name: "זוויות", path: "angles/", generator: "geometryWorksheet" },
];
const combinedDialog = document.getElementById("combined-pdf-dialog");
const combinedStatus = document.getElementById("combined-status");
const combinedGenerate = document.getElementById("combined-generate");
PDF_SUBJECTS.forEach((subject, index) => {
  const row = document.createElement("div");
  row.className = "subject-count";
  const label = document.createElement("label");
  label.htmlFor = `subject-${index}`;
  label.textContent = subject.name;
  const input = document.createElement("input");
  input.id = label.htmlFor;
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = "0";
  input.required = true;
  input.inputMode = "numeric";
  subject.input = input;
  row.append(label, input);
  document.getElementById("subject-counts").append(row);
});
document.getElementById("open-combined-pdf").onclick = () =>
  combinedDialog.showModal();
document.getElementById("combined-close").onclick = () =>
  combinedDialog.close();

async function subjectPdf(subject, count) {
  const frame = document.createElement("iframe");
  frame.className = "pdf-worker";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`לא ניתן לטעון את ${subject.name}. נסו שוב.`)),
        30000,
      );
      frame.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      frame.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("טעינת המשחק נכשלה."));
      };
      frame.src = subject.path;
      document.body.append(frame);
    });
    const generate = frame.contentWindow[subject.generator];
    if (typeof generate !== "function")
      throw new Error(`יצירת PDF עבור ${subject.name} אינה זמינה.`);
    const blob = await generate(count);
    // Copy bytes before destroying the iframe: its pending Blob operations need a live document.
    return await blob.arrayBuffer();
  } finally {
    frame.remove();
  }
}

async function combinedWorksheet(selection) {
  const documentPdf = await PDFLib.PDFDocument.create();
  documentPdf.setTitle("מעבדת החשבון - תרגילים לפי נושאים");
  for (const { subject, count } of selection) {
    combinedStatus.textContent = `מכינים ${subject.name}: ${count} תרגילים…`;
    const bytes = await subjectPdf(subject, count);
    const source = await PDFLib.PDFDocument.load(new Uint8Array(bytes));
    const pages = await documentPdf.copyPages(source, source.getPageIndices());
    pages.forEach((page) => documentPdf.addPage(page));
  }
  return new Blob([await documentPdf.save()], { type: "application/pdf" });
}

document.getElementById("combined-pdf-form").onsubmit = async (event) => {
  event.preventDefault();
  const counts = PDF_SUBJECTS.map((subject) => Number(subject.input.value));
  if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)) {
    combinedStatus.textContent = "הקלידו מספרים שלמים שאינם שליליים.";
    return;
  }
  const selection = PDF_SUBJECTS.map((subject, i) => ({
    subject,
    count: counts[i],
  })).filter((entry) => entry.count > 0);
  if (!selection.length) {
    combinedStatus.textContent = "בחרו לפחות תרגיל אחד באחד הנושאים.";
    return;
  }
  combinedGenerate.disabled = true;
  try {
    const pdf = await combinedWorksheet(selection),
      url = URL.createObjectURL(pdf),
      link = document.createElement("a");
    link.href = url;
    link.download = "math-subjects-exercises.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    combinedStatus.textContent =
      "הקובץ מוכן! לכל נושא שאלות ואחריהן פתרונות. ההורדה התחילה.";
  } catch (error) {
    combinedStatus.textContent = error.message || "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    combinedGenerate.disabled = false;
  }
};
