window.FillwordUtils = {
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  collectAnswers(prompts) {
    const answers = {};
    for (const prompt of prompts) {
      const el = document.getElementById("field_" + prompt.key);
      if (el) answers[prompt.key] = el.value;
    }
    return answers;
  },

  showError(message) {
    const toast = document.getElementById("errorToast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 4000);
  },

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },

  setHidden(id, hidden) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (el) el.hidden = hidden;
  },

  showPage(name) {
    document.querySelectorAll(".page").forEach(p => { p.hidden = true; });
    const page = document.getElementById("page-" + name);
    if (page) page.hidden = false;
  },
};
