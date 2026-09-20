import { getToken } from '@/lib/api';
import { formatAmount, formatDuration, formatMinutes } from '@/lib/quantity';
import type { Ingredient, RecipeDetail, Step } from '@/lib/types';

/** Escapes text so recipe content can never break out of the generated markup. */
function esc(value: string | null | undefined): string {
  if (value == null) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolves an image to something a standalone document can render: keyed uploads are
 * fetched with the auth header and inlined as a data URI; external URLs are kept as-is.
 */
async function resolveImage(imageKey?: string | null, imageUrl?: string | null): Promise<string | null> {
  if (imageKey) {
    try {
      const headers = new Headers();
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`/api/images/${imageKey}`, { headers, credentials: 'same-origin' });
      if (response.ok) return await blobToDataUrl(await response.blob());
    } catch {
      // Fall through to the source URL below when the fetch or inline fails.
    }
  }
  return imageUrl ?? null;
}

/** An amount span carrying the base quantity so the embedded runtime can rescale it live. */
function amountSpan(ingredient: Ingredient): string {
  const initial = formatAmount(ingredient, 1);
  const min = ingredient.quantityMin == null ? '' : String(ingredient.quantityMin);
  const max = ingredient.quantityMax == null ? '' : String(ingredient.quantityMax);
  return (
    `<span class="amount" data-min="${esc(min)}" data-max="${esc(max)}"` +
    ` data-unit="${esc(ingredient.unit ?? '')}" data-scale="${ingredient.scalable ? '1' : '0'}">${esc(initial)}</span>`
  );
}

function metaChips(recipe: RecipeDetail): string {
  const chips: string[] = [];
  if (recipe.prepMinutes) chips.push(`Prep ${esc(formatMinutes(recipe.prepMinutes))}`);
  if (recipe.cookMinutes) chips.push(`Cook ${esc(formatMinutes(recipe.cookMinutes))}`);
  if (recipe.totalMinutes) chips.push(`Total ${esc(formatMinutes(recipe.totalMinutes))}`);
  if (recipe.baseServings) {
    const unit = recipe.servingUnit && recipe.servingUnit !== 'servings' ? ` ${recipe.servingUnit}` : '';
    chips.push(`Serves ${esc(String(recipe.baseServings))}${esc(unit)}`);
  }
  if (recipe.difficulty) chips.push(esc(recipe.difficulty.toLowerCase()));
  if (recipe.sourceUrl) {
    chips.push(`<a href="${esc(recipe.sourceUrl)}">${esc(recipe.sourceName ?? 'Source')}</a>`);
  } else if (recipe.sourceName) {
    chips.push(esc(recipe.sourceName));
  }
  return chips.map((chip) => `<span class="chip">${chip}</span>`).join('');
}

function ingredientLine(ingredient: Ingredient): string {
  const parts: string[] = [amountSpan(ingredient), `<span class="ing-name">${esc(ingredient.name)}</span>`];
  if (ingredient.note) parts.push(`<span class="note">, ${esc(ingredient.note)}</span>`);
  if (ingredient.optional) parts.push('<span class="tag">optional</span>');
  return (
    `<li data-ing="${esc(String(ingredient.id))}"><label>` +
    `<input type="checkbox" /><span class="ing-text">${parts.join(' ')}</span></label></li>`
  );
}

