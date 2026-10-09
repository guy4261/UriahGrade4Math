const byId = (id) => document.getElementById(id);
const integer = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
let problems = [];

function createProblem() {
  const kind = integer(0, 5);
  let a,
    b,
    result,
    operator,
    remainder = 0;
  if (kind === 0) {
    a = integer(0, 9999);
    b = integer(0, 9999 - a);
    result = a + b;
    operator = "+";
  } else if (kind === 1) {
    a = integer(0, 9999);
    b = integer(0, a);
    result = a - b;
    operator = "-";
  } else if (kind === 2) {
    a = integer(0, 9);
    b = integer(0, 9);
    result = a * b;
    operator = "x";
  } else {
    operator = "/";
    if (kind === 3) {
      a = integer(10, 99);
      b = integer(1, 9);
    } else if (kind === 4) {
      a = integer(1, 9999);
      b = a;
    } else {
      a = 0;
      b = integer(1, 9999);
    }
    result = Math.floor(a / b);
    remainder = a % b;
  }
  // Only hide a value when the remaining clues determine one unique answer.
  const omissions = [2];
  if (operator !== "x" || b !== 0) omissions.push(0);
  if (operator === "+" || operator === "-" || (operator === "x" && a !== 0))
    omissions.push(1);
  if (operator === "/" && result > 0) {
    const divisor = (a - remainder) / result;
    if (Number.isInteger(divisor) && divisor > remainder) omissions.push(1);
  }
  return {
    a,
    b,
    result,
    operator,
    remainder,
    missing: remainder > 0 ? 2 : omissions[integer(0, omissions.length - 1)],
  };
}

function renderProblems(count) {
  problems = Array.from({ length: count }, createProblem);
  byId("problems").replaceChildren();
  problems.forEach((problem, index) => {
    const card = document.createElement("div");
    card.className = "equation-card";
    const label = document.createElement("span");
    label.textContent = `תרגיל ${index + 1}`;
    const equation = document.createElement("div");
    equation.className = "equation";
    const values = [problem.a, problem.b, problem.result];
    values.forEach((value, position) => {
      if (position > 0) {
        const symbol = document.createElement("span");
        symbol.textContent = position === 1 ? problem.operator : "=";
        equation.append(symbol);
      }
      if (position === problem.missing) {
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = position === 2 ? "text" : "numeric";
        input.autocomplete = "off";
        input.setAttribute("aria-label", `המספר החסר בתרגיל ${index + 1}`);
        input.oninput = () => {
          input.value = input.value.replace(
            position === 2 ? /[^0-9()]/g : /[^0-9]/g,
            "",
          );
          card.classList.remove("correct", "incorrect");
          note.textContent = "";
          byId("batch-feedback").textContent = "";
        };
        problem.input = input;
        equation.append(input);
      } else {
        const number = document.createElement("span");
        number.textContent = value;
        equation.append(number);
      }
    });
    const note = document.createElement("span");
    note.className = "problem-note";
    note.setAttribute("aria-live", "polite");
    problem.card = card;
    problem.note = note;
    card.append(label, equation, note);
    byId("problems").append(card);
  });
  byId("batch-feedback").textContent = "";
}

byId("batch-form").onsubmit = (event) => {
  event.preventDefault();
  const count = Number(byId("batch-count").value);
  if (Number.isSafeInteger(count) && count > 0) renderProblems(count);
};
byId("answers-form").onsubmit = (event) => {
  event.preventDefault();
  let correct = 0;
  problems.forEach((problem) => {
    const won = isCorrectAnswer(problem, problem.input.value);
    problem.card.classList.toggle("correct", won);
    problem.card.classList.toggle("incorrect", !won);
    problem.note.textContent = won
      ? "כל הכבוד! ✓"
      : problem.input.value
        ? "נסו שוב"
        : "השלימו את המספר החסר";
    if (won) correct++;
  });
  byId("batch-feedback").textContent =
    `תשובות נכונות: ${correct} מתוך ${problems.length}`;
};

function isCorrectAnswer(problem, text) {
  if (problem.missing !== 2) {
    return (
      /^\d+$/.test(text) &&
      Number(text) === [problem.a, problem.b][problem.missing]
    );
  }
  const match = /^(\d+)(?:\((\d+)\))?$/.exec(text);
  if (!match || Number(match[1]) !== problem.result) return false;
  if (problem.remainder > 0)
    return match[2] !== undefined && Number(match[2]) === problem.remainder;
  return match[2] === undefined || Number(match[2]) === 0;
}

function printableEquation(problem, solution = false) {
  const values = [problem.a, problem.b, problem.result].map((value, index) =>
    !solution && index === problem.missing
      ? "______"
      : index === 2 && problem.remainder > 0
        ? `${value}(${problem.remainder})`
        : value,
  );
  return `${values[0]} ${problem.operator} ${values[1]} = ${values[2]}`;
}

async function exercisePdf(count) {
  await document.fonts.ready;
  const exercises = Array.from({ length: count }, createProblem),
    images = [];
  for (const solutions of [false, true]) {
    for (let start = 0; start < count; start += 16) {
      const { canvas, context } = worksheetPage(
        solutions ? "תרגילים - פתרונות" : "השלימו את המספר החסר",
        images.length + 1,
      );
      context.font = "23px Heebo, Arial, sans-serif";
      context.fillText(
        solutions
          ? "הפתרונות לכל התרגילים"
          : "בחילוק עם שארית כתבו בסוגריים, למשל: 4(2).",
        1150,
        210,
      );
      exercises.slice(start, start + 16).forEach((problem, index) => {
        const y = 290 + index * 82;
        context.direction = "rtl";
        context.textAlign = "right";
        context.font = "24px Heebo, Arial, sans-serif";
        context.fillText(`תרגיל ${start + index + 1}`, 1120, y);
        context.direction = "ltr";
        context.textAlign = "left";
        context.font = "30px Heebo, Arial, sans-serif";
        context.fillText(printableEquation(problem, solutions), 120, y);
      });
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.94),
      );
      if (!blob) throw new Error("לא ניתן ליצור את הדף.");
      images.push(new Uint8Array(await blob.arrayBuffer()));
      byId("pdf-status").textContent = `נוצרו ${images.length} דפים…`;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return encodePdf(images);
}
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
    const pdf = await exercisePdf(count),
      url = URL.createObjectURL(pdf),
      link = document.createElement("a");
    link.href = url;
    link.download = "missing-number-exercises.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    byId("pdf-status").textContent = "הקובץ מוכן! ההורדה התחילה.";
  } catch {
    byId("pdf-status").textContent = "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    byId("generate-pdf").disabled = false;
  }
};
renderProblems(5);
