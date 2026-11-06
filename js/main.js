(function () {
  "use strict";
  var CFG = window.ENERGO_CONFIG || {};
  var CONSENT_KEY = "energo_cookie_consent";

  function store(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  /* ---------- Шапка: фон после прокрутки ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty("--p", max > 0 ? Math.min(window.scrollY / max, 1).toFixed(4) : 0);
    };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Плавное появление блоков ---------- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Пауэрбанк: вращение от прокрутки и наклон за мышью ---------- */
  var stage = document.querySelector(".pb-stage");
  if (stage) {
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var tx = 0, ty = 0, cx = 0, cy = 0, ts = 0, cs = 0, hero = stage.parentElement, ticking = false;
    var step = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; cs += (ts - cs) * 0.12;
      stage.style.setProperty("--mx", cx.toFixed(4));
      stage.style.setProperty("--my", cy.toFixed(4));
      stage.style.setProperty("--sc", cs.toFixed(4));
      window.ENERGO_PB = window.ENERGO_PB || {}; window.ENERGO_PB.mx = cx; window.ENERGO_PB.my = cy; window.ENERGO_PB.sc = cs;
      var moving = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 || Math.abs(ts - cs) > 0.0005;
      ticking = moving; if (moving) requestAnimationFrame(step);
    };
    var wake = function () { if (!ticking) { ticking = true; requestAnimationFrame(step); } };
    if (!still) {
      var readScroll = function () { ts = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.95), 0), 1); wake(); };
      readScroll(); window.addEventListener("scroll", readScroll, { passive: true });
      if (window.matchMedia("(hover: hover)").matches) {
        hero.addEventListener("mousemove", function (e) {
          var r = hero.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1; wake();
        });
        hero.addEventListener("mouseleave", function () { tx = 0; ty = 0; wake(); });
      }
    }
  }


  /* ---------- FAQ: вкладки и плавное раскрытие ответов ---------- */
  var faq = document.querySelector(".faq");
  if (faq) {
    var tabs = faq.querySelectorAll("[data-faq-tab]"), panels = faq.querySelectorAll("[data-faq-panel]");
    var selectTab = function (tab, focus) {
      var n = tab.getAttribute("data-faq-tab");
      tabs.forEach(function (t) { var on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-faq-panel") === n); });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      var n = tab.getAttribute("data-faq-tab"), panel = faq.querySelector('[data-faq-panel="' + n + '"]');
      tab.id = tab.id || "faq-tab-" + n; tab.setAttribute("aria-controls", "faq-panel-" + n); tab.tabIndex = tab.classList.contains("is-active") ? 0 : -1;
      if (panel) { panel.id = "faq-panel-" + n; panel.setAttribute("aria-labelledby", tab.id); }
      tab.addEventListener("click", function () { selectTab(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var to = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
        if (to > -1) { e.preventDefault(); selectTab(tabs[to], true); }
      });
    });
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var closeItem = function (d) {
      var a = d.querySelector(".ans");
      if (calm || !a.animate) { d.open = false; return; }
      a.style.overflow = "hidden";
      a.animate({ height: [a.offsetHeight + "px", "0px"], opacity: [1, 0] }, { duration: 240, easing: "ease" })
        .onfinish = function () { d.open = false; a.style.overflow = ""; };
    };
    faq.querySelectorAll("details").forEach(function (d) {
      d.querySelector("summary").addEventListener("click", function (e) {
        e.preventDefault();
        if (d.open) { closeItem(d); return; }
        faq.querySelectorAll("details[open]").forEach(function (o) { if (o !== d) closeItem(o); });
        d.open = true;
        var a = d.querySelector(".ans");
        if (calm || !a.animate) return;
        a.style.overflow = "hidden";
        a.animate({ height: ["0px", a.offsetHeight + "px"], opacity: [0, 1] }, { duration: 300, easing: "ease" })
          .onfinish = function () { a.style.overflow = ""; };
      });
    });
  }

  /* ---------- Конфигуратор терминалов: вкладки S06 / S08 / S24 / CS48 ---------- */
  document.querySelectorAll("[data-tconf]").forEach(function (box) {
    var tabs = box.querySelectorAll("[data-tc]"), panels = box.querySelectorAll("[data-tc-panel]");
    var pick = function (tab, focus) {
      var id = tab.getAttribute("data-tc");
      tabs.forEach(function (t) { var on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-tc-panel") === id); });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      tab.addEventListener("click", function () { pick(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var to = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
        if (to > -1) { e.preventDefault(); pick(tabs[to], true); }
      });
    });
  });

  /* ---------- Шаги на телефоне — карусель: делаем её доступной с клавиатуры, только когда она прокручивается ---------- */
  var stepsList = document.querySelector(".steps");
  if (stepsList) {
    var checkSteps = function () {
      if (stepsList.scrollWidth > stepsList.clientWidth + 4) { stepsList.tabIndex = 0; stepsList.setAttribute("aria-label", "Шаги: листайте вбок"); }
      else { stepsList.removeAttribute("tabindex"); stepsList.removeAttribute("aria-label"); }
    };
    checkSteps(); window.addEventListener("resize", checkSteps);
  }

  /* ---------- Меню ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    var inertTargets = [document.getElementById("main"), document.querySelector("footer")];
    var setNav = function (open, back) {
      nav.setAttribute("data-open", String(open));
      burger.setAttribute("aria-expanded", String(open));
      document.documentElement.classList.toggle("nav-open", open);
      inertTargets.forEach(function (el) { if (el) el.inert = open; });      // пока меню открыто, страница под ним недоступна
      if (!open && back) burger.focus();
    };
    burger.addEventListener("click", function () { setNav(nav.getAttribute("data-open") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.getAttribute("data-open") === "true") setNav(false, true); });
    var wide = window.matchMedia("(min-width: 961px)");
    var onWide = function () { if (wide.matches) setNav(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide); else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------- Cookie и аналитика ---------- */
  function readConsent() {
    return store(function () { return JSON.parse(localStorage.getItem(CONSENT_KEY)); }, null);
  }
  function saveConsent(c) {
    store(function () { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); });
    applyConsent(c);
  }
  var metrikaLoaded = false;
  function applyConsent(c) {
    if (!c || !c.analytics || !CFG.metrikaId || metrikaLoaded) return;
    metrikaLoaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(CFG.metrikaId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }
  var banner = document.getElementById("cookie");
  var bannerOpener = null;
  function showBanner(opener) {
    if (!banner) return;
    banner.hidden = false;
    if (opener) { bannerOpener = opener; banner.tabIndex = -1; banner.focus({ preventScroll: true }); }   // открыто по просьбе пользователя — переносим фокус
  }
  function hideBanner() {
    banner.hidden = true;
    if (bannerOpener) { bannerOpener.focus(); bannerOpener = null; }
  }
  if (banner) {
    var consent = readConsent();
    if (consent) applyConsent(consent); else showBanner();
    var opts = banner.querySelector(".cookie__opts");
    var analyticsBox = banner.querySelector("[name=analytics]");
    var settingsBtn = banner.querySelector("[data-cookie=settings]");
    opts.id = opts.id || "cookie-opts"; settingsBtn.setAttribute("aria-controls", opts.id); settingsBtn.setAttribute("aria-expanded", "false");
    settingsBtn.addEventListener("click", function () {
      var open = opts.getAttribute("data-open") === "true";
      opts.setAttribute("data-open", String(!open));
      settingsBtn.setAttribute("aria-expanded", String(!open));
      banner.querySelector("[data-cookie=accept]").textContent = !open ? "Сохранить выбор" : "Принять все";
    });
    banner.querySelector("[data-cookie=accept]").addEventListener("click", function () {
      var custom = opts.getAttribute("data-open") === "true";
      saveConsent({ necessary: true, analytics: custom ? analyticsBox.checked : true, at: Date.now() });
      hideBanner();
    });
    banner.querySelector("[data-cookie=reject]").addEventListener("click", function () {
      saveConsent({ necessary: true, analytics: false, at: Date.now() });
      hideBanner();
    });
  }
  document.querySelectorAll("[data-open-cookie]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); showBanner(b); });
  });

  /* ---------- Модальное окно заявки ---------- */
  document.querySelectorAll("[data-modal]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var d = document.getElementById(btn.getAttribute("data-modal"));
      if (d && d.showModal) { e.preventDefault(); d.showModal(); }
    });
  });
  document.querySelectorAll("dialog").forEach(function (d) {
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    var c = d.querySelector(".modal__close");
    if (c) c.addEventListener("click", function () { d.close(); });
  });

  /* ---------- Формы ---------- */
  document.querySelectorAll("form[data-form]").forEach(function (form, n) {
    var msg = form.querySelector(".form__msg");
    msg.id = msg.id || "form-msg-" + n;
    function say(state, text) { msg.setAttribute("data-state", state); msg.textContent = text; }
    var isBad = function (f) {
      var invalid = f.type === "checkbox" ? !f.checked : !f.value.trim();
      if (f.type === "tel" && f.value.replace(/\D/g, "").length < 10) invalid = true;
      if (f.type === "email" && f.value.trim() && !/^\S+@\S+\.\S+$/.test(f.value.trim())) invalid = true;
      return invalid;
    };
    var nameOf = function (f) {
      if (f.type === "checkbox") return "согласие на обработку персональных данных";
      var l = f.closest("label"), t = l && l.firstChild ? l.firstChild.textContent : f.name;
      return t.replace(/\s*\*\s*$/, "").trim().toLowerCase();
    };
    // ошибка исчезает, как только поле исправлено
    form.addEventListener("input", function (e) { var f = e.target; if (f.hasAttribute && f.hasAttribute("required") && f.getAttribute("aria-invalid") === "true" && !isBad(f)) f.setAttribute("aria-invalid", "false"); });
    form.addEventListener("change", function (e) { var f = e.target; if (f.type === "checkbox" && f.checked) f.setAttribute("aria-invalid", "false"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector(".hp input").value) return; // защита от ботов
      var bad = [], first = null;
      form.querySelectorAll("[required]").forEach(function (f) {
        var invalid = isBad(f);
        f.setAttribute("aria-invalid", String(invalid));
        if (invalid) { f.setAttribute("aria-describedby", msg.id); bad.push(nameOf(f)); if (!first) first = f; }
      });
      if (bad.length) { say("err", "Проверьте: " + bad.join(", ") + "."); first.focus(); return; }

      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== "hp") data[k] = v; });
      data.consent_at = new Date().toISOString();
      data.page = location.pathname;
      var url = (CFG.formEndpoints || {})[form.getAttribute("data-form")];
      var btn = form.querySelector("button[type=submit]");

      if (!url) { // тестовый режим
        console.info("[EnerGO] Эндпоинт формы не задан, данные не отправлены:", data);
        say("ok", "Тестовый режим: форма работает, но эндпоинт ещё не подключён, данные не отправлены.");
        return;
      }
      btn.disabled = true;
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); say("ok", "Спасибо! Заявка отправлена, мы свяжемся с вами."); form.reset(); })
        .catch(function () { say("err", "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам."); })
        .then(function () { btn.disabled = false; });
    });
  });

  /* ---------- Карта: живая карта включается только если есть данные о терминалах (data/terminals.json) ---------- */
  var mapBox = document.getElementById("map-box");
  if (mapBox) {
    var started = false;
    var start = function () {
      if (started) return; started = true;
      fetch(CFG.terminalsUrl || "data/terminals.json").then(function (r) { return r.json(); }).catch(function () { return []; }).then(function (list) {
        if (!Array.isArray(list) || !list.length) return;      // данных нет — остаётся блок «покрытие»
        var css = document.createElement("link");
        css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(css);
        var js = document.createElement("script");
        js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        js.onload = function () { mapBox.classList.add("map-box--live"); initMap(list); };
        document.head.appendChild(js);
      });
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { start(); o.disconnect(); } }, { rootMargin: "300px" }).observe(mapBox);
    } else start();
  }
  function initMap(points) {
    var L = window.L;
    var map = L.map("map", { scrollWheelZoom: false }).setView([55.75, 37.62], 10);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    var icon = L.divIcon({ className: "", html: '<div class="pin" style="width:30px;height:30px"><span>go</span></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
    points.forEach(function (p) {
      L.marker([p.lat, p.lng], { icon: icon }).addTo(map).bindPopup("<b>" + esc(p.name || "Терминал EnerGO") + "</b><br>" + esc(p.address || ""));
    });
    map.fitBounds(points.map(function (p) { return [p.lat, p.lng]; }), { padding: [40, 40] });
    var form = document.getElementById("map-search");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = form.querySelector("input").value.trim().toLowerCase();
      var hit = points.filter(function (p) { return ((p.address || "") + " " + (p.name || "")).toLowerCase().indexOf(q) > -1; })[0];
      if (hit) map.flyTo([hit.lat, hit.lng], 16);
    });
  }
  /* ---------- Счётчики: числа «набегают» при появлении ---------- */
  (function () {
    var els = document.querySelectorAll("[data-count]");
    if (!els.length || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("no-motion")) return;
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"); };
    var run = function (el) {
      var end = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "", vis = el._vis, t0 = null, dur = 1300;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 4);
        vis.textContent = fmt(Math.round(end * e)) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { cio.unobserve(x.target); run(x.target); } });
    }, { threshold: .4 });
    els.forEach(function (el) {
      var fin = el.textContent, suf = el.getAttribute("data-suffix") || "";
      var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = fin;       // итоговое значение — для скринридеров
      var vis = document.createElement("span"); vis.setAttribute("aria-hidden", "true"); vis.textContent = "0" + suf;
      el.textContent = ""; el.appendChild(sr); el.appendChild(vis); el._vis = vis;
      cio.observe(el);
    });
  })();

  /* ---------- Остановка анимации (WCAG 2.2.2): кнопка в подвале, выбор запоминается ---------- */
  (function () {
    var btn = document.querySelector("[data-motion]");
    if (!btn) return;
    var root = document.documentElement, KEY = "energo_no_motion";
    var paint = function () {
      var off = root.classList.contains("no-motion");
      btn.setAttribute("aria-pressed", String(off));
      btn.textContent = off ? "Включить анимацию" : "Остановить анимацию";
    };
    paint();
    btn.addEventListener("click", function () {
      var off = !root.classList.contains("no-motion");
      root.classList.toggle("no-motion", off);
      store(function () { localStorage.setItem(KEY, off ? "1" : "0"); });
      paint();
    });
  })();

  /* Ссылки-заглушки (href="#") не прокручивают страницу к началу */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (a && !a.hasAttribute("data-open-cookie")) e.preventDefault();
  });
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- 3D-пауэрбанк (three.js) подгружается после загрузки страницы ---------- */

  /* ================= Стиль v4: заголовки по словам, магнитные кнопки, курсор, ленты ================= */
  (function () {
    var root = document.documentElement;
    var calm = function () { return window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.classList.contains("no-motion"); };
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // 1) Заголовки секций въезжают по словам: слова оборачиваются, пока блок ещё невидим (он появляется через data-reveal)
    if (!calm()) {
      document.querySelectorAll(".head h2, .ed__head h2, .head--sub h2").forEach(function (h) {
        if (!h.closest("[data-reveal]") || h.hasAttribute("data-split")) return;
        var i = 0;
        (function walk(node) {
          Array.prototype.slice.call(node.childNodes).forEach(function (n) {
            if (n.nodeType === 3) {
              var frag = document.createDocumentFragment();
              n.textContent.split(/([ \t\n\r\f]+)/).forEach(function (part) {   // неразрывный пробел не режем: «всё —», «на ходу» остаются вместе
                if (!part) return;
                if (/^[ \t\n\r\f]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                var w = document.createElement("span"), inner = document.createElement("span");
                w.className = "w"; inner.style.setProperty("--i", i++); inner.textContent = part; w.appendChild(inner); frag.appendChild(w);
              });
              node.replaceChild(frag, n);
            } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
          });
        })(h);
        h.setAttribute("data-split", "");
      });
    }

    // 2) Магнитные кнопки: чуть тянутся за курсором
    if (fine && !calm()) {
      document.querySelectorAll(".btn:not([aria-disabled=true])").forEach(function (b) {
        b.addEventListener("mousemove", function (e) {
          var r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          b.style.setProperty("--mx", (dx * 0.18).toFixed(1) + "px"); b.style.setProperty("--my", (dy * 0.28).toFixed(1) + "px");
        });
        b.addEventListener("mouseleave", function () { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
      });
    }

    // 3) Курсор-кольцо: жёлтое на тёмном, чёрное на светлом и жёлтом, растёт над ссылками
    if (fine && !calm()) {
      var ring = document.createElement("div"); ring.className = "cursor"; ring.setAttribute("aria-hidden", "true"); document.body.appendChild(ring);
      var x = -100, y = -100, cx = -100, cy = -100, raf = 0, last = null;
      var isLight = function (px, py) {
        var el = document.elementFromPoint(px, py); if (!el) return false;
        return !el.closest(".hero, .sheet--black, .cta, .nf, .cookie, .nav, .coverage, .steps--stack .step, .wcard--cables, .tile--navy, .tconf__art, .footer__sk");
      };
      var tick = function () {
        cx += (x - cx) * 0.24; cy += (y - cy) * 0.24;
        ring.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
        raf = (Math.abs(x - cx) > 0.2 || Math.abs(y - cy) > 0.2) ? requestAnimationFrame(tick) : 0;
      };
      var refreshTone = function () { var l = isLight(x, y); if (l !== last) { ring.classList.toggle("is-light", l); last = l; } };
      var toneRaf = 0;
      window.addEventListener("scroll", function () {        // под неподвижным курсором меняется фон — пересчитываем цвет кольца
        if (x < 0 || toneRaf) return;
        toneRaf = requestAnimationFrame(function () { toneRaf = 0; refreshTone(); });
      }, { passive: true });
      window.addEventListener("mousemove", function (e) {
        x = e.clientX; y = e.clientY; ring.classList.add("is-on");
        refreshTone();
        ring.classList.toggle("is-link", !!(e.target.closest && e.target.closest("a, button, summary, [role=tab], label, input, select, textarea")));
        if (!raf) raf = requestAnimationFrame(tick);
      }, { passive: true });
      document.addEventListener("mouseleave", function () { ring.classList.remove("is-on"); });
    }

    // 4) Ленты чуть сдвигаются при прокрутке (поверх их собственного движения)
    var ribbons = document.querySelectorAll(".ribbons");
    if (ribbons.length && !calm()) {
      var pend = false;
      var shift = function () { pend = false; var v = (window.scrollY * 0.35).toFixed(1); ribbons.forEach(function (r) { r.style.setProperty("--sx", v); }); };
      window.addEventListener("scroll", function () { if (!pend) { pend = true; requestAnimationFrame(shift); } }, { passive: true });
    }
  })();

})();