function ingredientsColumn(ingredients: Ingredient[], hasBase: boolean): string {
  const grouped = new Map<string, Ingredient[]>();
  ingredients.forEach((ingredient) => {
    const key = ingredient.section ?? '';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ingredient);
  });

  const blocks = [...grouped.entries()]
    .map(([section, items]) => {
      const heading = section ? `<h3 class="sub">${esc(section)}</h3>` : '';
      return `${heading}<ul class="ingredients">${items.map(ingredientLine).join('')}</ul>`;
    })
    .join('');

  const scaler = hasBase
    ? `<div class="scaler no-print">
        <div class="stepper">
          <button type="button" data-sstep="-1" aria-label="Fewer servings">&minus;</button>
          <span class="serves">Serves <span class="serves-val"></span></span>
          <button type="button" data-sstep="1" aria-label="More servings">+</button>
        </div>
        <div class="mults">
          <button type="button" data-mult="0.5">&times;&frac12;</button>
          <button type="button" data-mult="1">&times;1</button>
          <button type="button" data-mult="2">&times;2</button>
        </div>
      </div>`
    : '';

  return `<section class="ingredients-col" id="ingredients-col"><h2>Ingredients</h2>${scaler}${blocks}</section>`;
}

async function methodColumn(steps: Step[], byId: Map<number, Ingredient>): Promise<string> {
  const items = await Promise.all(
    steps.map(async (step, index) => {
      const image = await resolveImage(step.imageKey, step.imageUrl);
      const figure = image ? `<img class="step-img" src="${esc(image)}" alt="" />` : '';
      const title = step.title ? `<p class="step-title">${esc(step.title)}</p>` : '';
      const section = step.section ? `<p class="step-section">${esc(step.section)}</p>` : '';

      const chips: string[] = [];
      step.usedIngredientIds
        .map((id) => byId.get(id))
        .filter((value): value is Ingredient => Boolean(value))
        .forEach((ingredient) => {
          chips.push(`<span class="chip use">${amountSpan(ingredient)} ${esc(ingredient.name)}</span>`);
        });
      if (step.durationSeconds) {
        chips.push(`<span class="chip print-only">&#9201; ${esc(formatDuration(step.durationSeconds))}</span>`);
        chips.push(
          `<button type="button" class="timer no-print" data-seconds="${step.durationSeconds}">` +
            `&#9654; ${esc(formatDuration(step.durationSeconds))}</button>`,
        );
      }
      if (step.temperatureC) chips.push(`<span class="chip">&#127777; ${Math.round(step.temperatureC)}&deg;C</span>`);
      const meta = chips.length ? `<div class="step-meta">${chips.join('')}</div>` : '';

      return `<li class="step" data-step-idx="${index}">
        ${section}
        <div class="step-row">
          <button type="button" class="step-no" aria-label="Toggle step done">${index + 1}</button>
          <div class="step-body">${title}<p>${esc(step.instruction)}</p>${figure}${meta}</div>
        </div>
      </li>`;
    }),
  );

  const progress =
    steps.length > 0
      ? `<div class="progress-wrap no-print"><div class="progress-track"><div id="progress" class="progress-bar"></div></div>` +
        `<span id="progress-label" class="progress-label"></span></div>`
      : '';

  return `<section class="method"><div class="method-head"><h2>Method</h2>${progress}</div><ol class="steps">${items.join('')}</ol></section>`;
}

