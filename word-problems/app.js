const byId = (id) => document.getElementById(id);
const integer = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const PEOPLE = [
  { name: "אורי", gender: "male" },
  { name: "איתי", gender: "male" },
  { name: "יואב", gender: "male" },
  { name: "דניאל", gender: "male" },
  { name: "נועה", gender: "female" },
  { name: "תמר", gender: "female" },
  { name: "יעל", gender: "female" },
  { name: "מיכל", gender: "female" },
];
let currentProblem;
const PACKING_PAIRS = [
  { item: { singular: "כדור", plural: "כדורים", gender: "male" }, container: { singular: "סל", plural: "סלים", gender: "male" } },
  { item: { singular: "עיפרון", plural: "עפרונות", gender: "male" }, container: { singular: "קופסה", plural: "קופסאות", gender: "female" } },
  { item: { singular: "עוגייה", plural: "עוגיות", gender: "female" }, container: { singular: "שקית", plural: "שקיות", gender: "female" } },
  { item: { singular: "מחברת", plural: "מחברות", gender: "female" }, container: { singular: "ארגז", plural: "ארגזים", gender: "male" } },
];

function countedNoun(count, noun) {
  if (count === 1) return `${noun.singular} ${noun.gender === "female" ? "אחת" : "אחד"}`;
  if (count === 2) return `${noun.gender === "female" ? "שתי" : "שני"} ${noun.plural}`;
  return `${count} ${noun.plural}`;
}

function createPackingProblem() {
  const pair = PACKING_PAIRS[integer(0, PACKING_PAIRS.length - 1)];
  const quantity = integer(0, 200);
  const capacity = integer(1, 20);
  return { type: "packing", ...pair, quantity, capacity, answer: Math.floor(quantity / capacity) + (quantity % capacity === 0 ? 0 : 1) };
}

function createWordProblem(type = byId("problem-type").value) {
  if (type === "packing" || (type === "mixed" && integer(0, 1) === 1)) return createPackingProblem();
  const person = PEOPLE[integer(0, PEOPLE.length - 1)];
  const quantity = integer(0, 20);
  const price = integer(0, quantity === 0 ? 200 : Math.floor(200 / quantity));
  const cost = quantity * price;
  const bills = [20, 50, 100, 200].filter((bill) => bill >= cost);
  const bill = bills[integer(0, bills.length - 1)];
  return { type: "shopping", ...person, quantity, price, cost, bill, answer: bill - cost };
}

function wordProblemLines(problem) {
  if (problem.type === "packing") {
    return [
      `צריך לסדר ${countedNoun(problem.quantity, problem.item)} ב${problem.container.plural}.`,
      `בכל ${problem.container.singular} יש מקום ל${countedNoun(problem.capacity, problem.item)}. כמה ${problem.container.plural} צריך?`,
    ];
  }
  const female = problem.gender === "female";
  const items = problem.quantity === 1 ? "פריט אחד" : `${problem.quantity} פריטים`;
  const price = problem.price === 1 ? "שקל אחד" : `${problem.price} שקלים`;
  return [
    `${problem.name} ${female ? "קנתה" : "קנה"} ${items}. כל פריט עולה ${price}.`,
    `כמה כסף יישאר ${female ? "לה" : "לו"} אם ${female ? "היא תשלם" : "הוא ישלם"} בשטר של ${problem.bill} שקלים?`,
  ];
}

function wordAnswer(problem) {
  if (problem.type === "packing") return `⌈${problem.quantity} ÷ ${problem.capacity}⌉ = ${problem.answer}`;
  return `${problem.bill} − (${problem.quantity} × ${problem.price}) = ${problem.answer}`;
}

function packingExplanation(problem) {
  return problem.quantity % problem.capacity === 0
    ? "החלוקה מדויקת, ולכן אין צורך במכל נוסף."
    : `${problem.quantity % problem.capacity === 1 ? (problem.item.gender === "female" ? "נשארה" : "נשאר") : "נשארו"} ${countedNoun(problem.quantity % problem.capacity, problem.item)}, ולכן צריך עוד ${countedNoun(1, problem.container)}.`;
}

