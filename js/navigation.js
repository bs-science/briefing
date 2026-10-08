const deck = [
  "index.html",
  "slides/02-research.html",
  "slides/03-variables.html",
  "slides/04-spectrum.html",
  "slides/05-method.html",
  "slides/06-controls.html",
  "slides/07-calibration.html",
  "slides/08-risks.html",
  "slides/09-feasibility.html",
  "slides/10-summary.html"
];

const current = Number(document.body.dataset.slide || 0);
const nested = location.pathname.replaceAll("\\", "/").includes("/slides/");
const targetHref = index => nested ? `../${deck[index]}` : deck[index];

function go(index) {
  if (index < 0 || index >= deck.length || index === current) return;
  location.href = targetHref(index);
}

function isEditingTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement;
}

document.addEventListener("keydown", event => {
  if (isEditingTarget(event.target)) return;
  if (event.key === " " && event.shiftKey) {
    event.preventDefault();
    go(current - 1);
    return;
  }
  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault();
    go(current + 1);
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    go(current - 1);
  }
  if (event.key === "Home") go(0);
  if (event.key === "End") go(deck.length - 1);
});

const brand = document.createElement("div");
brand.className = "deck-brand";
brand.textContent = "12조 스펙트라 · mCP 분광 연구";
document.body.append(brand);

const progress = document.createElement("div");
progress.className = "deck-progress";
progress.innerHTML = `<span style="width:${((current + 1) / deck.length) * 100}%"></span>`;
document.body.append(progress);

const controls = document.createElement("nav");
controls.className = "deck-controls";
controls.setAttribute("aria-label", "슬라이드 이동");
controls.innerHTML = `<button type="button" data-prev aria-label="이전 슬라이드">←</button><span class="deck-counter">${String(current + 1).padStart(2,"0")} / ${deck.length}</span><button type="button" data-next aria-label="다음 슬라이드">→</button>`;
controls.querySelector("[data-prev]").disabled = current === 0;
controls.querySelector("[data-next]").disabled = current === deck.length - 1;
controls.querySelector("[data-prev]").addEventListener("click", () => go(current - 1));
controls.querySelector("[data-next]").addEventListener("click", () => go(current + 1));
document.body.append(controls);
