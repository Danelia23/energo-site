(function () {
  "use strict";
  var CFG = window.ENERGO_CONFIG || {};
  var CONSENT_KEY = "energo_cookie_consent";

  function store(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  /* ---------- Шапка: фон после прокрутки ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
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


  var termCard = document.querySelector(".cta__card");
  if (termCard && window.matchMedia("(hover: hover)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var ctaBlock = termCard.closest(".cta");
    ctaBlock.addEventListener("mousemove", function (e) {
      var r = ctaBlock.getBoundingClientRect();
      termCard.style.setProperty("--tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      termCard.style.setProperty("--ty", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    ctaBlock.addEventListener("mouseleave", function () { termCard.style.setProperty("--tx", 0); termCard.style.setProperty("--ty", 0); });
  }



  /* ---------- FAQ: вкладки и плавное раскрытие ответов ---------- */
  var faq = document.querySelector(".faq");
  if (faq) {
    var tabs = faq.querySelectorAll("[data-faq-tab]"), panels = faq.querySelectorAll("[data-faq-panel]");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var n = tab.getAttribute("data-faq-tab");
        tabs.forEach(function (t) { var on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
        panels.forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-faq-panel") === n); });
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

  /* ---------- Меню ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      burger.setAttribute("aria-expanded", String(!open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.setAttribute("data-open", "false"); burger.setAttribute("aria-expanded", "false"); }
    });
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
  function showBanner() { if (banner) banner.hidden = false; }
  if (banner) {
    var consent = readConsent();
    if (consent) applyConsent(consent); else showBanner();
    var opts = banner.querySelector(".cookie__opts");
    var analyticsBox = banner.querySelector("[name=analytics]");
    banner.querySelector("[data-cookie=settings]").addEventListener("click", function () {
      var open = opts.getAttribute("data-open") === "true";
      opts.setAttribute("data-open", String(!open));
      banner.querySelector("[data-cookie=accept]").textContent = !open ? "Сохранить выбор" : "Принять все";
    });
    banner.querySelector("[data-cookie=accept]").addEventListener("click", function () {
      var custom = opts.getAttribute("data-open") === "true";
      saveConsent({ necessary: true, analytics: custom ? analyticsBox.checked : true, at: Date.now() });
      banner.hidden = true;
    });
    banner.querySelector("[data-cookie=reject]").addEventListener("click", function () {
      saveConsent({ necessary: true, analytics: false, at: Date.now() });
      banner.hidden = true;
    });
  }
  document.querySelectorAll("[data-open-cookie]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); showBanner(); });
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
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var msg = form.querySelector(".form__msg");
    function say(state, text) { msg.setAttribute("data-state", state); msg.textContent = text; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector(".hp input").value) return; // защита от ботов
      var bad = false;
      form.querySelectorAll("[required]").forEach(function (f) {
        var invalid = f.type === "checkbox" ? !f.checked : !f.value.trim();
        if (f.type === "tel" && f.value.replace(/\D/g, "").length < 10) invalid = true;
        f.setAttribute("aria-invalid", String(invalid));
        if (invalid) bad = true;
      });
      if (bad) { say("err", "Проверьте обязательные поля и поставьте галочку согласия на обработку персональных данных."); return; }

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
    if (!els.length || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"); };
    var run = function (el) {
      var end = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "", t0 = null, dur = 1300;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(Math.round(end * e)) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); run(x.target); } });
    }, { threshold: .4 });
    els.forEach(function (el) { el.textContent = "0" + (el.getAttribute("data-suffix") || ""); io.observe(el); });
  })();
  /* Ссылки-заглушки (href="#") не прокручивают страницу к началу */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (a && !a.hasAttribute("data-open-cookie")) e.preventDefault();
  });
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- 3D-пауэрбанк (three.js) подгружается после загрузки страницы ---------- */
})();
