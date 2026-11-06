/* Настоящий 3D-терминал EnerGO CS-S06 (модель из assets/model/CS-S06.glb) для блока «Готов быть всегда на связи?».
   Медленно вращается сам, а ещё его можно покрутить мышью или пальцем. Если WebGL недоступен или модель не
   загрузилась, остаётся плоский рендер assets/img/terminal-card.webp. */
(function () {
  var stage = document.querySelector(".cta__card");
  var THREE = window.THREE;
  if (!stage || !THREE) return;                       // остаётся плоская картинка
  var GLTFLoader = THREE.GLTFLoader, RoomEnvironment = THREE.RoomEnvironment;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var started = false;

  if ("IntersectionObserver" in window) {
    var wake = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !started) { started = true; wake.disconnect(); init(); }
    }, { rootMargin: "600px" });
    wake.observe(stage);
  } else { started = true; init(); }

  function init() {
    var canvas = document.createElement("canvas");
    canvas.className = "term-canvas";
    canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "Объёмная модель терминала EnerGO с ячейками для пауэрбанков");
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    var scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
    var camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(-3, 5, 5); scene.add(key);
    var fill = new THREE.DirectionalLight(0xfff1c2, 0.5); fill.position.set(4, 1.5, 3); scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffe08a, 0.8); rim.position.set(2, 3, -5); scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    var root = new THREE.Group(), spin = new THREE.Group(), model = null, floorY = 0;
    scene.add(root); root.add(spin);

    // модель встроена в js/data-terminal.js (base64), подгружается только когда блок почти виден
    function withData(cb) {
      if (window.ENERGO_DATA && window.ENERGO_DATA.terminalGlb) return cb();
      var sc = document.createElement("script"); sc.src = "js/data-terminal.js"; sc.onload = cb; sc.onerror = function () {};
      document.head.appendChild(sc);
    }
    function glbBuffer() {
      var bin = atob(window.ENERGO_DATA.terminalGlb), n = bin.length, u = new Uint8Array(n);
      for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      return u.buffer;
    }
    withData(function () { new GLTFLoader().parse(glbBuffer(), "", function (gltf) {
      model = gltf.scene;
      // по центру; терминал почти кубический (26 × 23 × 25 см), поэтому масштабируем по радиусу описанной сферы
      var box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      var k = 1.3 / (size.length() / 2); model.scale.setScalar(k);
      model.position.set(-c.x * k, -c.y * k, -c.z * k);
      floorY = -size.y * k / 2;

      model.traverse(function (o) {
        if (!o.isMesh) return;
        var m = o.material; if (!m) return;
        m.envMapIntensity = 0.75;
        if (m.name === "Yellow") { m.color.set("#ffc31a"); m.roughness = 0.4; }       // фирменный жёлтый ячеек
        if (m.name === "White") { m.roughness = 0.5; }                                   // корпус с жёлтой панелью
        if (m.name === "black_gloss") { m.roughness = 0.22; m.envMapIntensity = 0.9; m.emissiveIntensity = 1.0; }
        if (m.name === "Black_mate") { m.roughness = 0.55; }
        m.needsUpdate = true;
      });
      spin.add(model);

      // мягкая тень на «полу»
      var sc = document.createElement("canvas"); sc.width = sc.height = 256;
      var sx = sc.getContext("2d"), g = sx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(60,40,0,.55)"); g.addColorStop(1, "rgba(60,40,0,0)"); sx.fillStyle = g; sx.fillRect(0, 0, 256, 256);
      var shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = floorY - 0.01; root.add(shadow);

      stage.insertBefore(canvas, stage.firstChild);
      resize(); new ResizeObserver(resize).observe(stage);
      stage.classList.add("cta__card--webgl");
      setup();
    }, function () { /* остаётся плоская картинка */ }); });

    var yaw = 0.6, vel = 0, dragging = false, lastX = 0, lastMove = 0, visible = true, running = false, t0 = 0, tx = 0, ty = 0, mx = 0, my = 0;

    function setup() {
      t0 = performance.now();
      var io = new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }, { threshold: 0 });
      io.observe(stage);
      document.addEventListener("visibilitychange", kick);
      if (reduced) { spin.rotation.y = yaw; root.rotation.x = 0.12; renderer.render(scene, camera); return; }
      stage.style.touchAction = "pan-y"; stage.style.cursor = "grab";
      stage.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; vel = 0; lastMove = performance.now(); stage.setPointerCapture(e.pointerId); stage.style.cursor = "grabbing"; kick(); });
      stage.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        if (dragging) { var dx = e.clientX - lastX; lastX = e.clientX; yaw += dx * 0.011; vel = dx * 0.011; lastMove = performance.now(); }
        kick();
      });
      var up = function () { dragging = false; stage.style.cursor = "grab"; };
      stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
      stage.addEventListener("pointerleave", function () { if (!dragging) { tx = 0; ty = 0; } });
      kick();
    }

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      var fit = 2.6 / 0.66;                                        // сфера модели занимает ~66% высоты карточки
      var dist = (fit / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.set(0, 0.7, dist); camera.lookAt(0, -0.05, 0); camera.updateProjectionMatrix();
      if (reduced && model) renderer.render(scene, camera);
    }
    function kick() { if (running || !visible || document.hidden || reduced || !model) return; running = true; requestAnimationFrame(frame); }
    var prev = 0;
    function frame(now) {
      if (!visible || document.hidden) { running = false; return; }
      var dt = Math.min((now - (prev || now)) / 1000, 0.05); prev = now;
      var t = (now - t0) / 1000;
      var calm = document.documentElement.classList.contains("no-motion");   // «Остановить анимацию»: терминал не вращается сам, но его можно крутить мышью
      if (!dragging) {
        var idle = (now - lastMove) > 1200 && !calm;
        yaw += vel; vel *= 0.93;                         // инерция после броска
        if (idle) {                                      // медленное вращение; у лицевой стороны притормаживает
          var a = ((yaw - 0.55) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;   // угол от лицевого вида, -π..π
          var u = Math.min(Math.abs(a) / 1.3, 1), speed = 0.22 + 0.9 * u * u * (3 - 2 * u);
          yaw += dt * speed;
        }
      }
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      var k = Math.min(t / 1.4, 1), e = 1 - Math.pow(1 - k, 3);
      canvas.style.opacity = Math.min(t / 0.5, 1);
      root.scale.setScalar(0.8 + 0.2 * e);
      spin.rotation.y = yaw + (1 - e) * -1.6;
      root.rotation.x = 0.1 + my * 0.06; root.rotation.z = -mx * 0.03;
      root.position.y = calm ? 0 : Math.sin(t * 1.05) * 0.025;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
  }
})();
