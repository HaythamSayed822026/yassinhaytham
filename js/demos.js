// The four live demos in "Made for the UAE": voice recap, "I'm lost" pulse, auto-translate, bus tracking.
// Each one only animates while it is on screen, so it costs nothing elsewhere on the page.
import { t, lang } from "./i18n.js";

const $ = (s, el = document) => el.querySelector(s);

const VOICE = {
  en: {
    text: "Hi! Here is Sara's week. She scored 18 out of 20 in her science quiz and finished every homework. Math is still the tricky part, especially linear equations, so her teacher suggests the 10-minute practice set this weekend. Next week: Arabic exam on Wednesday. Have a lovely weekend!",
  },
  ar: {
    text: "مرحباً! هذا ملخص أسبوع سارة. حصلت على 18 من 20 في اختبار العلوم، وأنهت جميع واجباتها. ما زالت الرياضيات تحتاج إلى بعض الجهد، خاصة المعادلات الخطية، لذلك تقترح معلمتها مجموعة تمارين لمدة عشر دقائق في عطلة نهاية الأسبوع. الأسبوع القادم: اختبار اللغة العربية يوم الأربعاء. عطلة سعيدة!",
  },
};

const MESSAGES = [
  { name: "English", dir: "ltr", lang: "en", text: "Reminder: science trip tomorrow. Please send a packed lunch." },
  { name: "العربية", dir: "rtl", lang: "ar", text: "تذكير: رحلة العلوم غداً. يرجى إرسال وجبة غداء مع طفلك." },
  { name: "اردو", dir: "rtl", lang: "ur", text: "یاد دہانی: کل سائنس کا ٹرپ ہے۔ براہ کرم بچے کے ساتھ دوپہر کا کھانا بھیجیں۔" },
  { name: "हिन्दी", dir: "ltr", lang: "hi", text: "याद दिलाना: कल विज्ञान यात्रा है। कृपया बच्चे के साथ दोपहर का खाना भेजें।" },
  { name: "Tagalog", dir: "ltr", lang: "tl", text: "Paalala: science trip bukas. Pakidalhan po ng baong tanghalian ang inyong anak." },
];

// Run fn(true/false) when the element enters/leaves the screen.
function onScreen(el, fn) {
  if (!("IntersectionObserver" in window)) return fn(true);
  new IntersectionObserver(([e]) => fn(e.isIntersecting), { threshold: 0.25 }).observe(el);
}

export function setupDemos({ animated }) {
  voiceRecap();
  lostPulse(animated);
  autoTranslate(animated);
  busTracking(animated);
}

/* ---------- 1. Weekly voice recap ---------- */
// Plays a recorded audio file (natural AI voice) (works on every phone, even in silent mode)
// and lights up each word at its start time.
const WORD_TIMES = {"en": [0.1, 0.8, 1.0, 1.113, 1.5, 2.2, 2.45, 2.825, 3.275, 3.4, 3.487, 3.812, 3.9, 4.025, 4.5, 4.888, 4.975, 5.438, 5.6, 6.5, 6.925, 7.037, 7.275, 7.362, 7.7, 8.35, 8.912, 9.312, 10.238, 10.35, 10.475, 10.875, 11.35, 11.463, 11.938, 12.425, 12.613, 12.787, 13.662, 14.025, 14.713, 15.025, 15.387, 15.525, 16.288, 16.5, 16.562, 16.95], "ar": [0.103, 1.737, 2.132, 2.803, 3.355, 4.671, 5.224, 5.513, 6.421, 6.553, 7.092, 7.184, 7.684, 8.618, 9.171, 9.671, 11.618, 11.895, 12.289, 13.171, 13.724, 14.013, 14.303, 15.171, 15.803, 16.579, 17.526, 18.118, 18.724, 19.539, 20.263, 20.855, 21.368, 21.763, 22.395, 22.566, 23.105, 23.645, 25.289, 25.947, 26.855, 27.474, 27.868, 28.618, 28.895, 30.724, 31.408]};

