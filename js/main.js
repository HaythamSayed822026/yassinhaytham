// SchoolKey site: preloader, smooth scroll and every scroll animation.
import { applyTranslations, t, isRTL } from "./i18n.js";
import { setupDemos } from "./demos.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ---------- Language, theme and quick reload after a language switch ---------- */
applyTranslations();
const root = document.documentElement;
const isLight = () => root.getAttribute("data-theme") === "light";
let quick = false, restoreRatio = 0;
try {
  quick = sessionStorage.getItem("sk-quick") === "1";
  restoreRatio = parseFloat(sessionStorage.getItem("sk-scroll") || "0") || 0;
  sessionStorage.removeItem("sk-quick");
  sessionStorage.removeItem("sk-scroll");
} catch (e) {}

function save(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

function updateThemeUI() {
  const btn = $("#theme-toggle");
  btn.setAttribute("aria-label", isLight() ? t("toDark") : t("toLight"));
  $('meta[name="theme-color"]').setAttribute("content", isLight() ? "#f5f3ee" : "#06070f");
}
$("#theme-toggle").addEventListener("click", () => {
  root.classList.add("theme-anim");
  root.setAttribute("data-theme", isLight() ? "dark" : "light");
  save("sk-theme", root.getAttribute("data-theme"));
  updateThemeUI();
  if (hero) hero.setTheme(isLight());
  setTimeout(() => root.classList.remove("theme-anim"), 600);
});
$("#lang-toggle").addEventListener("click", () => {
  save("sk-lang", isRTL ? "en" : "ar");
  try {
    const max = document.documentElement.scrollHeight - innerHeight;
    sessionStorage.setItem("sk-scroll", String(max > 0 ? scrollY / max : 0));
    sessionStorage.setItem("sk-quick", "1");
  } catch (e) {}
  location.reload();
});
updateThemeUI();

/* ---------- Text splitting ---------- */
function splitLines(el) {
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = parts.map((p) => `<span class="line"><span>${p.trim()}</span></span>`).join("");
  return $$(".line > span", el);
}
function splitWords(el) {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  return $$(".w", el);
}

/* ---------- 3D hero ---------- */
// Loaded on its own so an old phone that can't run 3D still gets the rest of the site.
let hero = null;
// The particle morph = intro (0→1, on load) + scroll (0→1, apps → key).
const morph = { intro: 0, scroll: 0 };
const applyMorph = () => { if (hero) hero.uniforms.uMorph.value = morph.intro + morph.scroll; };
import("./hero3d.js")
  .then(({ initHero }) => { hero = initHero($("#hero-canvas"), isLight()); applyMorph(); })
  .catch((err) => {
    console.warn("3D not available, hero shows without particles.", err);
    $("#hero-canvas").remove();
  });

/* ---------- Reduced motion or missing libraries: show the final state, no motion ---------- */
window.__skStarted = true; // tells the safety net in index.html that the scripts loaded

/* ---------- Phones: the sticky phone is hidden, so each role gets its own copy of its screen ---------- */
if (matchMedia("(max-width: 899px)").matches) {
  const phoneScreens = $$("#phone .screen");
  $$(".role").forEach((role, i) => {
    const mini = document.createElement("div");
    mini.className = "role-mini";
    mini.setAttribute("aria-hidden", "true");
    mini.appendChild(phoneScreens[i].cloneNode(true));
    role.appendChild(mini);
  });
}
if (reduced || !gsap || !ScrollTrigger) {
  root.classList.add("static");
  morph.intro = 1; morph.scroll = 1; applyMorph();
  $("#loader").remove();
  document.body.classList.remove("is-loading");
  $$(".stage-2").forEach((el) => (el.style.visibility = "visible"));
  $("#report-text").textContent = t("report");
  $("#lvl-fill") && ($("#lvl-fill").style.strokeDashoffset = "90");
  $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count + (el.dataset.suffix || "")));
  setupForm();
  setupDemos({ animated: false });
  if (restoreRatio > 0) window.scrollTo(0, restoreRatio * (document.documentElement.scrollHeight - innerHeight));
} else {
  run();
}


