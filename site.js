// ground0.io: the hero and the small examples below it. No dependencies, no network, no storage.

/* ── The hero: two product windows replay real work on an engineered grid ── */
(function () {
  "use strict";
  var doc = document;
  var root = doc.querySelector(".gzh");
  if (!root || root._gzh) return;
  // The page waits 2.5 s for this file and then shows its still, finished state. If that has happened, leave it be.
  if (!doc.documentElement.classList.contains("js")) return;
  root._gzh = true;

  var one = function (sel, el) { return (el || root).querySelector(sel); };
  var all = function (sel, el) { return [].slice.call((el || root).querySelectorAll(sel)); };
  var media = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var mqReduce = media("(prefers-reduced-motion: reduce)");
  var mqFine = media("(hover: hover) and (pointer: fine)");
  var reduce = !!mqReduce.matches;
  var inView = false, seen = false, live = false, paused = false;
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
  var STOP = {};          // thrown through a script when its run is cancelled or held
  var STATES = 5;         // question, steps running, answer, draft card, receipt
  var parked = [];        // playback waiting for the hero to come back on screen; no timer runs meanwhile
  function wake() { var w = parked; parked = []; w.forEach(function (f) { f(); }); }

  root.classList.add("gzh-js");
  if (reduce) root.classList.add("gzh-still");

  /* ── one product window replaying one conversation ─────────────────────── */
  function Player(win) {
    var p = this;
    p.win = win;
    p.thread = one(".gzh-thread", win);
    p.col = one(".gzh-col", win);
    p.comp = one(".gzh-composer", win);
    p.input = one(".gzh-input", win);
    p.typed = one(".gzh-typed", win);
    p.items = {};
    all("[data-k]", win).forEach(function (el) { p.items[el.getAttribute("data-k")] = el; });
    p.words = [];
    all(".gzh-prose", win).forEach(function (el) { p.words = p.words.concat(splitWords(el)); });
    p.cursor = doc.createElement("i");
    p.cursor.className = "gzh-cursor";
    p.run = 0; p.fast = false; p.hold = false; p.until = 0; p.marks = 0;
    if (window.ResizeObserver) new ResizeObserver(function () { p.follow(); }).observe(p.col);
  }
  var P = Player.prototype;

  function splitWords(el) {
    var words = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) return walk(n);
        if (n.nodeType !== 3) return;
        var parts = n.nodeValue.match(/\S+\s*/g);
        if (!parts) return;
        var frag = doc.createDocumentFragment();
        if (/^\s/.test(n.nodeValue)) frag.appendChild(doc.createTextNode(" "));
        parts.forEach(function (w) {
          var s = doc.createElement("span");
          s.className = "gzh-word";
          s.textContent = w;
          frag.appendChild(s);
          words.push(s);
        });
        node.replaceChild(frag, n);
      });
    })(el);
    el._gzhWords = words;
    return words;
  }

  // Waits ms of on-screen time: the clock stands still while the hero is off screen or the tab is hidden.
  P.sleep = function (ms) {
    var p = this, id = p.run;
    if (p.fast) return Promise.resolve();
    return new Promise(function (res, rej) {
      (function tick(left) {
        if (p.run !== id) return rej(STOP);
        if (!live) return void parked.push(function () { tick(left); });
        if (left <= 0) return res();
        var d = Math.min(left, 240);
        setTimeout(function () { tick(left - d); }, d);
      })(ms);
    });
  };
  // A key state has been reached. Fast runs either stop here (stepping) or carry on at normal speed.
  P.mark = function () {
    var p = this;
    p.marks++;
    if (!p.fast || p.marks < p.until) return;
    if (p.hold) throw STOP;
    p.fast = false;
    raf(function () { p.follow(); raf(function () { p.win.classList.remove("gzh-snap"); }); });
  };
  P.show = function (k, st) { var el = this.items[k]; if (!el) return; if (st) el.setAttribute("data-st", st); el.classList.add("gzh-on"); this.win.classList.remove("gzh-blank"); };
  P.set = function (k, st) { var el = this.items[k]; if (el) el.setAttribute("data-st", st); };
  P.hide = function (k) { var el = this.items[k]; if (el) el.classList.remove("gzh-on"); };
  P.composer = function (st) { this.comp.setAttribute("data-st", st); };
  P.reset = function () {
    var p = this, k;
    for (k in p.items) {
      p.items[k].classList.remove("gzh-on");
      if (p.items[k].classList.contains("gzh-work")) { p.items[k]._gzhN = 0; p.items[k]._gzhS = 0; }
    }
    p.words.forEach(function (w) { w.classList.remove("gzh-won"); });
    all(".gzh-meta, .gzh-t", p.win).forEach(function (el) { el.textContent = ""; });
    if (p.cursor.parentNode) p.cursor.parentNode.removeChild(p.cursor);
    p.typed.textContent = "";
    p.composer("idle");
    p.marks = 0;
    p.win.classList.add("gzh-blank");   // an empty thread shows the greeting, as a new chat does in the app
  };
  // Keep the newest line in view by sliding the column up. Nothing here scrolls, so the page's own scrolling is never caught.
  P.follow = function () {
    var p = this;
    var over = p.col.offsetHeight + 14 + 12 - p.thread.clientHeight;
    p.col.style.transform = over > 0 ? "translate3d(0," + -Math.round(over) + "px,0)" : "";
  };
  P.meta = function (w) {
    var el = this.items[w], m = one(".gzh-meta", el), n = el._gzhN || 0, s = el._gzhS || 0;
    m.textContent = n ? n + " " + el.getAttribute(n === 1 ? "data-one" : "data-many") + (s ? " · " + s + " s" : "") : "";
  };
  // The question is typed into the composer, sent, and appears as a bubble.
  P.ask = async function (k) {
    var p = this, el = p.items[k], bubble = one(".gzh-bubble", el);
    var rtl = bubble.getAttribute("dir") === "rtl";
    if (!p.fast) {
      var text = bubble.textContent.replace(/\s+/g, " ").trim();
      p.input.setAttribute("dir", rtl ? "rtl" : "ltr");
      p.typed.textContent = "";
      p.composer("type");
      await p.sleep(420);
      for (var i = 1; i <= text.length; i++) {
        p.typed.textContent = text.slice(0, i);
        p.input.scrollLeft = rtl ? -p.input.scrollWidth : p.input.scrollWidth;
        await p.sleep(text.charAt(i - 1) === " " ? 46 : 20 + Math.random() * 20);
      }
      await p.sleep(420);
      p.composer("sent");
      await p.sleep(170);
    }
    p.typed.textContent = "";
    p.input.setAttribute("dir", "ltr");
    p.composer("busy");
    p.show(k);
  };
  // One real step: it arrives running, counts whole seconds, then is done.
  P.step = async function (w, k, secs, markHere) {
    var p = this, el = p.items[k], work = p.items[w], t = one(".gzh-t", el);
    work._gzhN = (work._gzhN || 0) + 1;
    p.show(k, "live");
    p.meta(w);
    if (markHere) p.mark();
    for (var s = 1; s <= secs; s++) {
      await p.sleep(1000);
      t.textContent = s + " s";
      work._gzhS = (work._gzhS || 0) + 1;
      p.meta(w);
    }
    await p.sleep(160);
    p.set(k, "done");
  };
  // The answer is written word by word; the block cursor means text is being written right now.
  P.stream = async function (k) {
    var p = this, el = p.items[k], words = el._gzhWords || [];
    p.show(k);
    for (var i = 0; i < words.length; i++) {
      words[i].classList.add("gzh-won");
      if (!p.fast) {
        words[i].parentNode.insertBefore(p.cursor, words[i].nextSibling);
        await p.sleep(62);
      }
    }
    if (!p.fast) await p.sleep(260);
    if (p.cursor.parentNode) p.cursor.parentNode.removeChild(p.cursor);
  };
  P.clear = async function () {
    var p = this;
    p.win.classList.add("gzh-fade");
    await p.sleep(430);
    p.reset();
    p.win.classList.add("gzh-snap");
    p.follow();
    void p.col.offsetWidth;
    p.win.classList.remove("gzh-snap");
    p.win.classList.remove("gzh-fade");
    await p.sleep(300);
  };

  // The conversation both windows replay; the words come from each window's own markup.
  async function conversation(p) {
    await p.sleep(500);
    await p.ask("q1");
    p.mark();                                   // 1 question
    await p.sleep(380);
    p.show("w1", "think");
    await p.sleep(950);
    p.set("w1", "run");
    await p.step("w1", "s1", 2);
    await p.step("w1", "s2", 2, true);          // 2 steps arriving
    await p.sleep(240);
    p.set("w1", "done");                        //   steps fold
    p.composer("idle");
    await p.stream("a1");
    await p.sleep(160);
    p.show("r1");
    p.mark();                                   // 3 answer
    await p.sleep(2900);
    await p.ask("q2");
    await p.sleep(380);
    p.show("w2", "think");
    await p.sleep(850);
    p.set("w2", "run");
    await p.step("w2", "s3", p.items.s4 ? 1 : 2);
    if (p.items.s4) await p.step("w2", "s4", 1);
    await p.sleep(240);
    p.set("w2", "wait");
    p.set("c", "ready");
    p.show("c");
    p.composer("idle");
    p.mark();                                   // 4 draft card, waiting for a person
    await p.sleep(3300);
    p.set("c", "press");
    await p.sleep(460);
    p.hide("c");
    p.items.w2._gzhN = (p.items.w2._gzhN || 0) + 1;
    p.items.w2._gzhS = (p.items.w2._gzhS || 0) + 1;
    p.meta("w2");
    p.set("w2", "done");
    p.show("rc");
    p.mark();                                   // 5 receipt
  }

  // Plays the loop. from > 0 begins part-way in, so the two windows are never in the same phase.
  P.loop = async function (from) {
    var p = this;
    p.run++;
    wake();
    p.reset();
    p.win.classList.remove("gzh-fade");
    p.hold = false; p.until = from || 0; p.fast = !!from;
    p.win.classList.toggle("gzh-snap", !!from);
    p.follow();
    try {
      for (;;) {
        await conversation(p);
        await p.sleep(5200);
        await p.clear();
      }
    } catch (e) { if (e !== STOP) throw e; }
  };
  // Shows key state n at once, with no movement.
  P.jump = async function (n) {
    var p = this;
    p.run++;
    wake();
    p.reset();
    p.win.classList.remove("gzh-fade");
    p.win.classList.add("gzh-snap");
    p.hold = true; p.until = n; p.fast = true;
    try { await conversation(p); } catch (e) { if (e !== STOP) throw e; }
    p.fast = false;
    p.follow();
  };

  var players = all(".gzh-win[data-play]").map(function (w) { return new Player(w); });
  var count = one(".gzh-count");
  var state = STATES;
  function play() { players.forEach(function (p, i) { p.loop(i % 2 ? 3 : 0); }); }
  function still(n) {
    state = n;
    players.forEach(function (p) { p.jump(n); });
    if (count) count.textContent = n === STATES ? "" : n + " / " + STATES;
  }

  /* ── signal layer: slow dust and a few pulses travelling along the grid ─── */
  var fx = (function () {
    var cv = one(".gzh-fx"), ctx = cv && cv.getContext ? cv.getContext("2d") : null;
    var copy = one(".gzh-copy"), bar = one(".gzh-bar"), note = one(".gzh-note"), floor = one(".gzh-floor");
    var W = 0, H = 0, cell = 48, gx = 8, bottom = 0, calm = null, dust = [], pulses = [], maxPulses = 3;
    var frameId = 0, last = 0, spawnIn = 0.4, running = false;
    if (!ctx) return { size: function () {}, start: function () {}, stop: function () {}, still: function () {} };

    function size() {
      var r = root.getBoundingClientRect(), cs = getComputedStyle(root);
      // nothing is drawn over the text column, nor over the label and control above the windows
      // (laid-out positions, so the entrance movement of a block does not shift its rectangle)
      var box = function (el, m) { var x = 0, y = 0, e = el; while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x0: x - m, y0: y - m, x1: x + el.offsetWidth + m, y1: y + el.offsetHeight + m }; };
      W = Math.round(r.width); H = Math.round(r.height);
      if (!W || !H) return;
      cell = parseFloat(cs.getPropertyValue("--gzh-cell")) || 48;
      gx = parseFloat(cs.getPropertyValue("--gzh-gx")) || 0;
      var small = W < 620 || !mqFine.matches;
      // a phone gets a smaller backing store, fewer dots and fewer pulses
      var dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt((small ? 1.5e6 : 4e6) / (W * H)));
      dpr = Math.max(0.75, dpr);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bottom = H - (floor ? floor.offsetHeight : 0);
      calm = [box(copy, 22)];
      if (bar && bar.offsetWidth) calm.push(box(bar, 6));
      if (note && note.offsetWidth) calm.push(box(note, 6));
      maxPulses = small ? 2 : 4;
      var n = Math.min(small ? 14 : 34, Math.round((W * H) / 26000));
      dust = [];
      for (var i = 0; i < n; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.1, vx: (Math.random() - 0.5) * 7, vy: -(2 + Math.random() * 7), ph: Math.random() * 6.28, a: 0.14 + Math.random() * 0.3 });
      pulses = [];
      if (!running) draw(0, true);
    }
    // 0 on the text block, rising to 1 well clear of it; also eases off at the wrapper's edges
    function clear(x, y) {
      var m = 1, i, c, dx, dy;
      for (i = 0; i < calm.length; i++) {
        c = calm[i];
        dx = Math.max(c.x0 - x, 0, x - c.x1); dy = Math.max(c.y0 - y, 0, y - c.y1);
        m = Math.min(m, Math.sqrt(dx * dx + dy * dy) / (i ? 36 : 70));
      }
      var e = Math.min(x, W - x, y) / 40;
      return e < 1 ? m * Math.max(0, e) : m;
    }
    function spawn() {
      var h = Math.random() < 0.5, dir = Math.random() < 0.5 ? 1 : -1, len = 70 + Math.random() * 80, p;
      if (h) {
        var rows = Math.max(1, Math.floor(bottom / cell) - 1);
        p = { h: true, pos: (1 + Math.floor(Math.random() * rows)) * cell + 0.5, head: dir > 0 ? -len : W + len, end: dir > 0 ? W + len : -len };
      } else {
        var cols = Math.max(1, Math.floor((W - gx) / cell));
        p = { h: false, pos: gx + Math.floor(Math.random() * (cols + 1)) * cell + 0.5, head: dir > 0 ? -len : bottom + len, end: dir > 0 ? bottom + len : -len };
      }
      p.dir = dir; p.len = len; p.v = 70 + Math.random() * 80;
      pulses.push(p);
    }
    function draw(dt, staticFrame) {
      ctx.clearRect(0, 0, W, H);
      if (!calm) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      var i, m, t = last / 1000;
      for (i = 0; i < calm.length; i++) ctx.rect(calm[i].x0, calm[i].y0, calm[i].x1 - calm[i].x0, calm[i].y1 - calm[i].y0);
      ctx.clip("evenodd");
      ctx.fillStyle = "#fff";
      for (i = 0; i < dust.length; i++) {
        var d = dust[i];
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
        if (d.x < -4) d.x = W + 4; else if (d.x > W + 4) d.x = -4;
        m = clear(d.x, d.y);
        if (m < 0.03) continue;
        ctx.globalAlpha = d.a * m * (staticFrame ? 0.8 : 0.6 + 0.4 * Math.sin(t * 1.1 + d.ph));
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!staticFrame) {
        ctx.beginPath(); ctx.rect(0, 0, W, bottom); ctx.clip();
        ctx.lineWidth = 1;
        for (i = pulses.length - 1; i >= 0; i--) {
          var p = pulses[i];
          p.head += p.dir * p.v * dt;
          if ((p.dir > 0 && p.head > p.end) || (p.dir < 0 && p.head < p.end)) { pulses.splice(i, 1); continue; }
          var hx = p.h ? p.head : p.pos, hy = p.h ? p.pos : p.head;
          var tx = p.h ? p.head - p.dir * p.len : p.pos, ty = p.h ? p.pos : p.head - p.dir * p.len;
          m = clear(Math.max(0, Math.min(W, hx)), Math.max(0, Math.min(H, hy)));
          if (m < 0.03) continue;
          var g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(1, "rgba(255,255,255," + (0.8 * m).toFixed(3) + ")");
          ctx.strokeStyle = g;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255," + (0.16 * m).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 6.2832); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255," + (0.95 * m).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(hx, hy, 1.5, 0, 6.2832); ctx.fill();
        }
      }
      ctx.restore();
    }
    function frame(now) {
      if (!running) { frameId = 0; return; }
      frameId = raf(frame);
      var dt = (now - last) / 1000;
      if (dt < 0.03) return;           // about 30 frames a second is plenty for this
      last = now;
      if (dt > 0.1) dt = 0.1;
      spawnIn -= dt;
      if (spawnIn <= 0 && pulses.length < maxPulses) { spawn(); spawnIn = 0.5 + Math.random() * 1.3; }
      draw(dt, false);
    }
    return {
      size: size,
      start: function () { if (running) return; running = true; last = (window.performance && performance.now) ? performance.now() : Date.now(); if (!frameId) frameId = raf(frame); },
      stop: function () { running = false; },
      still: function () { running = false; pulses = []; draw(0, true); }
    };
  })();

  /* ── the wrapper decides: play while on screen and the tab is visible ───── */
  function update() {
    var now = inView && !doc.hidden && !reduce && !paused;
    if (inView && !seen) {
      seen = true;
      root.classList.add("gzh-seen");
      fx.size();
      // fetch the Arabic face now, a few seconds before the one Arabic message is typed, so it does not change face mid-word
      if (doc.fonts && doc.fonts.load) doc.fonts.load('15px "IBM Plex Sans Arabic"', "\u0645").catch(function () {});
      if (!reduce) setTimeout(play, 350);
    }
    if (now === live) return;
    live = now;
    root.classList.toggle("gzh-live", live);
    if (live) wake();
    if (live) fx.start(); else if (reduce) fx.still(); else fx.stop();
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) { inView = entries[entries.length - 1].isIntersecting; update(); }, { rootMargin: "-6% 0px -6% 0px", threshold: 0 }).observe(root);
  } else { inView = true; }
  doc.addEventListener("visibilitychange", update);

  // The roll of assistants under the buttons is moved by CSS alone while the hero is live. Three things are left
  // for here: it rests while the strip itself is off screen (on a phone the hero is taller than the screen); while
  // it moves it can take keyboard focus, which holds it; and each copy of the list is made a whole number of
  // pixels wide (up to 4px more before its first entry), so the end of the loop is exactly its start.
  var roll = one(".gzh-roll"), rollTrack = roll && one(".gzh-roll-track", roll);
  if (roll && window.IntersectionObserver) {
    new IntersectionObserver(function (entries) { roll.classList.toggle("gzh-roll-out", !entries[entries.length - 1].isIntersecting); }).observe(roll);
  }
  function rollFocus() { if (!roll) return; if (reduce) roll.removeAttribute("tabindex"); else roll.setAttribute("tabindex", "0"); }
  function rollFit() {
    var kids = rollTrack ? rollTrack.children : [], k = rollTrack ? +rollTrack.style.getPropertyValue("--gzh-roll-k") : 0, i;
    if (!k || kids.length <= k) return;
    for (i = 0; i < kids.length; i += k) kids[i].style.removeProperty("--gzh-roll-fit");
    if (!kids[k].offsetWidth) return;   // the copies are not shown: a still row
    // a multiple of 4 CSS pixels is a whole number of screen pixels at every usual pixel ratio (1, 1.25, 1.5, 2, 3)
    var w = kids[k].getBoundingClientRect().left - kids[0].getBoundingClientRect().left;
    var fit = Math.ceil((w - 0.01) / 4) * 4 - w;
    if (fit > 0.001) for (i = 0; i < kids.length; i += k) kids[i].style.setProperty("--gzh-roll-fit", fit + "px");
  }
  rollFocus();
  rollFit();

  if (window.ResizeObserver) new ResizeObserver(function () { fx.size(); players.forEach(function (p) { p.follow(); }); rollFit(); }).observe(root);
  else window.addEventListener("resize", function () { fx.size(); players.forEach(function (p) { p.follow(); }); rollFit(); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fx.size(); players.forEach(function (p) { p.follow(); }); rollFit(); });

  // Replay starts both examples again. With reduced motion nothing plays, so the same button shows the next
  // step instead and says so, on screen and to a screen reader.
  var replay = one(".gzh-replay"), replayText = replay && one("span", replay), pause = one(".gzh-pause");
  var names = replay && { text: replayText ? replayText.textContent : "", label: replay.getAttribute("aria-label") };
  function nameReplay() {
    if (!replay || !replayText) return;
    replayText.textContent = reduce ? replay.getAttribute("data-step") || names.text : names.text;
    var l = reduce ? replay.getAttribute("data-step-label") : names.label;
    if (l) replay.setAttribute("aria-label", l);
  }
  // Pause holds everything that moves in the hero: the conversations, the canvas and the looping CSS animations.
  function setPaused(on) {
    paused = on;
    if (pause) pause.setAttribute("aria-pressed", on ? "true" : "false");
    update();
  }
  function setMotion() {
    reduce = !!mqReduce.matches;
    root.classList.toggle("gzh-still", reduce);
    nameReplay();
    rollFocus();
    rollFit();
    if (reduce) { paused = false; if (pause) pause.setAttribute("aria-pressed", "false"); still(STATES); live = false; root.classList.remove("gzh-live"); fx.still(); }
    else { if (count) count.textContent = ""; if (seen) play(); update(); }
  }
  if (mqReduce.addEventListener) mqReduce.addEventListener("change", setMotion);

  if (replay) replay.addEventListener("click", function () {
    if (reduce) return still(state % STATES + 1);   // step through the states, no animation
    if (paused) setPaused(false);
    play();
  });
  if (pause) pause.addEventListener("click", function () { if (!reduce) setPaused(!paused); });

  /* ── a few degrees of tilt towards a fine pointer ───────────────────────── */
  var wins = one(".gzh-wins"), stage = one(".gzh-stage"), tiltId = 0, tx = 0, ty = 0;
  function tilt() { tiltId = 0; wins.style.setProperty("--gzh-px", tx.toFixed(3)); wins.style.setProperty("--gzh-py", ty.toFixed(3)); }
  if (wins && stage) {
    root.addEventListener("pointermove", function (e) {
      if (reduce || !mqFine.matches || (e.pointerType && e.pointerType !== "mouse")) return;
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      if (!tiltId) tiltId = raf(tilt);
    });
    root.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!tiltId) tiltId = raf(tilt); });
  }

  players.forEach(function (p) { p.reset(); });
  nameReplay();
  if (reduce) { still(STATES); fx.size(); fx.still(); }
  update();
})();

