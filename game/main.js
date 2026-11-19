// Boot the renderer, lighting, camera orbit, and animation loop for Solano City.
(function () {
  'use strict';

  const canvas = document.getElementById('city-canvas');
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
  const cityCenter = new THREE.Vector3(0, 0, 0);

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

  SolanoCity.build(scene);

  let previousTime = 0;
  let elapsed = 0;
  function animate(time) {
    requestAnimationFrame(animate);
    const deltaTime = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    elapsed += deltaTime;

    const orbitAngle = elapsed * 0.035;
    const orbitRadius = 205;
    camera.position.set(
      Math.sin(orbitAngle) * orbitRadius,
      92 + Math.sin(elapsed * 0.12) * 2.5,
      Math.cos(orbitAngle) * orbitRadius
    );
    camera.lookAt(cityCenter);
    renderer.render(scene, camera);
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