function run() {
  /* Smooth scrolling */
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    // in-page links scroll smoothly
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      e.preventDefault();
      lenis.scrollTo(id === "#top" ? 0 : id, { offset: 0 });
    }));
  }

  /* Split headings */
  const heroLines1 = splitLines($(".stage-1 .split"));
  const heroLines2 = splitLines($(".stage-2 .split"));
  const otherSplits = $$(".split").filter((el) => !el.closest(".hero"));
  otherSplits.forEach(splitLines);

  /* ---------- Preloader ---------- */
  const counter = { n: 0 };
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  gsap.set(heroLines1, { yPercent: 110 });
  gsap.set($$(".stage-1 .kicker, .stage-1 .sub"), { autoAlpha: 0, y: 20 });

  const loadTl = gsap.timeline({ paused: true });
  loadTl
    .to(counter, { n: 100, duration: quick ? 0.3 : 1.6, ease: "power2.inOut", onUpdate: () => ($("#loader-n").textContent = Math.round(counter.n)) })
    .to("#loader", { yPercent: -100, duration: quick ? 0.6 : 1, ease: "expo.inOut" }, quick ? "+=0" : "+=0.15")
    .add(() => {
      document.body.classList.remove("is-loading");
      lenis && lenis.start();
      if (restoreRatio > 0) {
        ScrollTrigger.refresh();
        const y = restoreRatio * (document.documentElement.scrollHeight - innerHeight);
        lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
      }
    }, "-=0.5")
    .to(morph, { intro: 1, duration: 2.6, ease: "power3.inOut", onUpdate: applyMorph }, "-=0.7")
    .to(heroLines1, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: "expo.out" }, "-=2.1")
    .to($$(".stage-1 .kicker, .stage-1 .sub"), { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=1.4")
    .add(() => $("#loader").remove());
  fontsReady.then(() => loadTl.play());

  /* ---------- Hero scroll: apps fuse into a key ---------- */
  gsap.set($(".stage-2"), { autoAlpha: 1 });
  gsap.set(heroLines2, { yPercent: 110 });
  gsap.set($$(".stage-2 .kicker, .stage-2 .sub, .stage-2 .hero-cta"), { autoAlpha: 0, y: 24 });
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom bottom", scrub: true },
  });
  heroTl
    // the intro animates the pieces inside .stage-1; scroll moves the whole block, so they never fight
    .to(".stage-1", { yPercent: -40, autoAlpha: 0, duration: 0.25, ease: "power2.in" }, 0.02)
    .to(".scroll-hint", { autoAlpha: 0, duration: 0.15 }, 0.02)
    .to(morph, { scroll: 1, duration: 0.5, ease: "power1.inOut", onUpdate: applyMorph }, 0.15)
    .fromTo(".hero-glow", { opacity: 0.6 }, { opacity: 1, duration: 0.5 }, 0.15)
    .to(heroLines2, { yPercent: 0, stagger: 0.06, duration: 0.25, ease: "power3.out" }, 0.6)
    .to($$(".stage-2 .kicker, .stage-2 .sub, .stage-2 .hero-cta"), { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.2 }, 0.7)
    .to({}, { duration: 0.15 });

  /* ---------- Nav: hide on scroll down, show on scroll up ---------- */
  const nav = $("#nav");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      nav.classList.toggle("is-solid", self.scroll() > 60);
      nav.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 400);
    },
  });

  /* ---------- Manifesto: words light up ---------- */
  const words = splitWords($("#manifesto"));
  gsap.to(words, {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 75%", end: "bottom 60%", scrub: true },
  });

  /* ---------- Section headings rise in ---------- */
  otherSplits.forEach((el) => {
    gsap.from($$(".line > span", el), {
      yPercent: 110, duration: 1.1, stagger: 0.1, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
  $$(".kicker").filter((k) => !k.closest(".hero")).forEach((k) =>
    gsap.from(k, { autoAlpha: 0, x: isRTL ? 20 : -20, duration: 0.8, scrollTrigger: { trigger: k, start: "top 90%" } })
  );

  /* ---------- Roles: switch phone screen ---------- */
  const screens = $$("#phone .screen");
  const roleEls = $$(".role");
  function setRole(i) {
    roleEls.forEach((r, j) => r.classList.toggle("is-active", i === j));
    screens.forEach((s, j) => s.classList.toggle("is-on", i === j));
  }
  roleEls.forEach((r, i) => ScrollTrigger.create({
    trigger: r, start: "top 55%", end: "bottom 55%",
    onToggle: (self) => self.isActive && setRole(i),
  }));
  setRole(0);
  gsap.fromTo("#phone", { rotateY: -18, rotateX: 8 }, {
    rotateY: 14, rotateX: -4, ease: "none",
    scrollTrigger: { trigger: ".roles", start: "top bottom", end: "bottom top", scrub: true },
  });

  /* ---------- AI: horizontal scroll ---------- */
  const track = $("#ai-track");
  const progressBar = $("#ai-progress");
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const horiz = gsap.to(track, {
    x: () => (isRTL ? distance() : -distance()), ease: "none",
    scrollTrigger: {
      trigger: ".ai", start: "top top", end: () => "+=" + distance() * 1.1,
      pin: ".ai-pin", scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (self) => { progressBar.style.transform = `scaleX(${self.progress.toFixed(4)})`; },
    },
  });
  const panels = $$(".panel");

  /* Move the panels sideways directly: drag, trackpad swipe, or the arrow buttons.
     All of them just move the page's scroll position, so the panels glide exactly as when scrolling. */
  const pinST = horiz.scrollTrigger;
  // page scroll needed per pixel of sideways movement
  const ratio = () => (pinST.end - pinST.start) / Math.max(1, distance());
  // Rapid inputs (swipe events, drag moves) add up into one running target, then glide to it.
  let aiTarget = null, aiIdle = null;
  const currentTarget = () => aiTarget ?? (lenis ? lenis.targetScroll : window.scrollY);
  function glideBy(forwardPx, opts = {}) {
    aiTarget = gsap.utils.clamp(pinST.start, pinST.end, currentTarget() + forwardPx * ratio());
    if (lenis) lenis.scrollTo(aiTarget, { lerp: opts.lerp ?? 0.09 });
    else window.scrollTo({ top: aiTarget, behavior: "smooth" });
    clearTimeout(aiIdle);
    aiIdle = setTimeout(() => (aiTarget = null), 900); // hand control back to normal scrolling
  }

  // trackpad sideways swipe / shift + mouse wheel, while the panels are on screen
  $(".ai-pin").addEventListener("wheel", (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!dx || !pinST.isActive) return;
    e.preventDefault(); // also stops the browser's "swipe back a page" gesture here
    e.stopPropagation(); // so the page's smooth scroller doesn't move vertically too
    glideBy((isRTL ? -dx : dx) * 1.1, { lerp: 0.12 });
  }, { passive: false });

  // drag with the mouse, or swipe with a finger (vertical finger scrolling still works normally)
  const aiTrack = $("#ai-track");
  let drag = null, moved = 0;
  aiTrack.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, last: e.clientX, t: performance.now(), v: 0, horizontal: e.pointerType === "mouse" };
    moved = 0;
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.last;
    if (!drag.horizontal) {
      // touch: decide direction on the first few pixels
      if (Math.abs(e.clientX - drag.x) > 8 && Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y)) drag.horizontal = true;
      else if (Math.abs(e.clientY - drag.y) > 8) { drag = null; return; }
      else return;
    }
    if (!pinST.isActive && !moved) return;
    moved += Math.abs(dx);
    if (moved > 4) { aiTrack.classList.add("is-dragging"); cursorEl && cursorEl.classList.add("is-drag-active"); }
    const now = performance.now();
    drag.v = dx / Math.max(1, now - drag.t); // px per ms, for the throw at the end
    drag.t = now;
    drag.last = e.clientX;
    glideBy(isRTL ? dx : -dx, { lerp: 0.2 });
  });
  const endDrag = () => {
    if (!drag) return;
    // a quick flick keeps gliding a little, like a phone
    if (moved > 4) glideBy((isRTL ? 1 : -1) * gsap.utils.clamp(-2.5, 2.5, drag.v) * 260, { lerp: 0.06 });
    drag = null;
    aiTrack.classList.remove("is-dragging");
    cursorEl && cursorEl.classList.remove("is-drag-active");
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  // a drag should never also count as a click
  aiTrack.addEventListener("click", (e) => { if (moved > 4) { e.preventDefault(); e.stopPropagation(); } }, true);
  aiTrack.addEventListener("dragstart", (e) => e.preventDefault());

  // arrow buttons: one panel per click
  const step = () => panels[0].offsetWidth + parseFloat(getComputedStyle(aiTrack).columnGap || 24);
  $("#ai-next").addEventListener("click", () => { ensureInPin(); glideBy(step(), { lerp: 0.07 }); });
  $("#ai-prev").addEventListener("click", () => { ensureInPin(); glideBy(-step(), { lerp: 0.07 }); });
  function ensureInPin() {
    // if the section is not pinned yet, the first click brings it into place
    if (currentTarget() < pinST.start) lenis ? lenis.scrollTo(pinST.start, { lerp: 0.08 }) : window.scrollTo({ top: pinST.start, behavior: "smooth" });
  }

  // custom cursor says "Drag" over the panels
  const cursorEl = fine ? $("#cursor") : null;
  if (cursorEl) {
    aiTrack.addEventListener("pointerenter", () => cursorEl.classList.add("is-drag"));
    aiTrack.addEventListener("pointerleave", () => cursorEl.classList.remove("is-drag"));
  }
  // positions are written for left-to-right; in Arabic the panels enter from the left, so mirror them
  const pos = (p) => (isRTL ? p.replace(/left (\d+)%/, (_, n) => `right ${100 - n}%`) : p);
  const inPanel = (panel, start = "left 70%") => ({ trigger: panel, containerAnimation: horiz, start: pos(start) });
  panels.forEach((p, i) => gsap.from(p, {
    y: 80, rotate: i % 2 ? 4 : -4, autoAlpha: 0.2, duration: 1, ease: "power3.out",
    scrollTrigger: inPanel(p, "left 95%"),
  }));

  // 1 Teacher report types itself
  let typed = false;
  ScrollTrigger.create({
    ...inPanel(panels[0], "left 80%"),
    onEnter: () => { if (!typed) { typed = true; typeText($("#report-text"), t("report")); } },
  });
  gsap.to($$(".report-bars i"), { scaleY: 1, stagger: 0.08, duration: 0.8, ease: "back.out(1.6)", scrollTrigger: inPanel(panels[0], "left 75%") });
  // 2 Parent comparison bars
  gsap.to($$(".cmp-bars i"), { scaleX: 1, stagger: 0.07, duration: 1, ease: "expo.out", scrollTrigger: inPanel(panels[1]) });
  // 3 WhatsApp bubbles fly away, timetable appears
  gsap.timeline({ scrollTrigger: { ...inPanel(panels[2], "left 60%"), end: pos("left 10%"), scrub: true } })
    .to($$(".bubbles span"), { x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-200, 200), rotate: () => gsap.utils.random(-40, 40), autoAlpha: 0, stagger: 0.03 })
    .to(".tt-grid", { autoAlpha: 1, duration: 0.3 }, 0.25)
    .from($$(".tt-grid i"), { scale: 0, stagger: 0.02, ease: "back.out(2)" }, 0.3);
  // 4 Level ring fills, level goes up
  gsap.to("#lvl-fill", {
    strokeDashoffset: 90, duration: 1.6, ease: "power3.out", scrollTrigger: inPanel(panels[3]),
    onComplete: () => { $("#lvl-n").textContent = t("level7"); gsap.from("#lvl-n", { scale: 1.6, duration: 0.6, ease: "back.out(3)" }); },
  });

  /* ---------- Learning Passport: the card travels from the old school to the new one ---------- */
  const stage = $("#pp-stage"), card = $("#pp-card");
  // Where the card's top-left must sit: centred over a school horizontally, just above it,
  // or (phones, stacked layout) just below the old school. Works for LTR and RTL.
  const spot = (school, where) => {
    const s = stage.getBoundingClientRect(), r = school.getBoundingClientRect();
    const gap = 18;
    return {
      x: r.left - s.left + r.width / 2 - card.offsetWidth / 2,
      y: where === "below" ? r.bottom - s.top + gap : r.top - s.top - card.offsetHeight - gap,
    };
  };
  const stacked = () => getComputedStyle(stage).flexDirection === "column";
  const startSpot = () => spot($("#school-a"), stacked() ? "below" : "above");
  const endSpot = () => spot($("#school-b"), "above");
  const ppTl = gsap.timeline({
    scrollTrigger: {
      trigger: stage, start: "top 85%", end: "bottom 80%", scrub: 1, invalidateOnRefresh: true,
      onLeave: () => $("#school-b").classList.add("is-received"),
      onEnterBack: () => $("#school-b").classList.remove("is-received"),
    },
  });
  ppTl
    .fromTo(card,
      { x: () => startSpot().x, y: () => startSpot().y, rotate: isRTL ? 6 : -6, scale: 0.85 },
      { x: () => endSpot().x, y: () => endSpot().y, rotate: 0, scale: 1, ease: "power2.inOut", duration: 1 })
    .to(card, { keyframes: { scale: [1, 1.08, 1] }, duration: 0.2 })
    .to("#pp-stamp", { opacity: 1, scale: 1, rotate: -8, duration: 0.2, ease: "back.out(3)" }, "<");
  gsap.from($$(".pp-points li"), { y: 40, autoAlpha: 0, stagger: 0.12, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".pp-points", start: "top 85%" } });

  /* ---------- Made for the UAE: cards rise in, demos start when seen ---------- */
  gsap.from(".bcard", { y: 80, autoAlpha: 0, stagger: 0.1, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".bento", start: "top 82%" } });
  setupDemos({ animated: true });
  gsap.from(".faq details", { y: 30, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".faq-list", start: "top 85%" } });

  /* ---------- Stats count up ---------- */
  $$("[data-count]").forEach((el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suffix || "";
    const o = { v: from };
    gsap.to(o, {
      v: to, duration: 1.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
      onUpdate: () => (el.textContent = Math.round(o.v) + suf),
    });
  });

  /* ---------- Marquee: loops, speeds up with scroll velocity ---------- */
  const loops = $$(".marquee-track").map((t, i) => {
    t.innerHTML += t.innerHTML; // duplicate for a seamless loop
    return gsap.fromTo(t, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: 28, ease: "none", repeat: -1 });
  });
  let boost = 1;
  const velo = ScrollTrigger.create({});
  gsap.ticker.add(() => {
    const target = gsap.utils.clamp(1, 6, 1 + Math.abs(velo.getVelocity()) / 400);
    boost += (target - boost) * 0.08;
    loops.forEach((l) => l.timeScale(boost));
  });

  /* ---------- Pricing cards rise and tilt ---------- */
  gsap.from(".price", { y: 100, autoAlpha: 0, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".price-grid", start: "top 80%" } });
  if (fine) $$(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(10px)`;
    });
    card.addEventListener("pointerleave", () => (card.style.transform = ""));
  });

  /* ---------- Giant "One key." fills as you scroll ---------- */
  gsap.fromTo("#giant", { "--p": "0%" }, { "--p": "100%", ease: "none", scrollTrigger: { trigger: ".final", start: "top 80%", end: "top 10%", scrub: true } });
  gsap.from("#giant", { xPercent: 12, ease: "none", scrollTrigger: { trigger: ".final", start: "top bottom", end: "top top", scrub: true } });

  /* ---------- Cursor and magnetic buttons ---------- */
  if (fine) {
    const cursor = $("#cursor");
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });
    window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    $$("a, button, [data-hover], input").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.35, y: (e.clientY - r.top - r.height / 2) * 0.45, duration: 0.4, ease: "power3.out" });
      });
      btn.addEventListener("pointerleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, .4)" }));
    });
  }

  setupForm();
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

/* ---------- Helpers ---------- */
let typing;
function typeText(el, text) {
  clearInterval(typing);
  let i = 0;
  el.textContent = "";
  typing = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typing);
  }, 18);
}

function setupForm() {
  const form = $("#demo-form"), msg = $("#form-msg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    $$("input", form).forEach((input) => {
      const valid = input.checkValidity() && input.value.trim() !== "";
      input.setAttribute("aria-invalid", String(!valid));
      if (!valid) ok = false;
    });
    msg.style.color = ok ? "" : "var(--red)";
    msg.textContent = ok ? t("formOk") : t("formErr");
    if (ok) form.reset();
  });
}