/* ── Below the hero: blocks rise in on view, small examples play once, the address can be copied ──
   A [data-demo] shows its [data-step] children in order when it comes into view. A step can type a
   line ([data-type]), write one word by word ([data-stream]), press a button ([data-press]) and go
   from running to done (data-done). Every step holds its place from the start, so the page never
   moves while an example plays. It plays once; Replay plays it again. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var all = function (sel, el) { return [].slice.call((el || doc).querySelectorAll(sel)); };
  root.classList.add("js");   // also when this file came so late that the page already shows its still state

  // the contact address: Copy puts it on the clipboard and says so
  all("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () { btn.classList.add("ok"); clearTimeout(btn._t); btn._t = setTimeout(function () { btn.classList.remove("ok"); }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  if (!root.classList.contains("motion")) return;   // reduced motion: everything already shows its finished state

  var reveal = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  all("[data-reveal]").forEach(function (el) { reveal.observe(el); });

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // A typed line keeps its full text in place: the part not yet typed is there, but invisible.
  function prepare(el) {
    var text = el.textContent, shown = doc.createElement("span"), rest = doc.createElement("span");
    rest.className = "rest";
    el.textContent = "";
    el.appendChild(shown); el.appendChild(rest);
    el._set = function (n) { shown.textContent = text.slice(0, n); rest.textContent = text.slice(n); };
    el._len = text.length;
    el._stops = el.hasAttribute("data-stream") ? (text.match(/\S+\s*/g) || []).reduce(function (a, w) { a.push((a.length ? a[a.length - 1] : 0) + w.length); return a; }, []) : null;
    el._shown = shown;
  }

  function Demo(demo) {
    var steps = all("[data-step]", demo), typed = all("[data-type], [data-stream]", demo), run = 0;
    typed.forEach(prepare);

    function reset() {
      demo.classList.remove("fin");
      steps.forEach(function (s) { s.classList.remove("on", "done"); });
      all(".pressed", demo).forEach(function (p) { p.classList.remove("pressed"); });
      typed.forEach(function (t) { t._set(0); });
    }
    async function write(el, live) {
      el._shown.classList.add("typing");
      if (el._stops) for (var w = 0; w < el._stops.length && live(); w++) { el._set(el._stops[w]); await sleep(58); }
      else for (var c = 1; c <= el._len && live(); c++) { el._set(c); await sleep(30); }
      el._shown.classList.remove("typing");
      el._set(el._len);
    }
    async function play() {
      var mine = ++run, live = function () { return run === mine; };
      reset();
      await sleep(350);
      for (var i = 0; i < steps.length && live(); i++) {
        var s = steps[i];
        await sleep(+s.getAttribute("data-after") || 0);
        if (!live()) return;
        s.classList.add("on");
        var lines = all("[data-type], [data-stream]", s);
        if (lines.length) await sleep(260);
        for (var j = 0; j < lines.length && live(); j++) await write(lines[j], live);
        var press = s.querySelector("[data-press]");
        if (press && live()) { await sleep(+press.getAttribute("data-press")); press.classList.add("pressed"); await sleep(420); }
        if (s.hasAttribute("data-done") && live()) { await sleep(+s.getAttribute("data-done")); if (live()) s.classList.add("done"); }
      }
      if (!live()) return;
      await sleep(500);
      if (live()) demo.classList.add("fin");
    }
    var replay = demo.querySelector("[data-replay]");
    if (replay) replay.addEventListener("click", play);
    reset();
    return play;
  }

  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { seen.unobserve(e.target); e.target._play(); } });
  }, { threshold: 0.35 });
  all("[data-demo]").forEach(function (demo) { demo._play = Demo(demo); seen.observe(demo); });
})();
