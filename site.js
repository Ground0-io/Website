// Scripted demos, scroll reveals and the particle backdrop.
// No dependencies, no network, no storage.
//
// A [data-demo] replays its [data-step] children in order once it scrolls into
// view. Steps can show typing dots first (data-typing), type a line
// (data-typewrite), stream a reply word by word (data-stream), flip from
// running to completed (data-done) and press a button (data-press). Demos loop,
// except [data-once] ones, which stop at the end and offer a Replay button.
// With reduced motion everything is shown in its final state and nothing moves.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var all = function (sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); };

  if (reduce || !("IntersectionObserver" in window)) {
    root.classList.remove("js");
    return;
  }

  // Blur-fade reveal, staggered within a row of siblings.
  var reveal = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  all("[data-reveal]").forEach(function (el) { reveal.observe(el); });

  // Spotlight that follows the pointer across a card.
  all(".card, .list li").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // ── Scripted demos ──────────────────────────────────────────────────────
  function texts(step) {
    return all("[data-typewrite], [data-stream]", step).concat(
      step.matches("[data-typewrite], [data-stream]") ? [step] : []);
  }

  function dots() {
    var d = document.createElement("div");
    d.className = "msg bot dots";
    d.innerHTML = "<span></span><span></span><span></span>";
    return d;
  }

  // Keep a scrollable window pinned to its newest line, unless the visitor
  // has scrolled up to read something.
  function follow(demo) {
    var body = demo.querySelector("[data-scroll]");
    if (!body || body._free) return;
    body._auto = true;
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
    clearTimeout(body._t);
    body._t = setTimeout(function () { body._auto = false; }, 500);
  }

  function reset(demo, steps) {
    demo.classList.remove("finished");
    steps.forEach(function (s) {
      s.classList.remove("on", "done");
      texts(s).forEach(function (t) { t.textContent = ""; });
      all(".pressed", s).forEach(function (p) { p.classList.remove("pressed"); });
    });
    var body = demo.querySelector("[data-scroll]");
    if (body) { body._free = false; body.scrollTop = 0; }
  }

  async function run(demo, steps) {
    var mine = (demo._run = (demo._run || 0) + 1);
    var live = function () { return demo._run === mine; };
    reset(demo, steps);
    await sleep(500);
    for (var i = 0; i < steps.length && live(); i++) {
      var s = steps[i];
      await sleep(+s.dataset.after || 0);
      if (!live()) return false;
      if (s.dataset.typing) {
        var d = dots();
        s.parentNode.insertBefore(d, s);
        follow(demo);
        await sleep(+s.dataset.typing);
        d.remove();
        if (!live()) return false;
      }
      s.classList.add("on");
      follow(demo);
      var parts = texts(s);
      for (var j = 0; j < parts.length && live(); j++) {
        var el = parts[j], text = el.dataset.text;
        el.classList.add("typing");
        if (el.hasAttribute("data-stream")) {
          var words = text.split(" ");
          for (var w = 1; w <= words.length && live(); w++) {
            el.textContent = words.slice(0, w).join(" ");
            follow(demo);
            await sleep(48);
          }
        } else {
          for (var c = 1; c <= text.length && live(); c++) { el.textContent = text.slice(0, c); await sleep(34); }
        }
        el.classList.remove("typing");
      }
      var press = s.querySelector("[data-press]");
      if (press) { await sleep(+press.dataset.press); press.classList.add("pressed"); await sleep(450); }
      if (s.dataset.done) { await sleep(+s.dataset.done); s.classList.add("done"); }
    }
    if (!live()) return false;
    demo.classList.add("finished");
    follow(demo);
    return true;
  }

  async function play(demo) {
    var steps = all("[data-step]", demo);
    steps.forEach(function (s) { texts(s).forEach(function (t) { t.dataset.text = t.textContent; }); });

    var body = demo.querySelector("[data-scroll]");
    if (body) {
      body.addEventListener("scroll", function () {
        if (body._auto) return;
        body._free = body.scrollHeight - body.scrollTop - body.clientHeight > 40;
      });
    }
    var replay = demo.querySelector("[data-replay]");
    if (replay) replay.addEventListener("click", function () { run(demo, steps); });

    if (demo.hasAttribute("data-once")) { run(demo, steps); return; }
    for (;;) {
      while (!demo._visible) await sleep(400);
      await run(demo, steps);
      await sleep(5500);
    }
  }

  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.target._visible = e.isIntersecting;
      if (e.isIntersecting && !e.target._started) { e.target._started = true; play(e.target); }
    });
  }, { threshold: 0.3 });
  all("[data-demo]").forEach(function (el) { seen.observe(el); });

  // ── Particle backdrop ───────────────────────────────────────────────────
  // A few slow, twinkling dots in the text colour. Drawn only while visible.
  all(".backdrop").forEach(function (host) {
    var canvas = document.createElement("canvas");
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, dotsList = [], visible = false, raf = 0;

    function size() {
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(90, Math.round((W * H) / 16000));
      dotsList = [];
      for (var i = 0; i < n; i++) {
        dotsList.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.6 + Math.random() * 1.3,
          vx: (Math.random() - 0.5) * 0.14, vy: -(0.03 + Math.random() * 0.13),
          phase: Math.random() * 6.28, base: 0.12 + Math.random() * 0.3,
        });
      }
    }

    function frame(t) {
      if (!visible) { raf = 0; return; }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = getComputedStyle(host).color;
      for (var i = 0; i < dotsList.length; i++) {
        var p = dotsList[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        ctx.globalAlpha = p.base * (0.6 + 0.4 * Math.sin(t / 900 + p.phase));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    size();
    window.addEventListener("resize", size);
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(host);
  });
})();
