// Reuse each generator, then collect all questions before all answers.
const PDF_SUBJECTS = [
  { name: "משחק הקלפים", path: "cards/", generator: "cardsPdf" },
  { name: "בעיות מילוליות", path: "word-problems/", generator: "wordProblemsPdf" },
  { name: "מגלים במחסן", path: "squares/", generator: "generateWorksheet" },
  { name: "תרגילים", path: "exercises/", generator: "exercisePdf" },
  { name: "סדרות מספרים", path: "sequences/", generator: "sequencePdf" },
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

async function subjectPdf(subject, count, options) {
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
    const blob = await generate(count, options);
    // Copy bytes before destroying the iframe: its pending Blob operations need a live document.
    return await blob.arrayBuffer();
  } finally {
    frame.remove();
  }
}

async function combinedWorksheet(selection) {
  const documentPdf = await PDFLib.PDFDocument.create();
  documentPdf.setTitle("מעבדת החשבון - תרגילים לפי נושאים");
  const sizes = [4, 6, 2, 16, 8, 4, 4, 4];
  const answerSizes = [4, 6, 18, 16, 8, 20, 20, 20];
  const sections = selection.map(({ subject, count }) => ({
    subject, count,
    questionPages: Math.ceil(count / sizes[PDF_SUBJECTS.indexOf(subject)]),
    answerPages: Math.ceil(count / answerSizes[PDF_SUBJECTS.indexOf(subject)]),
  }));
  const totalQuestions = sections.reduce((total, section) => total + section.questionPages, 0);
  const totalPages = sections.reduce((total, section) => total + section.questionPages + section.answerPages, 0);
  const generatedOn = new Date().toISOString();
  let questionOffset = 0, answerOffset = totalQuestions;
  const questionPages = [], answerPages = [];
  for (const { subject, count, questionPages: questionCount } of sections) {
    combinedStatus.textContent = `מכינים ${subject.name}: ${count} תרגילים…`;
    const bytes = await subjectPdf(subject, count, { questionOffset, answerOffset, generatedOn, totalPages });
    const source = await PDFLib.PDFDocument.load(new Uint8Array(bytes));
    const pages = await documentPdf.copyPages(source, source.getPageIndices());
    questionPages.push(...pages.slice(0, questionCount));
    answerPages.push(...pages.slice(questionCount));
    questionOffset += questionCount;
    answerOffset += pages.length - questionCount;
  }
  const orderedPages = [...questionPages, ...answerPages];
  const footerFont = await documentPdf.embedFont(PDFLib.StandardFonts.Helvetica);
  orderedPages.forEach((page, index) => {
    documentPdf.addPage(page);
    // Stamp only after final ordering, using the actual final document length.
    const { width } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height: 39, color: PDFLib.rgb(1, 1, 1) });
    const number = `${index + 1}/${orderedPages.length}`;
    const footer = `Generated on ${generatedOn} | https://t.ly/wm4`;
    for (const [text, size, y] of [[number, 11, 25], [footer, 9, 9]]) {
      page.drawText(text, { x: (width - footerFont.widthOfTextAtSize(text, size)) / 2, y, size, font: footerFont, color: PDFLib.rgb(0.13, 0.24, 0.21) });
    }
  });
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
      "הקובץ מוכן! כל השאלות ואחריהן כל הפתרונות. ההורדה התחילה.";
  } catch (error) {
    combinedStatus.textContent = error.message || "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    combinedGenerate.disabled = false;
  }
};