const STYLES = `
  :root {
    color-scheme: light;
    --bg: #f6f7f8; --card: #fff; --fg: #1f2328; --muted: #6b7280;
    --border: #eaecef; --chip: #f2f3f5; --pill: #eef0f2; --accent: #1f2328; --link: #2563eb;
  }
  html.dark {
    color-scheme: dark;
    --bg: #0f1115; --card: #171a21; --fg: #e6e8eb; --muted: #9aa4b2;
    --border: #262c36; --chip: #1f242c; --pill: #242a33; --accent: #e6e8eb; --link: #7ab0ff;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
      "PingFang SC", "Microsoft YaHei", sans-serif;
    color: var(--fg); background: var(--bg); line-height: 1.55;
  }
  a { color: var(--link); }
  .toolbar { position: fixed; top: 12px; right: 12px; z-index: 20; display: flex; gap: 6px; }
  .toolbar button {
    font: inherit; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--border); background: var(--card); color: var(--fg); cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
  }
  .toolbar button:hover { background: var(--chip); }
  .page { max-width: 860px; margin: 0 auto; background: var(--card); min-height: 100vh; }
  .cover { width: 100%; height: 340px; object-fit: cover; display: block; }
  .content { padding: 32px 40px 64px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .tag-pill {
    font-size: 11px; text-transform: uppercase; letter-spacing: .04em; font-weight: 600;
    padding: 3px 9px; border-radius: 999px; background: var(--pill); color: var(--muted);
  }
  h1 { font-size: 34px; line-height: 1.15; margin: 0 0 6px; }
  .desc { color: var(--muted); margin: 0 0 16px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 500;
    padding: 5px 11px; border-radius: 999px; background: var(--chip); color: var(--fg);
  }
  .chip a { color: inherit; text-decoration: none; }
  .tabs { display: none; position: sticky; top: 0; z-index: 10; gap: 6px; padding: 10px 0;
    background: var(--card); border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tabs button {
    flex: 1; font: inherit; font-weight: 600; padding: 8px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--card); color: var(--muted); cursor: pointer;
  }
  .tabs button.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .grid { display: grid; grid-template-columns: minmax(0, 300px) 1fr; gap: 40px; align-items: start; }
  .ingredients-col { position: sticky; top: 16px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700;
    color: var(--muted); margin: 0 0 12px; }
  h3.sub { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700;
    color: var(--muted); margin: 16px 0 6px; }
  .scaler { margin-bottom: 16px; padding: 8px; border: 1px solid var(--border); border-radius: 12px; }
  .stepper { display: flex; align-items: center; gap: 6px; }
  .stepper .serves { flex: 1; text-align: center; font-size: 14px; font-weight: 600; }
  .stepper button, .mults button {
    font: inherit; font-weight: 600; border: 1px solid var(--border); background: var(--card);
    color: var(--fg); border-radius: 8px; cursor: pointer; height: 32px;
  }
  .stepper button { width: 34px; font-size: 18px; }
  .mults { display: flex; gap: 6px; margin-top: 8px; }
  .mults button { flex: 1; }
  .mults button.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  ul.ingredients { list-style: none; margin: 0; padding: 0; }
  ul.ingredients li { border-bottom: 1px solid var(--border); font-size: 15px; }
  ul.ingredients label { display: flex; align-items: flex-start; gap: 10px; padding: 8px 4px; cursor: pointer; }
  ul.ingredients input { margin-top: 4px; width: 16px; height: 16px; accent-color: var(--accent); }
  ul.ingredients li.done .ing-text { text-decoration: line-through; opacity: .5; }
  .amount { font-weight: 700; font-variant-numeric: tabular-nums; }
  .note { color: var(--muted); }
  .tag { display: inline-block; margin-left: 6px; font-size: 10px; text-transform: uppercase;
    letter-spacing: .04em; padding: 1px 6px; border-radius: 999px; background: var(--pill); color: var(--muted); }
  .method-head { display: flex; align-items: center; gap: 12px; }
  .progress-wrap { display: flex; align-items: center; gap: 8px; flex: 1; }
  .progress-track { flex: 1; height: 6px; border-radius: 999px; background: var(--pill); overflow: hidden; }
  .progress-bar { height: 100%; width: 0; background: var(--accent); transition: width .2s; }
  .progress-label { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  ol.steps { list-style: none; margin: 0; padding: 0; }
  li.step { margin-bottom: 22px; }
  .step-section { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700;
    color: var(--muted); margin: 0 0 6px 44px; }
  .step-row { display: flex; gap: 14px; }
  .step-no { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 999px; background: var(--accent);
    color: var(--bg); border: none; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; }
  li.step.done .step-no { font-size: 0; }
  li.step.done .step-no::after { content: "\\2713"; font-size: 16px; }
  li.step.done .step-body { opacity: .5; }
  .step-body { min-width: 0; flex: 1; }
  .step-body > p { margin: 0 0 8px; font-size: 15px; }
  .step-title { font-weight: 700; }
  .step-img { max-width: 100%; border-radius: 10px; margin-top: 4px; }
  .step-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip.use { background: var(--pill); }
  .chip.use .amount { margin-right: 2px; }
  .timer { font: inherit; font-size: 13px; font-weight: 600; padding: 5px 11px; border-radius: 999px;
    border: 1px solid var(--border); background: var(--card); color: var(--fg); cursor: pointer; }
  .timer.running { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .notes { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }
  .notes p { white-space: pre-wrap; color: var(--fg); }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border);
    font-size: 12px; color: var(--muted); }
  .print-only { display: none; }
  @media (max-width: 820px) {
    .content { padding: 20px; }
    .cover { height: 240px; }
    .tabs { display: flex; }
    .grid { grid-template-columns: 1fr; gap: 24px; }
    .ingredients-col { position: static; }
    .grid[data-active="ingredients"] .method { display: none; }
    .grid[data-active="method"] .ingredients-col { display: none; }
  }
  @media print {
    body { background: #fff; color: #000; }
    .page { max-width: none; }
    .no-print { display: none !important; }
    .print-only { display: inline-flex; }
    .grid { grid-template-columns: minmax(0, 34%) 1fr; }
    .ingredients-col { position: static; }
    li.step, section, .step-row { break-inside: avoid; }
    .cover { height: 300px; }
  }
`;