function voiceRecap() {
  const card = $(".b-voice"), btn = $("#voice-play"), textEl = $("#voice-text"), wave = $("#wave");
  const audio = new Audio();
  audio.preload = "none";
  let vl = lang, words = [], raf = null, current = -1;

  for (let i = 0; i < 40; i++) {
    const bar = document.createElement("i");
    bar.style.setProperty("--s", (0.3 + Math.random() * 0.7).toFixed(2));
    bar.style.setProperty("--d", (-Math.random()).toFixed(2) + "s");
    wave.appendChild(bar);
  }

  function render() {
    textEl.lang = vl;
    textEl.dir = vl === "ar" ? "rtl" : "ltr";
    textEl.innerHTML = "";
    words = [];
    VOICE[vl].text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) return textEl.appendChild(document.createTextNode(part));
      const span = document.createElement("span");
      span.textContent = part;
      words.push(span);
      textEl.appendChild(span);
    });
  }
  function highlight(i) {
    if (i === current) return;
    if (words[current]) words[current].classList.remove("w-on");
    if (words[i]) words[i].classList.add("w-on");
    current = i;
  }
  function follow() {
    const times = WORD_TIMES[vl], now = audio.currentTime;
    let i = 0;
    while (i + 1 < times.length && times[i + 1] <= now) i++;
    highlight(i);
    raf = requestAnimationFrame(follow);
  }

  const playing = () => !audio.paused && !audio.ended;
  function stop() {
    audio.pause();
    cancelAnimationFrame(raf);
    card.classList.remove("is-playing");
    btn.setAttribute("aria-label", t("voicePlay"));
    highlight(-1);
  }
  function play() {
    const src = `audio/recap-${vl}.mp3`;
    if (!audio.src.endsWith(src)) audio.src = src;
    audio.currentTime = 0;
    card.classList.add("is-playing");
    btn.setAttribute("aria-label", t("voicePause"));
    audio.play().then(() => { cancelAnimationFrame(raf); follow(); }).catch(stop);
  }
  audio.addEventListener("ended", stop);

  btn.addEventListener("click", () => (playing() ? stop() : play()));
  document.querySelectorAll("[data-vl]").forEach((b) => b.addEventListener("click", () => {
    const wasPlaying = playing();
    stop();
    vl = b.dataset.vl;
    document.querySelectorAll("[data-vl]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
    if (wasPlaying) play();
  }));
  document.querySelectorAll("[data-vl]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.vl === vl)));
  window.addEventListener("pagehide", stop);
  render();
}

/* ---------- 2. "I'm lost" class pulse ---------- */
function lostPulse(animated) {
  const grid = $("#lost-grid"), fill = $("#lost-fill"), pct = $("#lost-pct"), alert = $("#lost-alert");
  const total = 24, dots = [];
  for (let i = 0; i < total; i++) { const d = document.createElement("i"); grid.appendChild(d); dots.push(d); }
  const lost = new Set();

  function update() {
    const n = lost.size, p = Math.round((n / total) * 100);
    dots.forEach((d, i) => d.classList.toggle("is-lost", lost.has(i)));
    fill.style.width = p + "%";
    pct.textContent = p + "%";
    alert.textContent = n ? t("lostAlert").replace("{n}", n) : t("lostNone");
    alert.classList.toggle("is-on", n > 0);
  }
  function addOne() {
    if (lost.size >= total) { lost.clear(); return update(); }
    let i;
    do { i = Math.floor(Math.random() * total); } while (lost.has(i));
    lost.add(i);
    update();
  }
  $("#lost-btn").addEventListener("click", addOne);
  update();

  let played = false;
  onScreen(grid, (on) => {
    if (!on || played) return;
    played = true;
    if (!animated) { for (let k = 0; k < 6; k++) addOne(); return; }
    let k = 0;
    const id = setInterval(() => { addOne(); if (++k >= 6) clearInterval(id); }, 350);
  });
}

/* ---------- 3. Auto-translate ---------- */
function autoTranslate(animated) {
  const msg = $("#tr-msg"), label = $("#tr-lang"), text = $("#tr-text"), dotsEl = $("#tr-dots");
  const dots = MESSAGES.map(() => { const d = document.createElement("i"); dotsEl.appendChild(d); return d; });
  let i = lang === "ar" ? 1 : 0, id = null;

  function show(k) {
    const m = MESSAGES[k];
    label.textContent = m.name;
    text.textContent = m.text;
    text.dir = m.dir;
    text.lang = m.lang;
    dots.forEach((d, j) => d.classList.toggle("is-on", j === k));
  }
  function next() {
    msg.classList.add("is-out");
    setTimeout(() => { i = (i + 1) % MESSAGES.length; show(i); msg.classList.remove("is-out"); }, 350);
  }
  show(i);
  if (!animated) return;
  onScreen(msg, (on) => {
    clearInterval(id);
    if (on) id = setInterval(next, 2600);
  });
}

/* ---------- 4. Bus tracking ---------- */
function busTracking(animated) {
  const route = $("#bus-route"), bus = $("#bus"), eta = $("#eta");
  const len = route.getTotalLength();
  const place = (p) => {
    const pt = route.getPointAtLength(len * p);
    bus.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    const mins = Math.ceil(5 * (1 - p));
    eta.textContent = p >= 1 ? t("busArrived") : t("busEta")(Math.max(1, mins));
    eta.classList.toggle("is-arrived", p >= 1);
  };
  if (!animated) return place(0.6);

  const DRIVE = 9000, WAIT = 2200;
  let raf = null, t0 = 0;
  const loop = (now) => {
    if (!t0) t0 = now;
    const e = (now - t0) % (DRIVE + WAIT);
    const p = Math.min(1, e / DRIVE);
    place(p * p * (3 - 2 * p)); // ease in and out between stops
    raf = requestAnimationFrame(loop);
  };
  place(0);
  onScreen(bus.closest("svg"), (on) => {
    cancelAnimationFrame(raf);
    if (on) { t0 = 0; raf = requestAnimationFrame(loop); }
  });
}
