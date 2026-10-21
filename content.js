(() => {
  if (window.__tabStatusLoaded) return;
  window.__tabStatusLoaded = true;

  // الفاصل فيه حرف خفي (word joiner) عشان نعرف نشيل أي حالة إحنا حاطينها،
  // حتى لو اتحطت من نسخة قديمة من الإكستنشن
  const SEP = " |⁠ ";
  const INSTANCE = String(Math.random());

  let status = null;
  let base = clean(document.title);
  let expected = null;
  let alive = true;

  // حماية من اللوب: لو اضطرينا نعيد كتابة العنوان كتير جدًا في وقت قصير
  // (موقع بيحارب التغيير مثلًا) نوقف بدل ما نهنّج التاب
  let writes = [];

  function clean(t) {
    const i = t.lastIndexOf(SEP);
    return i === -1 ? t : t.slice(i + SEP.length);
  }

  function apply() {
    if (!alive) return;
    expected = status ? status + SEP + base : base;
    if (document.title === expected) return;
    const now = Date.now();
    writes = writes.filter((w) => now - w < 2000);
    writes.push(now);
    if (writes.length > 20) {
      shutdown();
      return;
    }
    document.title = expected;
  }

  function contextOk() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch { return false; }
  }

  function shutdown() {
    alive = false;
    observer.disconnect();
    document.removeEventListener("tab-status-takeover", onTakeover);
  }

  const observer = new MutationObserver(() => {
    if (!contextOk()) return shutdown(); // الإكستنشن اتحدّث والنسخة دي بقت قديمة
    const t = document.title;
    if (t === expected) return;
    base = clean(t);
    apply();
  });
  observer.observe(document, { subtree: true, childList: true, characterData: true });

  // لما نسخة جديدة تشتغل على نفس الصفحة، أي نسخة قديمة توقف نفسها
  function onTakeover(e) {
    if (e.detail !== INSTANCE) shutdown();
  }
  document.addEventListener("tab-status-takeover", onTakeover);
  document.dispatchEvent(new CustomEvent("tab-status-takeover", { detail: INSTANCE }));

  chrome.runtime.onMessage.addListener((msg) => {
    if (!alive || !msg || msg.type !== "setStatus") return;
    base = clean(document.title);
    status = msg.status || null;
    writes = [];
    apply();
  });

  chrome.runtime.sendMessage({ type: "getStatus", url: location.href }, (res) => {
    if (chrome.runtime.lastError) return;
    status = (res && res.status) || null;
    apply();
  });
})();