function newProblem() {
  currentProblem = createWordProblem();
  byId("word-problem").textContent = wordProblemLines(currentProblem).join(" ");
  byId("answer-label").textContent = currentProblem.type === "packing" ? `כמה ${currentProblem.container.plural} צריך?` : "כמה שקלים יישארו?";
  byId("answer-form").reset();
  byId("answer").disabled = false;
  byId("answer-form").querySelector("button").disabled = false;
  byId("word-feedback").replaceChildren();
}

byId("answer-form").onsubmit = (event) => {
  event.preventDefault();
  const input = byId("answer");
  const correct = input.value.trim() !== "" && Number(input.value) === currentProblem.answer;
  const feedback = byId("word-feedback");
  const packing = currentProblem.type === "packing";
  const success = packing
    ? `כל הכבוד! ${currentProblem.answer === 1 ? (currentProblem.container.gender === "female" ? "נדרשת" : "נדרש") : (currentProblem.container.gender === "female" ? "נדרשות" : "נדרשים")} ${countedNoun(currentProblem.answer, currentProblem.container)}. ${packingExplanation(currentProblem)} `
    : `כל הכבוד! העודף הוא ${currentProblem.answer} שקלים. `;
  feedback.replaceChildren(document.createTextNode(correct ? success : packing ? "נסו שוב. חלקו במספר הפריטים בכל מכל. אם נשארים פריטים, צריך מכל נוסף." : "נסו שוב. חשבו תחילה כמה עולה הקנייה כולה."));
  if (correct) {
    const equation = document.createElement("bdi");
    equation.dir = "ltr";
    equation.textContent = wordAnswer(currentProblem);
    feedback.append(equation);
    input.disabled = true;
    byId("answer-form").querySelector("button").disabled = true;
  }
};

async function wordProblemsPdf(count, options = {}) {
  const pageOptions = {
    ...options,
    questionPages: Math.ceil(count / 6),
    totalPages: options.totalPages ?? Math.ceil(count / 6) + Math.ceil(count / 6),
    generatedOn: options.generatedOn || new Date().toISOString(),
  };
  const makePage = (title, number) => worksheetPage(title, number, pageOptions);
  await document.fonts.ready;
  const problems = Array.from({ length: count }, () => createWordProblem());
  const images = [];
  for (const solutions of [false, true]) {
    for (let start = 0; start < count; start += 6) {
      const { canvas, context } = makePage(solutions ? "בעיות מילוליות - פתרונות" : "בעיות מילוליות", images.length + 1);
      problems.slice(start, start + 6).forEach((problem, i) => {
        const y = 245 + i * 225;
        context.direction = "rtl";
        context.textAlign = "right";
        context.font = "bold 24px Heebo, Arial, sans-serif";
        context.fillText(`תרגיל ${start + i + 1}`, 1130, y);
        context.font = "24px Heebo, Arial, sans-serif";
        wordProblemLines(problem).forEach((line, index) => context.fillText(line, 1130, y + 42 + index * 40));
        if (solutions) {
          context.direction = "ltr";
          context.textAlign = "left";
          context.fillText(wordAnswer(problem), 110, y + 132);
          if (problem.type === "packing") {
            context.direction = "rtl";
            context.textAlign = "right";
            context.font = "21px Heebo, Arial, sans-serif";
            context.fillText(`שארית: ${problem.quantity % problem.capacity}. ${packingExplanation(problem)}`, 1130, y + 170);
          }
        } else {
          context.fillText(problem.type === "packing" ? `צריך __________ ${problem.container.plural}` : "העודף: __________ שקלים", 1130, y + 132);
        }
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

byId("new-problem").onclick = newProblem;
byId("problem-type").onchange = newProblem;
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
    const pdf = await wordProblemsPdf(count);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = "word-problems.pdf";
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
