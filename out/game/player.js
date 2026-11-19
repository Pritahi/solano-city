// Create and animate Solano City's low-poly on-foot character.
window.SolanoPlayer = (function () {
  'use strict';

  function create(scene, startPosition) {
    const root = new THREE.Group();
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0xe86e4d, roughness: 0.88 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xc98260, roughness: 0.9 });
    const trouserMaterial = new THREE.MeshStandardMaterial({ color: 0x35495a, roughness: 0.92 });
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x49362e, roughness: 0.95 });

    function capsule(radius, length, material) {
      const group = new THREE.Group();
      if (THREE.CapsuleGeometry) {
        group.add(new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material));
      } else {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
        const top = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
        const bottom = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), material);
        top.position.y = length / 2;
        bottom.position.y = -length / 2;
        group.add(body, top, bottom);
      }
      return group;
    }

    const torso = capsule(0.28, 0.45, torsoMaterial);
    torso.position.y = 1.13;
    torso.castShadow = true;
    root.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMaterial);
    head.position.y = 1.62;
    head.castShadow = true;
    root.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.245, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.48), new THREE.MeshStandardMaterial({ color: 0x382d29, roughness: 1 }));
    hair.position.y = 1.66;
    hair.castShadow = true;
    root.add(hair);

    const arms = [];
    [-1, 1].forEach(function (side) {
      const arm = capsule(0.105, 0.35, torsoMaterial);
      arm.position.set(side * 0.37, 1.16, 0);
      arm.rotation.z = side * -0.1;
      arm.castShadow = true;
      root.add(arm);
      arms.push(arm);
    });

    const legs = [];
    [-1, 1].forEach(function (side) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.15, 0.78, 0);
      const leg = capsule(0.14, 0.42, trouserMaterial);
      leg.position.y = -0.32;
      leg.castShadow = true;
      legPivot.add(leg);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.38), shoeMaterial);
      shoe.position.set(0, -0.68, -0.08);
      shoe.castShadow = true;
      legPivot.add(shoe);
      root.add(legPivot);
      legs.push(legPivot);
    });

    root.position.copy(startPosition || new THREE.Vector3(0, 0, 0));
    scene.add(root);

    return {
      root: root,
      update: function (time, speed) {
        const stride = Math.min(speed / 4.5, 1);
        const swing = Math.sin(time * 10) * 0.62 * stride;
        legs[0].rotation.x = swing;
        legs[1].rotation.x = -swing;
        arms[0].rotation.x = -swing * 0.65;
        arms[1].rotation.x = swing * 0.65;
        torso.position.y = 1.13 + Math.abs(Math.sin(time * 10)) * 0.025 * stride;
      }
    };
  }

  return { create: create };
}());
