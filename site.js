// Scripted demos and scroll reveals. No dependencies, no network, no storage.
// Each [data-demo] replays its [data-step] children in order once it scrolls
// into view, then loops. With reduced motion everything is shown in its final
// state and nothing moves.
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

  function typed(step) {
    return step.matches("[data-typewrite]") ? step : step.querySelector("[data-typewrite]");
  }

  async function typewrite(el) {
    var text = el.dataset.text;
    el.classList.add("typing");
    for (var i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await sleep(34); }
    el.classList.remove("typing");
  }

  function dots() {
    var d = document.createElement("div");
    d.className = "msg bot dots";
    d.innerHTML = "<span></span><span></span><span></span>";
    return d;
  }

  async function play(demo) {
    var steps = all("[data-step]", demo);
    steps.forEach(function (s) { var t = typed(s); if (t) t.dataset.text = t.textContent; });
    for (;;) {
      while (!demo._visible) await sleep(400);
      demo.classList.remove("finished");
      steps.forEach(function (s) {
        s.classList.remove("on", "done");
        var t = typed(s); if (t) t.textContent = "";
        all(".pressed", s).forEach(function (p) { p.classList.remove("pressed"); });
      });
      await sleep(500);
      for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        await sleep(+s.dataset.after || 0);
        if (s.dataset.typing) {
          var d = dots();
          s.parentNode.insertBefore(d, s);
          await sleep(+s.dataset.typing);
          d.remove();
        }
        s.classList.add("on");
        var t = typed(s);
        if (t) await typewrite(t);
        var press = s.querySelector("[data-press]");
        if (press) { await sleep(+press.dataset.press); press.classList.add("pressed"); await sleep(450); }
        if (s.dataset.done) { await sleep(+s.dataset.done); s.classList.add("done"); }
      }
      demo.classList.add("finished");
      await sleep(5500);
    }
  }

  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.target._visible = e.isIntersecting;
      if (e.isIntersecting && !e.target._started) { e.target._started = true; play(e.target); }
    });
  }, { threshold: 0.35 });
  all("[data-demo]").forEach(function (el) { seen.observe(el); });
})();
