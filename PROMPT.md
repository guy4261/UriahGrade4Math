# Build a Hebrew grade-four math teaching app

Create a complete, responsive static website called "מעבדת החשבון" using readable, neatly indented HTML, CSS, and JavaScript. It must run on a localhost-only server and on GitHub Pages under a project subdirectory, using relative links and assets. Use Hebrew for all student-facing content, lang="he", and right-to-left layout. Keep arithmetic expressions, number fields, and numeric/operator keypads left-to-right. Use a calm cream-and-sage palette, rounded panels, clear Hebrew typography, generous spacing, and mobile-friendly controls.

## Pages and navigation

The website root displays the title, a short invitation to explore numbers, and a list of games. Start with one game called "מגלים במחסן", linked to its own real page at squares/index.html (URL /squares/). Direct navigation, refresh, and browser history must work. Include links back to the root on the game page. Preserve the project prefix when hosted at https://guy4261.github.io/UriahGrade4Math/.

## Warehouse counting game

For each new round, randomly choose three independent integers A, B, and C from 1 through 9 and a container/item theme. Show A × B draggable container emojis on a canvas. Each container holds C items; the correct total is A × B × C. Do not reveal the container count or the total until the student answers correctly.

Display this Hebrew question, substituting the theme words and C:
"במחסן <container plural> כמתואר בציור. בכל <container singular> יש <C> <item word>."
Use the singular item word when C is 1, otherwise the plural. Ask "כמה פריטים יש במחסן?" Show a legend with the container emoji = C and the item emoji, with explanatory Hebrew text. Update drag instructions, accessible labels, feedback, and container names for the selected theme.

Store the following editable themes in a separate, clearly indented squares/themes.js file. Each entry has object and item records with singular, plural, and emoji fields. Add comments explaining how to copy an entry to add another theme:

| Container singular | Container plural | Emoji | Item singular | Item plural | Emoji |
| ------------------ | ---------------- | ----- | ------------- | ----------- | ----- |
| ארגז               | ארגזים           | 📦    | תפוח          | תפוחים      | 🍎    |
| סל                 | סלים             | 🧺    | גזר           | גזרים       | 🥕    |
| מזוודה             | מזוודות          | 🧳    | חולצה         | חולצות      | 👕    |
| תיק                | תיקים            | 🎒    | ספר           | ספרים       | 📚    |
| צנצנת              | צנצנות           | 🫙    | סוכרייה       | סוכריות     | 🍬    |
| דלי                | דליים            | 🪣    | כדור          | כדורים      | ⚽    |

Support mouse and touch dragging, keep containers inside the canvas, and scale the canvas for device pixel ratio and responsive resizing. Place two buttons inside the canvas area: "🤡 פיזור" scatters the objects in an animated explosion with wall and object collisions, slowing to a complete rest; "💂 סידור" smoothly arranges them into a randomly selected exact rectangular factorization of their count that fits the canvas. Repeated clicks, dragging, resizing, and new rounds should safely stop any previous animation. Do not include a separate "סידור מחדש" link.

## Answer controls and progress

Use a single horizontal group of exactly five fields: number, operator, number, operator, number. Numeric fields allow only whole-number digits and request a numeric mobile keyboard. Focusing them also opens an on-screen number keypad with 0–9, clear, and backspace. Operator fields are read-only and show a keypad offering +, -, x, and /. Display x for multiplication; accept typed x, X, or \* and normalize to x. Choosing an operator moves focus to the next number field.

Display default placeholders 0, +, 0, +, 0 and use those defaults for any empty fields when checking, including a completely blank submission. The Hebrew Check button and Enter both evaluate the composed formula with ordinary precedence and left associativity. Use a safe arithmetic parser, never eval. Handle division by zero and invalid or excessive numbers with clear Hebrew feedback. Compare the result to the target, allowing a small floating-point tolerance.

An incorrect answer shows the expression result and encourages retrying without revealing the correct answer. A correct answer reveals the container count, item total, and multiplication calculation and shows a "סיבוב חדש ↻" button directly beside Check. Hide that adjacent button on new rounds and when the answer is edited or fails validation. Also keep a new-round control near the game heading.

