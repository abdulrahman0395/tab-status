// الحالات اللي مش متثبتة بتتمسح لوحدها:
const MAX_RECENT = 8;     // أقصى عدد يفضل منها
const MAX_AGE_DAYS = 7;   // واللي متستخدمتش من أكتر من كده بتتمسح
// (الحالة اللي على أي تاب مفتوحة دلوقتي مبتتمسحش)

let tab, key, current = "", list = [];

const $ = (id) => document.getElementById(id);

// النسخ القديمة كانت بتحفظ القائمة كنصوص بس
function normalize(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => (typeof p === "string" ? { text: p, pinned: false, lastUsed: Date.now() } : p))
    .filter((p) => p && p.text);
}

async function prune() {
  const all = await chrome.storage.local.get(null);
  // الحالات اللي على تاب مفتوحة أو متحفوظة على صفحة مبتتمسحش من القائمة
  const inUse = new Set(Object.keys(all).flatMap((k) =>
    k.startsWith("tab_") ? [all[k]] : k.startsWith("url_") && all[k] ? [all[k].status] : []));
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const pinned = list.filter((p) => p.pinned);
  const recent = list
    .filter((p) => !p.pinned)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .filter((p, i) => inUse.has(p.text) || (p.lastUsed >= cutoff && i < MAX_RECENT));
  list = [...pinned, ...recent];
}

const save = () => chrome.storage.local.set({ presets: list });

function touch(text) {
  const p = list.find((x) => x.text === text);
  if (p) p.lastUsed = Date.now();
  else list.push({ text, pinned: false, lastUsed: Date.now() });
}

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  key = "tab_" + tab.id;
  const data = await chrome.storage.local.get([key, "presets"]);
  current = data[key] || "";
  list = normalize(data.presets);
  await prune();
  await save();

  $("current").textContent = current ? "عدّل الحالة واضغط Enter" : "اكتب حالة للتاب دي";
  $("clear").style.display = current ? "block" : "none";
  render();
  resetInput();
}

function resetInput() {
  const input = $("custom");
  input.value = current;
  input.focus();
  input.select();
}

function render() {
  const box = $("lists");
  box.innerHTML = "";
  const groups = [
    ["📌 متثبتة", list.filter((p) => p.pinned)],
    ["الأخيرة (بتتمسح لوحدها)", list.filter((p) => !p.pinned).sort((a, b) => b.lastUsed - a.lastUsed)],
  ];
  for (const [title, items] of groups) {
    if (!items.length) continue;
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = title;
    const chips = document.createElement("div");
    chips.className = "chips";
    items.forEach((p) => chips.append(chip(p)));
    box.append(label, chips);
  }
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "لسه مفيش حالات محفوظة";
    box.append(empty);
  }
}

function chip(p) {
  const el = document.createElement("div");
  el.className = "chip" + (p.pinned ? " pinned" : "") + (p.text === current ? " active" : "");

  const pin = document.createElement("button");
  pin.className = "pin";
  pin.textContent = "📌";
  pin.title = p.pinned ? "إلغاء التثبيت" : "ثبّتها عشان متتمسحش";
  pin.onclick = async () => {
    p.pinned = !p.pinned;
    p.lastUsed = Date.now();
    await save();
    render();
  };

  const text = document.createElement("button");
  text.className = "text";
  text.textContent = p.text;
  text.title = "حطها على التاب دي";
  text.onclick = () => setStatus(p.text);

  const x = document.createElement("button");
  x.className = "x";
  x.textContent = "×";
  x.title = "امسحها من القائمة";
  x.onclick = async () => {
    list = list.filter((q) => q !== p);
    await save();
    render();
  };

  el.append(pin, text, x);
  return el;
}

async function setStatus(s) {
  s = (s || "").trim();
  if (s) {
    await chrome.storage.local.set({ [key]: s });
    touch(s);
  } else {
    await chrome.storage.local.remove(key);
  }
  // تتحفظ على الصفحة كمان، عشان ترجع بعد قفل المتصفح وفتحه
  try { await chrome.runtime.sendMessage({ type: "remember", url: tab.url, status: s || null }); } catch { /* السيرفس ووركر نايم */ }
  await prune();
  await save();

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "setStatus", status: s || null });
  } catch {
    // التاب كانت مفتوحة قبل تسطيب الإكستنشن: نحقن السكريبت وهو هيجيب الحالة لوحده
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    } catch {
      $("err").style.display = "block";
      return;
    }
  }
  window.close();
}

function applyInput() {
  const s = $("custom").value.trim();
  if (!s) return setStatus(null);            // خانة فاضية + Enter = امسح الحالة
  if (s === current) return window.close();  // متغيرش حاجة
  setStatus(s);
}

async function addToList() {
  const s = $("custom").value.trim();
  if (!s) return;
  touch(s);
  await prune();
  await save();
  render();
  flash("اتضافت للقائمة");
  resetInput();
}

let flashTimer;
function flash(msg) {
  const el = $("flash");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove("show"), 1400);
}

$("set").onclick = applyInput;
$("add").onclick = addToList;
$("custom").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.ctrlKey || e.metaKey) addToList();
  else applyInput();
});
$("clear").onclick = () => setStatus(null);

// الحالة التلقائية مقفولة افتراضيًا
chrome.storage.local.get("autoStatus").then(({ autoStatus }) => { $("auto").checked = !!autoStatus; });
$("auto").onchange = async (e) => {
  await chrome.storage.local.set({ autoStatus: e.target.checked });
  flash(e.target.checked ? "الحالة التلقائية اشتغلت" : "الحالة التلقائية اتقفلت");
  resetInput();
};

init();

// لو فيه نسخة أحدث على GitHub نعرض الخطوتين
chrome.runtime.sendMessage({ type: "checkUpdate" }, (u) => {
  if (chrome.runtime.lastError || !u || !u.newer) return;
  $("upd-v").textContent = u.latest;
  $("upd-link").href = "https://github.com/" + u.repo + "/commits/main";
  $("upd").style.display = "block";
});
// بيعيد تحميل الإكستنشن من الفولدر (نفس زرار ↻ في صفحة الإكستنشنز)
$("upd-reload").onclick = () => chrome.runtime.reload();