const SCRIPT = `
(function () {
  var GLYPHS = { "1/2":"\\u00bd","1/3":"\\u2153","2/3":"\\u2154","1/4":"\\u00bc","3/4":"\\u00be",
    "1/5":"\\u2155","2/5":"\\u2156","3/5":"\\u2157","4/5":"\\u2158","1/6":"\\u2159","5/6":"\\u215a",
    "1/8":"\\u215b","3/8":"\\u215c","5/8":"\\u215d","7/8":"\\u215e" };
  var DENOMS = [2,3,4,5,6,8], TOL = 0.012;

  function formatQuantity(value) {
    if (value == null || isNaN(value)) return "";
    if (value === 0) return "0";
    var sign = value < 0 ? "-" : "", abs = Math.abs(value);
    var whole = Math.floor(abs), rem = abs - whole;
    if (rem < TOL) return sign + whole;
    for (var i = 0; i < DENOMS.length; i++) {
      var d = DENOMS[i], n = Math.round(rem * d);
      if (n === 0 || n >= d) continue;
      if (Math.abs(rem - n / d) > TOL) continue;
      var glyph = GLYPHS[n + "/" + d], frac = glyph || (n + "/" + d);
      return whole === 0 ? sign + frac : sign + whole + (glyph ? "" : " ") + frac;
    }
    return sign + String(Math.round(abs * 100) / 100);
  }
  function formatAmount(min, max, unit, scale, factor) {
    var applied = scale ? factor : 1;
    var mn = min == null ? null : min * applied;
    var mx = max == null ? null : max * applied;
    if (mn == null) return "";
    var range = mx == null ? formatQuantity(mn) : formatQuantity(mn) + "\\u2013" + formatQuantity(mx);
    return unit ? range + " " + unit : range;
  }

  var body = document.body;
  var base = body.dataset.base ? parseFloat(body.dataset.base) : null;
  var servings = base ? Math.round(base) : 1;
  var storeKey = "kl-export-" + (body.dataset.recipe || "0");

  function currentFactor() { return base && base > 0 ? servings / base : 1; }
  function renderAmounts() {
    var f = currentFactor();
    document.querySelectorAll(".amount").forEach(function (el) {
      if (el.getAttribute("data-min") === null) return;
      var minS = el.getAttribute("data-min"), maxS = el.getAttribute("data-max");
      var min = minS === "" ? null : parseFloat(minS);
      var max = maxS === "" ? null : parseFloat(maxS);
      el.textContent = formatAmount(min, max, el.getAttribute("data-unit") || "", el.getAttribute("data-scale") === "1", f);
    });
    document.querySelectorAll(".serves-val").forEach(function (e) { e.textContent = servings; });
    document.querySelectorAll("[data-mult]").forEach(function (b) {
      var t = base ? Math.max(1, Math.min(999, Math.round(base * parseFloat(b.getAttribute("data-mult"))))) : 0;
      b.classList.toggle("active", base != null && t === servings);
    });
  }
  function setServings(n) { servings = Math.max(1, Math.min(999, n)); renderAmounts(); }
  document.querySelectorAll("[data-mult]").forEach(function (b) {
    b.addEventListener("click", function () { if (base) setServings(Math.round(base * parseFloat(b.getAttribute("data-mult")))); });
  });
  document.querySelectorAll("[data-sstep]").forEach(function (b) {
    b.addEventListener("click", function () { setServings(servings + parseInt(b.getAttribute("data-sstep"), 10)); });
  });
  renderAmounts();

  function loadSet(k) { try { return new Set(JSON.parse(localStorage.getItem(storeKey + ":" + k) || "[]")); } catch (e) { return new Set(); } }
  function saveSet(k, s) { try { localStorage.setItem(storeKey + ":" + k, JSON.stringify(Array.from(s))); } catch (e) {} }

  var checkedIng = loadSet("ing");
  document.querySelectorAll("li[data-ing]").forEach(function (li) {
    var id = li.getAttribute("data-ing"), cb = li.querySelector("input");
    if (checkedIng.has(id)) { cb.checked = true; li.classList.add("done"); }
    cb.addEventListener("change", function () {
      if (cb.checked) { checkedIng.add(id); li.classList.add("done"); }
      else { checkedIng.delete(id); li.classList.remove("done"); }
      saveSet("ing", checkedIng);
    });
  });

  var doneSteps = loadSet("step");
  var stepEls = document.querySelectorAll("li.step");
  function updateProgress() {
    var bar = document.getElementById("progress"), lbl = document.getElementById("progress-label");
    if (bar) bar.style.width = (stepEls.length ? doneSteps.size / stepEls.length * 100 : 0) + "%";
    if (lbl) lbl.textContent = doneSteps.size + " / " + stepEls.length;
  }
  stepEls.forEach(function (li) {
    var idx = li.getAttribute("data-step-idx"), no = li.querySelector(".step-no");
    if (doneSteps.has(idx)) li.classList.add("done");
    no.addEventListener("click", function () {
      if (doneSteps.has(idx)) { doneSteps.delete(idx); li.classList.remove("done"); }
      else { doneSteps.add(idx); li.classList.add("done"); }
      saveSet("step", doneSteps); updateProgress();
    });
  });
  updateProgress();

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      o.start(); o.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }
  function fmtClock(s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  document.querySelectorAll(".timer").forEach(function (btn) {
    var total = parseInt(btn.getAttribute("data-seconds"), 10), remaining = total, id = null, label = btn.innerHTML;
    function stop() { if (id) { clearInterval(id); id = null; } remaining = total; btn.innerHTML = label; btn.classList.remove("running"); }
    btn.addEventListener("click", function () {
      if (id) { stop(); return; }
      btn.classList.add("running"); btn.textContent = "\\u25a0 " + fmtClock(remaining);
      id = setInterval(function () {
        remaining -= 1;
        if (remaining <= 0) { stop(); beep(); return; }
        btn.textContent = "\\u25a0 " + fmtClock(remaining);
      }, 1000);
    });
  });

  var grid = document.querySelector(".grid");
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      if (grid) grid.setAttribute("data-active", b.getAttribute("data-tab"));
    });
  });

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
  var themeBtn = document.getElementById("btn-theme");
  if (themeBtn) themeBtn.addEventListener("click", function () { document.documentElement.classList.toggle("dark"); });
  var printBtn = document.getElementById("btn-print");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  var copyBtn = document.getElementById("btn-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var lines = [];
    document.querySelectorAll("#ingredients-col li[data-ing]").forEach(function (li) {
      var amt = li.querySelector(".amount"), name = li.querySelector(".ing-name"), note = li.querySelector(".note");
      var parts = [];
      if (amt && amt.textContent.trim()) parts.push(amt.textContent.trim());
      if (name) parts.push(name.textContent.trim());
      if (note) parts.push(note.textContent.trim());
      lines.push(parts.join(" "));
    });
    var original = copyBtn.textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(lines.join("\\n")).then(function () {
      copyBtn.textContent = "Copied"; setTimeout(function () { copyBtn.textContent = original; }, 1500);
    });
  });
})();
`;