Show "תשובות נכונות היום: <count>" near the heading. Store the count with the browser's local calendar date in localStorage. Each solved round increments once, even if Check is clicked repeatedly. Preserve progress after reload, reset for a new date, refresh on focus and across midnight, and continue functioning in memory if browser storage is unavailable.

## PDF worksheets

Add "יצירת PDF ↓" opening a native accessible modal with a required positive whole-number exercise count (default 6), Generate and Cancel controls, and progress/error feedback. Generate and download a real PDF entirely in the browser with no server dependency. Generate independent warehouse exercises with A, B, C in 1–9 and randomly chosen themes. Use Hebrew text and clearly rendered container emojis in A rows and B columns. Do not reveal counts, calculations, answers, or solutions on exercise pages.

Use polished A4 pages with consistent margins, headings, page numbers, two numbered exercises per page, and blank lines for a calculation and answer. After all exercise pages, begin a separate solutions section. For every problem show its number, A x B x C = total, and the total with the appropriate Hebrew item word. Paginate the solutions when necessary. Ensure the Hebrew, emoji, and mathematics render correctly in downloaded PDFs; browser canvas rasterization is acceptable. Avoid overlapping content and keep generation responsive with a disabled Generate button while working.

## Reusable prompt modal

Add a "פרומפט" button on the game page. Clicking it opens an accessible modal containing a read-only textbox loaded from the root PROMPT.md file, followed by one horizontal row of two buttons labeled "OK" and "Copy to Clipboard". OK closes the modal; Copy to Clipboard copies the exact textbox content and reports success or failure. Keep the textbox selectable and scrollable, with left-to-right text for this English prompt. Use the Clipboard API with a fallback where needed. Handle loading failures visibly and disable copying until content is available. Store this complete, coherent specification in PROMPT.md, without conversational history or abandoned approaches.

## Delivery and verification

Keep the source readable and make it easy to extend the theme list. Verify RTL/mobile layout, direct page loading, dragging, animations, operator precedence, default inputs, daily count deduplication and rollover, prompt loading and copying, and a rendered sample PDF including solutions. Serve locally at http://localhost:8000/ bound to 127.0.0.1. Push the finished app to the GitHub repository guy4261/UriahGrade4Math and enable GitHub Pages from main at the repository root. Verify the published page and assets load and match the local implementation.

## Compact game layout

Omit the large brand/tagline header on the game page. Put Prompt, PDF, and New Round buttons in a horizontal row beside the question title, vertically aligned with it. Keep the daily score beside the question text. Use compact spacing and responsive canvas heights so the question and relevant answer controls are visible immediately without scrolling on typical desktop and mobile screens. On narrow screens put the legend beside the answer form and shrink the canvas while the keypad is open. Keep every container within the canvas even when smaller rectangles require smaller emoji sizes.

## Missing-number equations page

Add a second game named "תרגילים" at /exercises/, linked from the root. Let the pupil choose a positive whole-number batch size. Generate equations with exactly one missing number (first operand, second operand, or result), represented by a digit-only numeric-keyboard textbox. One Check button evaluates the whole batch and displays per-problem feedback and a correct/total summary. Addition and subtraction use only nonnegative integers through 9999, including the result. Multiplication uses two single-digit factors. Division uses either a two-digit dividend and nonzero single-digit divisor with an integer quotient and optional remainder; a positive integer divided by itself giving 1; or zero divided by a positive integer giving 0. Never show remainders as clues. For divisions with nonzero remainder, always omit the result and require quotient(remainder), e.g. 18 / 4 = 4(2). Result fields allow digits and parentheses; operand fields allow digits only. PDF questions hide quotient and remainder together, and solutions show bracket notation. Stack problems vertically in one column. Only hide values uniquely determined by the other clues; avoid unknown divisors in zero-dividend equations and unknown factors multiplied by zero. Display x for multiplication and keep equations LTR within the Hebrew RTL page. Include a PDF count modal generating independent numbered equations with one blank each, followed by complete equations in a separate solutions section, 16 per A4 page.
