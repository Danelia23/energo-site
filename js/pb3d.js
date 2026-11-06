/* Настоящий 3D-пауэрбанк на первом экране (three.js).
   Скруглённый корпус, глянцевый пластик, отражения; лицевая и задняя стороны — рендеры из брендбука,
   поверх них «напечатан» логотип. Если WebGL недоступен или файл не загрузился, остаётся CSS-версия. */
(function () {
  var stage = document.querySelector(".pb-stage");
  var THREE = window.THREE, D = window.ENERGO_DATA && window.ENERGO_DATA.pb;
  if (!stage || !THREE || !D) return;                 // остаётся CSS-версия
  var RoundedBoxGeometry = THREE.RoundedBoxGeometry, RoomEnvironment = THREE.RoomEnvironment;

  var css = getComputedStyle(stage);
  var num = function (name, fallback) { var v = parseFloat(css.getPropertyValue(name)); return isNaN(v) ? fallback : v; };
  var LEAN = num("--lean", 24) * Math.PI / 180;       // наклон пауэрбанка
  var TURNS = num("--turns", 1);                       // оборотов за прокрутку
  var LOGO_ROT = num("--logo-rot", -90);               // поворот логотипа на корпусе, градусы
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var state = window.ENERGO_PB || (window.ENERGO_PB = { sc: 0, mx: 0, my: 0 });

  var canvas = document.createElement("canvas");
  canvas.className = "pb-canvas";
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // сохраняем насыщенный жёлтый из брендбука
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0, 5.5);

  var key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(3, 4, 5); scene.add(key);
  var rim = new THREE.DirectionalLight(0xffd54a, 0.9); rim.position.set(-4, 1.5, -3); scene.add(rim);

  var FILL = "#F1C200";
  function load(src) {
    return new Promise(function (ok, fail) {
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = fail; im.src = src;
    });
  }
  function bake(img, logo, withLogo) {
    var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    var x = c.getContext("2d");
    x.fillStyle = FILL; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0);
    if (withLogo && logo) {
      // Логотип по центру свободной зоны под проводами (от ~38% до низа корпуса) и по центру корпуса.
      // Центр считается по «массе» букв, а не по рамке: у «g» есть хвостик, и без поправки надпись съезжает.
      var lw = c.height * 0.46, lh = lw * 38.6857 / 186.954;
      x.save(); x.globalCompositeOperation = "multiply"; x.globalAlpha = 0.95;
      x.translate(c.width * 0.5, c.height * 0.697); x.rotate(LOGO_ROT * Math.PI / 180);
      x.drawImage(logo, -lw / 2 + 0.0108 * lw, -lh / 2 + 0.123 * lh, lw, lh); x.restore();
    }
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  Promise.all([load(D.front), load(D.back), load(D.side), load(D.logo)])
    .then(function (a) { build(a[0], a[1], a[2], a[3]); })
    .catch(function () { /* остаётся CSS-версия */ });

  var root = new THREE.Group(), tilt = new THREE.Group(), lean = new THREE.Group(), spin = new THREE.Group();
  var running = false, startT = 0, visible = true;

  function build(front, back, side, logo) {
    var base = { roughness: 0.5, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 0.62 };
    var mFront = new THREE.MeshPhysicalMaterial(Object.assign({ map: bake(front, logo, true) }, base));
    var mBack = new THREE.MeshPhysicalMaterial(Object.assign({ map: bake(back, logo, true) }, base));
    var mSide = new THREE.MeshPhysicalMaterial(Object.assign({ map: bake(side, null, false) }, base));
    var mCap = new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xeab400 }, base));

    var H = 2, W = H * 0.456, D = H * 0.1;
    var geo = new RoundedBoxGeometry(W, H, D, 6, D * 0.46);
    var mesh = new THREE.Mesh(geo, [mSide, mSide, mCap, mCap, mFront, mBack]); // право, лево, верх, низ, перед, зад

    spin.add(mesh); lean.add(spin); tilt.add(lean); root.add(tilt); scene.add(root);
    lean.rotation.z = -LEAN;

    stage.insertBefore(canvas, stage.querySelector(".pb-mouse")); // над свечением, под тенью
    resize();
    new ResizeObserver(resize).observe(stage);
    stage.classList.add("pb-stage--webgl");

    startT = performance.now();
    if (reduced) { spin.rotation.y = -0.35; renderer.render(scene, camera); return; }
    var io = new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }, { threshold: 0 });
    io.observe(stage);
    document.addEventListener("visibilitychange", kick);
    kick();
  }

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // пауэрбанк занимает ~80% высоты сцены
    camera.position.z = (2 / 0.8) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
    if (reduced) renderer.render(scene, camera);
  }

  function kick() {
    if (running || !visible || document.hidden || reduced) return;
    running = true; requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    var t = (now - startT) / 1000;
    var k = Math.min(t / 1.9, 1), e = 1 - Math.pow(1 - k, 3);                 // появление
    root.scale.setScalar(0.55 + 0.45 * e);
    canvas.style.opacity = Math.min(t / 0.5, 1);
    var calm = document.documentElement.classList.contains("no-motion");     // «Остановить анимацию»: остаётся только вращение от прокрутки
    spin.rotation.y = state.sc * TURNS * Math.PI * 2 + (1 - e) * -5.6 + (calm ? 0 : Math.sin(t * 0.9) * 0.12) - 0.22;
    root.position.y = calm ? 0 : Math.sin(t * 1.15) * 0.05;
    tilt.rotation.x = state.my * 0.12;
    tilt.rotation.y = state.mx * 0.2;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
})();