/** Builds a fully self-contained, interactive, print-friendly HTML document for one recipe. */
export async function buildRecipeHtml(recipe: RecipeDetail): Promise<string> {
  const byId = new Map(recipe.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const hasBase = recipe.baseServings != null && recipe.baseServings > 0;

  const cover = await resolveImage(recipe.imageKey, recipe.imageUrl);
  const coverImg = cover ? `<img class="cover" src="${esc(cover)}" alt="" />` : '';
  const tags = recipe.category
    ? `<div class="tags"><span class="tag-pill">${esc(recipe.category.name)}</span></div>`
    : '';
  const description = recipe.description ? `<p class="desc">${esc(recipe.description)}</p>` : '';
  const ingredients = recipe.ingredients.length > 0 ? ingredientsColumn(recipe.ingredients, hasBase) : '';
  const method = recipe.steps.length > 0 ? await methodColumn(recipe.steps, byId) : '';
  const tabs =
    ingredients && method
      ? `<div class="tabs no-print">
          <button type="button" data-tab="ingredients" class="active">Ingredients</button>
          <button type="button" data-tab="method">Method</button>
        </div>`
      : '';
  const notes = recipe.personalNotes
    ? `<section class="notes"><h2>My notes</h2><p>${esc(recipe.personalNotes)}</p></section>`
    : '';
  const exportedOn = new Date().toISOString().slice(0, 10);
  const baseAttr = hasBase ? ` data-base="${esc(String(recipe.baseServings))}"` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="${esc(recipe.description ?? recipe.title)}" />
<title>${esc(recipe.title)}</title>
<style>${STYLES}</style>
</head>
<body data-recipe="${esc(String(recipe.id))}"${baseAttr}>
<div class="toolbar no-print">
  <button type="button" id="btn-copy">Copy ingredients</button>
  <button type="button" id="btn-print">Print</button>
  <button type="button" id="btn-theme">Dark</button>
</div>
<article class="page">
${coverImg}
<div class="content">
${tags}
<h1>${esc(recipe.title)}</h1>
${description}
<div class="meta">${metaChips(recipe)}</div>
${tabs}
<div class="grid" data-active="ingredients">
${ingredients}
${method}
</div>
${notes}
<p class="footer">Exported from Kitchen Ledger &middot; ${esc(exportedOn)}</p>
</div>
</article>
<script>${SCRIPT}</script>
</body>
</html>`;
}

/** Opens the exported recipe in a new tab where the user can read, print, or save as PDF. */
export async function openRecipeHtml(recipe: RecipeDetail): Promise<void> {
  const win = window.open('', '_blank');
  if (!win) {
    window.alert('Please allow pop-ups to export the recipe.');
    return;
  }
  win.document.write(
    '<!doctype html><meta charset="utf-8"><title>Preparing…</title>' +
      '<body style="font-family:sans-serif;padding:2rem;color:#57606a">Preparing recipe…</body>',
  );
  try {
    const html = await buildRecipeHtml(recipe);
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch {
    win.document.open();
    win.document.write('<!doctype html><meta charset="utf-8"><body>Failed to export this recipe.</body>');
    win.document.close();
  }
}
