(function () {
  var caseRoot = document.getElementById("case");
  if (!caseRoot) return;

  var caseSpy = null;
  var lenis = null;

  if (
    window.Lenis &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      syncTouch: false,
    });
  }

  function scrollPage(to, immediate) {
    if (lenis) {
      lenis.scrollTo(to == null ? 0 : to, { immediate: !!immediate });
      return;
    }
    if (to == null || to === 0) {
      window.scrollTo(0, 0);
    } else if (typeof to === "number") {
      window.scrollTo(0, to);
    } else {
      to.scrollIntoView();
    }
  }

  function setTocActive(id) {
    var nav = caseRoot.querySelector(".c-toc-nav");
    if (!nav) return;
    var buttons = nav.querySelectorAll("button");
    var tick = nav.querySelector(".c-toc-tick");
    var active = null;
    buttons.forEach(function (btn) {
      var on = btn.getAttribute("data-target") === id;
      btn.classList.toggle("is-active", on);
      if (on) active = btn;
    });
    if (tick && active) {
      tick.style.transform = "translateY(" + (active.offsetTop + 2) + "px)";
    }
  }

  function bindCaseToc() {
    if (caseSpy) {
      caseSpy.disconnect();
      caseSpy = null;
    }
    var nav = caseRoot.querySelector(".c-toc-nav");
    if (!nav) return;
    var buttons = Array.prototype.slice.call(
      nav.querySelectorAll("button[data-target]")
    );
    var sections = buttons
      .map(function (btn) {
        return document.getElementById(btn.getAttribute("data-target"));
      })
      .filter(Boolean);

    nav.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-target]");
      if (!btn) return;
      var el = document.getElementById(btn.getAttribute("data-target"));
      if (!el) return;
      setTocActive(btn.getAttribute("data-target"));
      scrollPage(el, false);
    });

    if (!sections.length || !("IntersectionObserver" in window)) {
      if (buttons[0]) setTocActive(buttons[0].getAttribute("data-target"));
      return;
    }

    var visible = {};
    caseSpy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] =
            entry.isIntersecting && entry.intersectionRatio > 0;
        });
        var current = null;
        sections.forEach(function (sec) {
          if (visible[sec.id]) current = sec.id;
        });
        if (current) setTocActive(current);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.1, 0.4] }
    );
    sections.forEach(function (sec) {
      caseSpy.observe(sec);
    });
    if (buttons[0]) setTocActive(buttons[0].getAttribute("data-target"));
  }

  bindCaseToc();
})();
