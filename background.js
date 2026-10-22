// كل حالة بتتحفظ في مكانين:
//   tab_<id>  : للتاب المفتوحة دلوقتي (بيتمسح لما التاب تتقفل)
//   url_<url> : عشان لو قفلت المتصفح وفتحته، أو فتحت نفس الصفحة تاني، الحالة ترجع
// الـ url بيتحفظ من غير ?query و #hash، عشان روابط زي ?run=... تفضل نفس الصفحة.

const URL_MAX_AGE_DAYS = 30; // حالة متغيرتش من أكتر من كده بتتنسي

function pageKey(href) {
  try {
    const u = new URL(href);
    if (!/^https?:$/.test(u.protocol)) return null;
    return "url_" + u.origin + u.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function remember(href, status) {
  const k = pageKey(href);
  if (!k) return;
  if (status) await chrome.storage.local.set({ [k]: { status, at: Date.now() } });
  else await chrome.storage.local.remove(k);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  // الصفحة لسه فاتحة وعايزة تعرف حالتها
  if (msg.type === "getStatus" && sender.tab) {
    const tk = "tab_" + sender.tab.id;
    const uk = pageKey(msg.url || sender.tab.url || "");
    chrome.storage.local.get(uk ? [tk, uk] : [tk]).then(async (o) => {
      if (o[tk]) return sendResponse({ status: o[tk] });
      // تاب جديدة (أو المتصفح لسه فاتح): نرجّع آخر حالة اتحطت على الصفحة دي
      const saved = uk && o[uk];
      if (saved && saved.status) {
        await chrome.storage.local.set({ [tk]: saved.status });
        return sendResponse({ status: saved.status });
      }
      sendResponse({ status: null });
    });
    return true;
  }

  // حالة جاية من سكريبت في الصفحة: بتتحط بس لو المستخدم مفعّل الحالة التلقائية
  if (msg.type === "autoStatus" && sender.tab) {
    const tk = "tab_" + sender.tab.id, ak = "auto_" + sender.tab.id;
    chrome.storage.local.get(["autoStatus", tk, ak]).then(async (o) => {
      if (!o.autoStatus) return sendResponse({ applied: false });
      const s = msg.status || null;
      if (s) {
        await chrome.storage.local.set({ [tk]: s, [ak]: s });
      } else {
        // المسح بيشيل بس الحالة اللي السكريبت نفسه حاطها، مش حالة إنت كاتبها بإيدك
        if (!o[tk] || o[tk] !== o[ak]) return sendResponse({ applied: true, status: o[tk] || null });
        await chrome.storage.local.remove([tk, ak]);
      }
      await remember(msg.url || sender.tab.url, s);
      sendResponse({ applied: true, status: s });
    });
    return true;
  }

  // الـ popup بيبلّغ إن الحالة اتغيرت
  if (msg.type === "remember") {
    remember(msg.url, msg.status).then(() => sendResponse({ ok: true }));
    return true;
  }
});

// التاب اتقفلت: حالتها المؤقتة تتمسح، بس اللي متحفوظ على الصفحة بيفضل
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(["tab_" + tabId, "auto_" + tabId]);
});

// بعد ريستارت المتصفح الـ ids بتتغير: نمسح القديم، ونتخلص من حالات الصفحات القديمة جدًا
chrome.runtime.onStartup.addListener(async () => {
  const all = await chrome.storage.local.get(null);
  const cutoff = Date.now() - URL_MAX_AGE_DAYS * 864e5;
  const keys = Object.keys(all).filter((k) =>
    k.startsWith("tab_") || k.startsWith("auto_") || (k.startsWith("url_") && !(all[k] && all[k].at >= cutoff)));
  if (keys.length) await chrome.storage.local.remove(keys);
});

// ---------------------------------------------------------------------------
// التحديثات: نقارن نسختنا بالـ manifest اللي على GitHub. مفيش أي داتا بتتبعت،
// ده مجرد قراية لملف عام. لو فيه نسخة أحدث، بتظهر علامة ↑ على الأيقونة.
// ---------------------------------------------------------------------------
const REPO = "abdulrahman0395/tab-status";
const CHECK_EVERY_HOURS = 6;

function newer(a, b) {             // هل a أحدث من b؟ (1.10 > 1.9)
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

async function showBadge(latest) {
  const has = latest && newer(latest, chrome.runtime.getManifest().version);
  await chrome.action.setBadgeText({ text: has ? "↑" : "" });
  if (has) {
    await chrome.action.setBadgeBackgroundColor({ color: "#ff5a1f" });
    await chrome.action.setTitle({ title: "Tab Status - فيه تحديث (" + latest + ")" });
  } else {
    await chrome.action.setTitle({ title: "Tab Status" });
  }
}

async function checkUpdate(force) {
  const { upd } = await chrome.storage.local.get("upd");
  if (!force && upd && Date.now() - upd.checkedAt < CHECK_EVERY_HOURS * 36e5) {
    await showBadge(upd.latest);
    return upd;
  }
  try {
    const r = await fetch("https://raw.githubusercontent.com/" + REPO + "/main/manifest.json?t=" + Date.now(),
      { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const latest = (await r.json()).version;
    const next = { latest, checkedAt: Date.now() };
    await chrome.storage.local.set({ upd: next });
    await showBadge(latest);
    return next;
  } catch {
    return upd || null;            // مفيش نت أو GitHub واقع: نجرب المرة الجاية
  }
}

chrome.runtime.onStartup.addListener(() => { checkUpdate(false); });
chrome.runtime.onInstalled.addListener(() => { checkUpdate(true); });   // بعد التحديث العلامة تختفي

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "checkUpdate") {
    checkUpdate(!!msg.force).then((u) => sendResponse({
      current: chrome.runtime.getManifest().version,
      latest: u && u.latest,
      newer: !!(u && u.latest && newer(u.latest, chrome.runtime.getManifest().version)),
      repo: REPO,
    }));
    return true;
  }
});
