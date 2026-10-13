const byId = (id) => document.getElementById(id);
const integer = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
let currentProblem;

function belongsToContinuation(problem, value) {
  return value > problem.start + 3 * problem.distance &&
    (value - problem.start) % problem.distance === 0;
}

function createSequenceProblem() {
  const start = integer(1, 900);
  const distance = integer(1, 50);
  const steps = integer(4, 12);
  const answer = start + steps * distance;
  const problem = { start, distance, steps, answer };
  // At distance 1 every larger integer belongs, so distractors must precede the start.
  const distractors = distance === 1
    ? [start - 1, start - 2, start - 3]
    : Array.from({ length: 10 * distance }, (_, i) => start + 3 * distance + 1 + i)
      .filter((value) => !belongsToContinuation(problem, value));
  problem.choices = [answer];
  while (problem.choices.length < 4) {
    const index = integer(0, distractors.length - 1);
    problem.choices.push(distractors.splice(index, 1)[0]);
  }
  for (let i = problem.choices.length - 1; i > 0; i--) {
    const j = integer(0, i);
    [problem.choices[i], problem.choices[j]] = [problem.choices[j], problem.choices[i]];
  }
  return problem;
}

function sequenceText(problem) {
  return Array.from({ length: 4 }, (_, i) => problem.start + i * problem.distance).join(", ");
}

function sequenceAnswer(problem) {
  return `${problem.start} + ${problem.steps} * ${problem.distance} = ${problem.answer}`;
}

function newSequence() {
  currentProblem = createSequenceProblem();
  byId("sequence").textContent = sequenceText(currentProblem);
  byId("sequence-feedback").replaceChildren();
  byId("sequence-options").replaceChildren();
  currentProblem.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice;
    button.onclick = () => {
      const correct = choice === currentProblem.answer;
      button.classList.toggle("correct", correct);
      button.classList.toggle("incorrect", !correct);
      const feedback = byId("sequence-feedback");
      feedback.replaceChildren(document.createTextNode(correct ? "כל הכבוד! " : "נסו שוב. "));
      if (correct) {
        const equation = document.createElement("bdi");
        equation.dir = "ltr";
        equation.textContent = sequenceAnswer(currentProblem);
        feedback.append(equation);
        byId("sequence-options").querySelectorAll("button").forEach((option) => {
          option.disabled = true;
        });
      }
    };
    byId("sequence-options").append(button);
  });
}

async function sequencePdf(count) {
  await document.fonts.ready;
  const problems = Array.from({ length: count }, createSequenceProblem);
  const images = [];
  for (const solutions of [false, true]) {
    for (let start = 0; start < count; start += 8) {
      const { canvas, context } = worksheetPage(
        solutions ? "סדרות מספרים - פתרונות" : "איזה מספר יופיע בהמשך הסדרה?",
        images.length + 1,
      );
      problems.slice(start, start + 8).forEach((problem, i) => {
        const y = 255 + i * 170;
        context.direction = "rtl";
        context.textAlign = "right";
        context.font = "24px Heebo, Arial, sans-serif";
        context.fillText(`תרגיל ${start + i + 1}`, 1130, y);
        context.direction = "ltr";
        context.textAlign = "left";
        context.font = "30px Heebo, Arial, sans-serif";
        context.fillText(sequenceText(problem), 110, y + 40);
        context.fillText(
          solutions ? sequenceAnswer(problem) : problem.choices.map((choice) => `□ ${choice}`).join("     "),
          110,
          y + 90,
        );
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
      if (!blob) throw new Error("לא ניתן ליצור את הדף.");
      images.push(new Uint8Array(await blob.arrayBuffer()));
      byId("pdf-status").textContent = `נוצרו ${images.length} דפים…`;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return encodePdf(images);
}

byId("new-sequence").onclick = newSequence;
byId("open-pdf").onclick = () => byId("pdf-dialog").showModal();
byId("close-pdf").onclick = () => byId("pdf-dialog").close();
byId("pdf-form").onsubmit = async (event) => {
  event.preventDefault();
  const count = Number(byId("pdf-count").value);
  if (!Number.isSafeInteger(count) || count <= 0) {
    byId("pdf-status").textContent = "הקלידו מספר שלם וחיובי.";
    return;
  }
  byId("generate-pdf").disabled = true;
  try {
    const pdf = await sequencePdf(count);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = "number-sequences.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    byId("pdf-status").textContent = "הקובץ מוכן! ההורדה התחילה.";
  } catch {
    byId("pdf-status").textContent = "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    byId("generate-pdf").disabled = false;
  }
};
newSequence();
