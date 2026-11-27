(function () {
  // Mobile case nav: hamburger toggles Resume + socials
  (function bindCaseNavMenu() {
    var nav = document.getElementById("case-nav");
    if (!nav) return;
    var toggle = nav.querySelector(".case-nav-toggle");
    var panel = nav.querySelector("#case-nav-panel");
    if (!toggle || !panel) return;

    function setOpen(open) {
      nav.classList.toggle("is-menu-open", open);
      document.body.classList.toggle("case-menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains("is-menu-open"));
    });

    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-menu-open")) return;
      if (nav.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    var mq = window.matchMedia("(max-width: 640px)");
    function onMq() {
      if (!mq.matches) setOpen(false);
    }
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  })();

  var caseRoot = document.getElementById("case");
  if (!caseRoot) return;

  var caseSpy = null;
  var lenis = null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Soft scroll reveals for sections after the hero (page load handled in CSS)
  (function bindSectionReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var sections = Array.prototype.slice.call(
      caseRoot.querySelectorAll(".c-section")
    );
    if (sections.length < 2) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 }
    );
    sections.forEach(function (sec, i) {
      if (i === 0) return;
      sec.classList.add("is-reveal");
      io.observe(sec);
    });
    // Hash / tall sections: ensure the target is visible even if IO misses
    var hashId = (location.hash || "").replace(/^#/, "");
    if (hashId) {
      var hashEl = document.getElementById(hashId);
      if (hashEl && hashEl.classList.contains("is-reveal")) {
        hashEl.classList.add("is-in");
      }
    }
  })();

  if (window.Lenis && !reduceMotion) {
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

  (function bindPhoneCarousels() {
    var carousels = caseRoot.querySelectorAll(".c-ui-carousel");
    if (!carousels.length) return;
    var mobileMq = window.matchMedia("(max-width: 640px)");

    carousels.forEach(function (carousel) {
      var track = carousel.querySelector(".c-ui-phones");
      var viewport = carousel.querySelector(".c-ui-phones-viewport") || track;
      var titleEl = carousel.querySelector(".c-ui-slide-title");
      var dots = Array.prototype.slice.call(
        carousel.querySelectorAll(".c-ui-dot")
      );
      var prev = carousel.querySelector(".c-ui-prev");
      var next = carousel.querySelector(".c-ui-next");
      if (!track || !dots.length) return;

      var realSlides = Array.prototype.slice.call(
        track.querySelectorAll(".c-phone:not(.is-clone)")
      );
      if (!realSlides.length) return;
      var n = realSlides.length;

      var startIndex = parseInt(carousel.getAttribute("data-start"), 10);
      if (isNaN(startIndex) || startIndex < 0 || startIndex >= n) {
        startIndex = 0;
      }

      // visualIndex: 0 = lastClone, 1..n = real slides, n+1 = firstClone
      var visualIndex = startIndex + 1;
      var activeIndex = startIndex;
      var autoTimer = null;
      var resumeTimer = null;
      var animating = false;
      var AUTO_MS = 7000;
      var firstClone = null;
      var lastClone = null;

      function setActive(i) {
        activeIndex = i;
        dots.forEach(function (dot, di) {
          dot.classList.toggle("is-active", di === i);
        });
        if (prev) prev.disabled = false;
        if (next) next.disabled = false;
        if (titleEl) {
          titleEl.textContent =
            realSlides[i].getAttribute("data-caption") || "";
        }
      }

      function setVisual(v, animate) {
        visualIndex = v;
        if (animate && !reduceMotion) {
          track.classList.add("is-animating");
        } else {
          track.classList.remove("is-animating");
        }
        track.style.transform = "translateX(" + -v * 100 + "%)";
      }

      function onTransitionEnd(e) {
        if (e.target !== track || e.propertyName !== "transform") return;
        if (visualIndex === n + 1) {
          // Landed on cloned Splash — snap to real Splash with no motion
          setVisual(1, false);
        } else if (visualIndex === 0) {
          // Landed on cloned last — snap to real last
          setVisual(n, false);
        }
        animating = false;
      }
      track.addEventListener("transitionend", onTransitionEnd);

      function goTo(logical, animate) {
        if (!mobileMq.matches) {
          setActive(logical);
          return;
        }
        if (animating && animate !== false) return;

        var useAnimate = animate !== false && !reduceMotion;

        if (logical >= n) {
          // Forward wrap: animate to firstClone, then snap to real Splash
          animating = true;
          setActive(0);
          setVisual(n + 1, useAnimate);
          if (!useAnimate) {
            setVisual(1, false);
            animating = false;
          }
          return;
        }

        if (logical < 0) {
          animating = true;
          setActive(n - 1);
          setVisual(0, useAnimate);
          if (!useAnimate) {
            setVisual(n, false);
            animating = false;
          }
          return;
        }

        logical = ((logical % n) + n) % n;
        animating = useAnimate;
        setActive(logical);
        setVisual(logical + 1, useAnimate);
        if (!useAnimate) animating = false;
      }

      function teardownLoop() {
        track.querySelectorAll(".c-phone.is-clone").forEach(function (el) {
          el.parentNode.removeChild(el);
        });
        firstClone = null;
        lastClone = null;
        track.classList.remove("is-animating");
        track.style.transform = "";
        realSlides = Array.prototype.slice.call(
          track.querySelectorAll(".c-phone:not(.is-clone)")
        );
        n = realSlides.length;
        animating = false;
      }

      function setupLoop() {
        teardownLoop();
        if (n < 2) return;
        lastClone = realSlides[n - 1].cloneNode(true);
        lastClone.classList.add("is-clone");
        lastClone.setAttribute("data-clone", "last");
        lastClone.setAttribute("aria-hidden", "true");
        firstClone = realSlides[0].cloneNode(true);
        firstClone.classList.add("is-clone");
        firstClone.setAttribute("data-clone", "first");
        firstClone.setAttribute("aria-hidden", "true");
        track.insertBefore(lastClone, track.firstChild);
        track.appendChild(firstClone);
      }

      function stopAuto() {
        if (autoTimer) {
          clearInterval(autoTimer);
          autoTimer = null;
        }
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
      }

      function startAuto() {
        stopAuto();
        if (reduceMotion || !mobileMq.matches) return;
        autoTimer = setInterval(function () {
          goTo(activeIndex + 1, true);
        }, AUTO_MS);
      }

      function bumpAuto() {
        stopAuto();
        if (reduceMotion || !mobileMq.matches) return;
        resumeTimer = setTimeout(startAuto, AUTO_MS);
      }

      function onUserNav(index) {
        goTo(index, true);
        bumpAuto();
      }

      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          onUserNav(parseInt(dot.getAttribute("data-index"), 10) || 0);
        });
      });
      if (prev)
        prev.addEventListener("click", function () {
          onUserNav(activeIndex - 1);
        });
      if (next)
        next.addEventListener("click", function () {
          onUserNav(activeIndex + 1);
        });

      // Axis-locked swipe: decide after ~8px, only claim horizontal drags
      var AXIS_LOCK_PX = 8;
      var SWIPE_PX = 40;
      var touchStartX = null;
      var touchStartY = null;
      var touchAxis = null; // null | "x" | "y"

      function resetTouch() {
        touchStartX = null;
        touchStartY = null;
        touchAxis = null;
      }

      viewport.addEventListener(
        "touchstart",
        function (e) {
          if (!mobileMq.matches || !e.touches || e.touches.length !== 1) {
            resetTouch();
            return;
          }
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchAxis = null;
          bumpAuto();
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchmove",
        function (e) {
          if (
            !mobileMq.matches ||
            touchStartX == null ||
            !e.touches ||
            !e.touches.length
          ) {
            return;
          }
          var x = e.touches[0].clientX;
          var y = e.touches[0].clientY;
          var dx = x - touchStartX;
          var dy = y - touchStartY;

          if (touchAxis == null) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
            touchAxis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
            if (touchAxis === "y") {
              // Vertical intent — let the page scroll; stop tracking
              resetTouch();
              return;
            }
          }

          if (touchAxis === "x" && e.cancelable) {
            // Only block page scroll once the gesture is clearly a slide swipe
            e.preventDefault();
          }
        },
        { passive: false }
      );

      viewport.addEventListener(
        "touchend",
        function (e) {
          if (
            touchAxis !== "x" ||
            touchStartX == null ||
            !e.changedTouches ||
            !e.changedTouches.length
          ) {
            resetTouch();
            return;
          }
          var dx = e.changedTouches[0].clientX - touchStartX;
          resetTouch();
          if (Math.abs(dx) < SWIPE_PX) return;
          onUserNav(activeIndex + (dx < 0 ? 1 : -1));
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchcancel",
        function () {
          resetTouch();
        },
        { passive: true }
      );

      function syncMode() {
        stopAuto();
        if (mobileMq.matches) {
          setupLoop();
          goTo(startIndex, false);
          startAuto();
        } else {
          teardownLoop();
          setActive(startIndex);
        }
      }

      if (mobileMq.addEventListener) {
        mobileMq.addEventListener("change", syncMode);
      } else if (mobileMq.addListener) {
        mobileMq.addListener(syncMode);
      }

      syncMode();
    });

    // Mark slide sections for CSS scroll-snap (no forced scroll hijack)
    caseRoot
      .querySelectorAll(".c-wf-group, .c-ui-show.is-onboarding")
      .forEach(function (u) {
        u.classList.add("is-carousel-snap");
      });
  })();

  // Phone truly viewport-fixed; only Recents list/spill moves
  (function bindDashScroll() {
    var scenes = Array.prototype.slice.call(
      caseRoot.querySelectorAll("[data-dash-scroll]")
    );
    if (!scenes.length) return;

    // Frame 902×1820; UI layers 807 wide; head 829; content 3308
    var PHONE_RATIO = 1820 / 902;
    var CONTENT_W_RATIO = 814 / 902;
    var LIST_TOP_RATIO = (42 + 829) / 1820; // under head at inner screen top
    var SCROLL_ASPECT = 3361 / 814;
    var AFTER_RATIO = 0.45; // breathing room after the phone once scroll finishes
    var CORNER_RATIO = 140 / 902; // outer corner radius of the frame asset
    var CLIP_TOP_RATIO = 42 / 1820; // inner screen edge, ignoring island
    var END_PAD_RATIO = 180 / 1820; // slight nudge so the last article peeks clear

    function clearPinStyles(pin) {
      pin.style.top = "";
      pin.style.left = "";
      pin.style.width = "";
      pin.style.height = "";
    }

    function undock(pin) {
      if (!pin._docked) return;
      if (pin._placeholder && pin._placeholder.parentNode) {
        pin._placeholder.parentNode.insertBefore(pin, pin._placeholder);
        pin._placeholder.parentNode.removeChild(pin._placeholder);
      }
      pin._placeholder = null;
      pin._docked = false;
    }

    function dockToBody(pin, top, left, width, phoneH) {
      if (!pin._docked) {
        var ph = document.createElement("div");
        ph.className = "dash-scroll-placeholder";
        ph.style.height = phoneH + "px";
        ph.style.width = "100%";
        pin.parentNode.insertBefore(ph, pin);
        pin._placeholder = ph;
        document.body.appendChild(pin);
        pin._docked = true;
      }
      pin.style.top = top + "px";
      pin.style.left = left + "px";
      pin.style.width = width + "px";
      pin.style.height = phoneH + "px";
    }

    function measure(scene) {
      var width = scene.getBoundingClientRect().width;
      if (!width) return null;
      var phoneH = width * PHONE_RATIO;
      var contentW = width * CONTENT_W_RATIO;
      var scrollH = contentW * SCROLL_ASPECT;
      var listTop = phoneH * LIST_TOP_RATIO;
      // Stop near phone bottom, nudged up slightly so the last article shows
      var travel = Math.max(0, scrollH - (phoneH - listTop) + phoneH * END_PAD_RATIO);
      var after = phoneH * AFTER_RATIO;
      var cornerR = width * CORNER_RATIO;
      scene.style.setProperty("--dash-phone-h", phoneH + "px");
      scene.style.setProperty("--dash-travel", travel + "px");
      scene.style.setProperty("--dash-after", after + "px");
      if (scene._pin) {
        scene._pin.style.setProperty("--dash-phone-h", phoneH + "px");
        scene._pin.style.setProperty("--dash-travel", travel + "px");
        var clipEl = scene._pin.querySelector(".dash-scroll-clip");
        if (clipEl) {
          // Rounded rect matching outer frame corners; open far below for spill.
          // Top is inset so the cut sits inside the mockup rim.
          var r = cornerR;
          var w = width;
          var h = phoneH;
          var top = phoneH * CLIP_TOP_RATIO;
          var spill = Math.ceil(h + travel + after + 200);
          clipEl._clipSpill =
            "path('M " +
            r +
            " " +
            top +
            " H " +
            (w - r) +
            " A " +
            r +
            " " +
            r +
            " 0 0 1 " +
            w +
            " " +
            (top + r) +
            " V " +
            spill +
            " H 0 V " +
            (top + r) +
            " A " +
            r +
            " " +
            r +
            " 0 0 1 " +
            r +
            " " +
            top +
            " Z')";
          clipEl._clipDone =
            "path('M " +
            r +
            " " +
            top +
            " H " +
            (w - r) +
            " A " +
            r +
            " " +
            r +
            " 0 0 1 " +
            w +
            " " +
            (top + r) +
            " V " +
            (h - r) +
            " A " +
            r +
            " " +
            r +
            " 0 0 1 " +
            (w - r) +
            " " +
            h +
            " H " +
            r +
            " A " +
            r +
            " " +
            r +
            " 0 0 1 0 " +
            (h - r) +
            " V " +
            (top + r) +
            " A " +
            r +
            " " +
            r +
            " 0 0 1 " +
            r +
            " " +
            top +
            " Z')";
        }
      }
      return { width: width, phoneH: phoneH, travel: travel, after: after };
    }

    function updateScene(scene) {
      var pin = scene._pin;
      if (!pin) return;

      var metrics = measure(scene);
      if (!metrics) return;

      var list = pin.querySelector(".dash-scroll-list");
      var phoneH = metrics.phoneH;
      var travel = metrics.travel;
      // Dead-center in the viewport
      var top = Math.max(0, (window.innerHeight - phoneH) / 2);
      var left = Math.max(0, (window.innerWidth - metrics.width) / 2);

      var clipEl = pin.querySelector(".dash-scroll-clip");

      function setClip(done) {
        if (!clipEl) return;
        clipEl.style.clipPath = done
          ? clipEl._clipDone || ""
          : clipEl._clipSpill || "";
      }

      function setProgress(p) {
        scene.style.setProperty("--dash-p", String(p));
        scene.style.setProperty("--dash-travel", travel + "px");
        pin.style.setProperty("--dash-p", String(p));
        pin.style.setProperty("--dash-travel", travel + "px");
        if (list) {
          list.style.transform =
            p <= 0 ? "" : "translate3d(0, " + -p * travel + "px, 0)";
        }
      }

      if (reduceMotion) {
        undock(pin);
        pin.classList.remove("is-fixed", "is-done");
        clearPinStyles(pin);
        setClip(true);
        setProgress(0);
        return;
      }

      var rect = scene.getBoundingClientRect();

      // Still above the pin point — reset
      if (travel <= 0 || rect.top > top) {
        undock(pin);
        pin.classList.remove("is-fixed", "is-done");
        clearPinStyles(pin);
        setClip(false);
        setProgress(0);
        return;
      }

      var p = (top - rect.top) / travel;
      if (p < 0) p = 0;
      if (p > 1) p = 1;

      // Content finished filling the phone — freeze and release to page scroll
      if (p >= 1 || rect.bottom - phoneH <= top) {
        undock(pin);
        pin.classList.remove("is-fixed");
        pin.classList.add("is-done");
        clearPinStyles(pin);
        setClip(true);
        setProgress(1); // keep screen filled; no more list motion
        return;
      }

      pin.classList.add("is-fixed");
      pin.classList.remove("is-done");
      dockToBody(pin, top, left, metrics.width, phoneH);
      setClip(false);
      setProgress(p);
    }

    function update() {
      scenes.forEach(updateScene);
    }

    scenes.forEach(function (scene) {
      scene._pin = scene.querySelector(".dash-scroll-pin");
      if (!scene._pin) return;
      var img = scene._pin.querySelector(".dash-scroll-list");
      if (img && !img.complete) img.addEventListener("load", update);
    });

    window.addEventListener("resize", update);

    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", update);
    } else {
      window.addEventListener("scroll", update, { passive: true });
    }
    update();
  })();
})();
