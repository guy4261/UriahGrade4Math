const promptDialog = document.getElementById("prompt-dialog");
const promptText = document.getElementById("prompt-text");
const promptStatus = document.getElementById("prompt-status");
const copyPromptButton = document.getElementById("copy-prompt");

// Resolve relative to this script, so both localhost and project Pages work.
const promptFileUrl = new URL("../PROMPT.md", document.currentScript.src);

document.getElementById("open-prompt").onclick = async () => {
  promptDialog.showModal();
  promptStatus.textContent = "טוענים את הפרומפט…";
  copyPromptButton.disabled = true;
  try {
    const response = await fetch(promptFileUrl);
    if (!response.ok) throw new Error("Prompt file could not be loaded");
    promptText.value = await response.text();
    copyPromptButton.disabled = false;
    promptStatus.textContent = "";
  } catch {
    promptText.value = "";
    promptStatus.textContent = "לא ניתן לטעון את הפרומפט. סגרו ונסו שוב.";
  }
};

document.getElementById("close-prompt").onclick = () => promptDialog.close();

copyPromptButton.onclick = async () => {
  try {
    try {
      await navigator.clipboard.writeText(promptText.value);
    } catch {
      // Older browsers may require selecting the read-only textarea directly.
      promptText.focus();
      promptText.select();
      if (!document.execCommand("copy")) throw new Error("Copy failed");
    }
    promptStatus.textContent = "הפרומפט הועתק ללוח.";
  } catch {
    promptStatus.textContent =
      "ההעתקה נכשלה. אפשר לסמן את הטקסט ולהעתיק ידנית.";
  }
};
