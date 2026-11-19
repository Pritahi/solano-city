// Boot the renderer, lighting, on-foot character, controls, and gameplay loop.
(function () {
  'use strict';

  const canvas = document.getElementById('city-canvas');
  const query = new URLSearchParams(window.location.search);
  const seedParameter = query.get('seed');
  const parsedSeed = seedParameter === null ? 1 : Number(seedParameter);
  const seed = Number.isSafeInteger(parsedSeed) ? parsedSeed >>> 0 : 1;
  const shot = query.get('shot');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7fb0d8);
  scene.fog = new THREE.Fog(0xd4b18f, 255, 560);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 500);

  scene.add(new THREE.HemisphereLight(0xd6eaff, 0x71523e, 1.25));

  const sun = new THREE.DirectionalLight(0xffc174, 2.0);
  sun.position.set(-78, 105, 64);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -145;
  sun.shadow.camera.right = 145;
  sun.shadow.camera.top = 145;
  sun.shadow.camera.bottom = -145;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);

  const city = SolanoCity.build(scene, seed);
  const spawn = new THREE.Vector3(city.streetSpawn.x, 0, city.streetSpawn.z);
  const player = SolanoPlayer.create(scene, spawn);
  const controls = SolanoControls.create(canvas, camera, city.buildings);
  const vehicles = SolanoVehicles.create(scene, city.grid, city.buildings, seed);

  if (shot === 'play') {
    const parkedCar = vehicles.stagePlayerBesideParked(player, 0);
    controls.setEnabled(false);
    const lookAt = parkedCar.root.position.clone().add(new THREE.Vector3(0, 1.15, 1.1));
    camera.position.set(parkedCar.root.position.x + 9.5, 4.4, parkedCar.root.position.z + 10.5);
    camera.lookAt(lookAt);
  }

  let previousTime = 0;
  let renderedFrames = 0;
  function animate(time) {
    requestAnimationFrame(animate);
    const deltaTime = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    const driving = vehicles.update(deltaTime, player, controls, camera);
    if (!driving) controls.update(deltaTime, player, time / 1000);
    renderer.render(scene, camera);
    renderedFrames += 1;
    if (shot && renderedFrames >= 2) window.__shotReady = true;
  }

  window.addEventListener('resize', function () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  });

  requestAnimationFrame(animate);
}());
