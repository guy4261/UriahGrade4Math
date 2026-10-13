const byId = (id) => document.getElementById(id);
const integer = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const PEOPLE = [
  { name: "אורי", gender: "male" }, { name: "איתי", gender: "male" },
  { name: "יואב", gender: "male" }, { name: "נועה", gender: "female" },
  { name: "תמר", gender: "female" }, { name: "יעל", gender: "female" },
];
// Indices follow the usual left-to-right order of a four-digit number.
const PLACES = ["אלפים", "מאות", "עשרות", "אחדות"];
let currentProblem;

function cardNumbers(digits, fixedDigit, fixedIndex) {
  const numbers = [];
  function arrange(prefix, remaining) {
    if (!remaining.length) {
      numbers.push(Number(prefix.join("")));
      return;
    }
    remaining.forEach((digit, index) => {
      if (prefix.length === 0 && digit === 0) return;
      if (prefix.length === fixedIndex && digit !== fixedDigit) return;
      arrange([...prefix, digit], remaining.filter((_, i) => i !== index));
    });
  }
  arrange([], digits);
  return numbers;
}

function createCardProblem() {
  const pool = Array.from({ length: 10 }, (_, i) => i);
  const digits = Array.from({ length: 4 }, () => pool.splice(integer(0, pool.length - 1), 1)[0]);
  const fixedIndex = integer(0, 3);
  const candidates = fixedIndex === 0 ? digits.filter(digit => digit !== 0) : digits;
  const fixedDigit = candidates[integer(0, candidates.length - 1)];
  const numbers = cardNumbers(digits, fixedDigit, fixedIndex);
  return { ...PEOPLE[integer(0, PEOPLE.length - 1)], digits, fixedDigit, fixedIndex,
    largest: Math.max(...numbers), smallest: Math.min(...numbers) };
}

function cardLines(problem) {
  const female = problem.gender === "female";
  return [
    `ל${problem.name} יש קלפים שעליהם כתובות הספרות: ${problem.digits.join(", ")}.`,
    `${female ? "היא יצרה" : "הוא יצר"} מהספרות מספרים בני ארבע ספרות כך שכל ספרה מופיעה פעם אחת.`,
    `הספרה ${problem.fixedDigit} היא ספרת ה${PLACES[problem.fixedIndex]}.`,
    `א. רשמו את המספר הגדול ביותר ש${problem.name} ${female ? "יכולה" : "יכול"} ליצור.`,
    `ב. רשמו את המספר הקטן ביותר ש${problem.name} ${female ? "יכולה" : "יכול"} ליצור.`,
  ];
}

function newProblem() {
  currentProblem = createCardProblem();
  const lines = cardLines(currentProblem);
  byId("card-intro").textContent = lines[0];
  byId("card-rule").textContent = lines.slice(1, 3).join(" ");
  byId("digit-cards").replaceChildren(...currentProblem.digits.map(digit => {
    const card = document.createElement("span");
    card.textContent = digit;
    card.className = digit === currentProblem.fixedDigit ? "digit-card fixed" : "digit-card";
    return card;
  }));
  byId("largest-label").textContent = lines[3];
  byId("smallest-label").textContent = lines[4];
  byId("answer-form").reset();
  for (const key of ["largest", "smallest"]) {
    byId(key).disabled = false;
    byId(key).removeAttribute("aria-invalid");
    byId(`${key}-feedback`).textContent = "";
  }
  byId("answer-form").querySelector("button").disabled = false;
  byId("card-feedback").textContent = "";
}

byId("answer-form").onsubmit = (event) => {
  event.preventDefault();
  let allCorrect = true;
  for (const key of ["largest", "smallest"]) {
    const input = byId(key);
    const correct = input.value.trim() !== "" && Number(input.value) === currentProblem[key];
    input.setAttribute("aria-invalid", String(!correct));
    byId(`${key}-feedback`).textContent = correct ? "נכון!" : "נסו שוב. שמרו על הספרה הקבועה במקומה וזכרו שאי אפשר להתחיל באפס.";
    input.disabled = correct;
    allCorrect = allCorrect && correct;
  }
  byId("card-feedback").textContent = allCorrect ? "כל הכבוד! מצאתם את שני המספרים." : "";
  byId("answer-form").querySelector("button").disabled = allCorrect;
};

async function cardsPdf(count, options = {}) {
  const pageOptions = {
    ...options,
    questionPages: Math.ceil(count / 4),
    totalPages: options.totalPages ?? Math.ceil(count / 4) + Math.ceil(count / 4),
    generatedOn: options.generatedOn || new Date().toISOString(),
  };
  const makePage = (title, number) => worksheetPage(title, number, pageOptions);
  await document.fonts.ready;
  const problems = Array.from({ length: count }, createCardProblem);
  const images = [];
  for (const solutions of [false, true]) {
    for (let start = 0; start < count; start += 4) {
      const { canvas, context } = makePage(solutions ? "משחק הקלפים - פתרונות" : "משחק הקלפים", images.length + 1);
      problems.slice(start, start + 4).forEach((problem, i) => {
        const y = 240 + i * 350;
        context.direction = "rtl";
        context.textAlign = "right";
        context.font = "bold 24px Heebo, Arial, sans-serif";
        context.fillText(`תרגיל ${start + i + 1}`, 1130, y);
        context.font = "23px Heebo, Arial, sans-serif";
        cardLines(problem).forEach((line, index) => context.fillText(line, 1130, y + 42 + index * 36));
        context.fillText(solutions ? `א. ${problem.largest}     ב. ${problem.smallest}` : "א. __________     ב. __________", 1130, y + 242);
        if (solutions) context.fillText("הספרה הקבועה נשארת במקומה; ספרת האלפים אינה אפס.", 1130, y + 280);
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.94));
      if (!blob) throw new Error("לא ניתן ליצור את הדף.");
      images.push(new Uint8Array(await blob.arrayBuffer()));
      byId("pdf-status").textContent = `נוצרו ${images.length} דפים…`;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return encodePdf(images);
}

byId("new-problem").onclick = newProblem;
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
    const pdf = await cardsPdf(count);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cards.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    byId("pdf-status").textContent = "הקובץ מוכן! ההורדה התחילה.";
  } catch {
    byId("pdf-status").textContent = "יצירת הקובץ נכשלה. נסו שוב.";
  } finally {
    byId("generate-pdf").disabled = false;
  }
};
newProblem();
