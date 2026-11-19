// Build Solano City's warm downtown blocks, sidewalks, streets, and stucco buildings.
window.SolanoCity = (function () {
  'use strict';

  const CITY_HALF = 120;
  const ROAD_WIDTH = 10;
  const SIDEWALK_WIDTH = 3.4;
  const BLOCK_WIDTH = 26;
  const BLOCKS_PER_SIDE = 8;
  const ROAD_STEP = BLOCK_WIDTH + ROAD_WIDTH + SIDEWALK_WIDTH * 2;
  const COLORS = [
    0xc8533d, // sun-baked terracotta
    0xef705b, // coral
    0x318d8b, // turquoise
    0xd49432, // ochre
    0xf0d4a2, // warm cream
    0xd66d4e,
    0x4d9f97
  ];
  const ROOF_COLORS = [0x9e4638, 0xb85b42, 0x96734a, 0x397d78, 0xc07953, 0xd2b784];

  function material(color, roughness) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: roughness || 0.92 });
  }

  function makeBox(scene, width, height, depth, color, x, y, z, castShadow, receiveShadow) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material(color)
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow !== false;
    mesh.receiveShadow = receiveShadow !== false;
    scene.add(mesh);
    return mesh;
  }

  function addPalm(scene, x, z, scale, rotation) {
    const trunkHeight = 6.2 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.38 * scale, trunkHeight, 7),
      material(0x79503a)
    );
    trunk.position.set(x, trunkHeight / 2, z);
    trunk.rotation.z = -0.055;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    const frondMaterial = material(0x397348);
    const frondCount = 5 + Math.abs(Math.floor(x * 3 + z * 5 + rotation * 11)) % 3;
    for (let index = 0; index < frondCount; index += 1) {
      const angle = rotation + index * (Math.PI * 2 / frondCount);
      const frond = new THREE.Mesh(
        new THREE.ConeGeometry(0.72 * scale, 4.6 * scale, 5),
        frondMaterial
      );
      frond.position.set(
        x + Math.cos(angle) * 1.35 * scale,
        trunkHeight + 0.7 * scale,
        z + Math.sin(angle) * 1.35 * scale
      );
      frond.rotation.z = Math.PI / 2 - 0.34;
      frond.rotation.y = -angle;
      frond.scale.set(0.72, 1, 0.35);
      frond.castShadow = true;
      scene.add(frond);
    }
  }

  function addGroundAndStreets(scene) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY_HALF * 2 + 80, CITY_HALF * 2 + 80),
      material(0xcbb797)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.18;
    ground.receiveShadow = true;
    scene.add(ground);

    const sidewalk = material(0xc9b99d);
    const blockConcrete = material(0xcbb797);
    const firstBlock = -(BLOCKS_PER_SIDE - 1) * ROAD_STEP / 2;
    for (let blockX = 0; blockX < BLOCKS_PER_SIDE; blockX += 1) {
      for (let blockZ = 0; blockZ < BLOCKS_PER_SIDE; blockZ += 1) {
        const block = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK_WIDTH, BLOCK_WIDTH), blockConcrete);
        block.rotation.x = -Math.PI / 2;
        block.position.set(firstBlock + blockX * ROAD_STEP, -0.06, firstBlock + blockZ * ROAD_STEP);
        block.receiveShadow = true;
        scene.add(block);
      }
    }

    const asphalt = new THREE.MeshBasicMaterial({ color: 0x23232a, toneMapped: false });
    const laneMarking = new THREE.MeshBasicMaterial({ color: 0xaaa18e, toneMapped: false });
    for (let line = 0; line < BLOCKS_PER_SIDE - 1; line += 1) {
      // Streets occupy only the spaces between block centers, never the block pads.
      const center = firstBlock + (line + 0.5) * ROAD_STEP;
      const roadX = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2), asphalt);
      roadX.rotation.x = -Math.PI / 2;
      roadX.position.set(center, -0.045, 0);
      roadX.receiveShadow = true;
      scene.add(roadX);

      const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH), asphalt);
      roadZ.rotation.x = -Math.PI / 2;
      roadZ.position.set(0, -0.044, center);
      roadZ.receiveShadow = true;
      scene.add(roadZ);

      // Short, muted center dashes follow each dark street ribbon.
      for (let along = -CITY_HALF + 7; along <= CITY_HALF - 7; along += 14) {
        const dashAlongZ = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 4.2), laneMarking);
        dashAlongZ.rotation.x = -Math.PI / 2;
        dashAlongZ.position.set(center, -0.034, along);
        scene.add(dashAlongZ);

        const dashAlongX = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.2), laneMarking);
        dashAlongX.rotation.x = -Math.PI / 2;
        dashAlongX.position.set(along, -0.035, center);
        scene.add(dashAlongX);
      }

      [-1, 1].forEach(function (side) {
        const offset = side * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2);
        const walkX = new THREE.Mesh(new THREE.PlaneGeometry(SIDEWALK_WIDTH, CITY_HALF * 2), sidewalk);
        walkX.rotation.x = -Math.PI / 2;
        walkX.position.set(center + offset, -0.015, 0);
        walkX.receiveShadow = true;
        scene.add(walkX);

        const walkZ = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, SIDEWALK_WIDTH), sidewalk);
        walkZ.rotation.x = -Math.PI / 2;
        walkZ.position.set(0, -0.014, center + offset);
        walkZ.receiveShadow = true;
        scene.add(walkZ);

        const palmOffset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2;
        for (let block = 0; block < BLOCKS_PER_SIDE; block += 2) {
          const alongStreet = firstBlock + block * ROAD_STEP;
          addPalm(scene, center + side * palmOffset, alongStreet, 0.82, line * 0.55 + block * 0.3);
          addPalm(scene, alongStreet, center + side * palmOffset, 0.78, line * 0.45 + block * 0.4 + 0.6);
        }
      });
    }
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function addBuildings(scene) {
    const random = createRandom(73421);
    const blocksPerSide = BLOCKS_PER_SIDE;
    const buildingBounds = [];
    const blockIndexes = [];
    for (let index = 0; index < blocksPerSide * blocksPerSide; index += 1) blockIndexes.push(index);
    for (let index = blockIndexes.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [blockIndexes[index], blockIndexes[swap]] = [blockIndexes[swap], blockIndexes[index]];
    }

    // Each footprint stays between the sidewalk edges, leaving every street and walk open.
    const clearEdge = ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 0.45;
    const footprintLimit = Math.min(BLOCK_WIDTH, ROAD_STEP - clearEdge * 2);
    for (let index = 0; index < 52; index += 1) {
      const block = blockIndexes[index];
      const blockX = block % blocksPerSide;
      const blockZ = Math.floor(block / blocksPerSide);
      const x = firstBlockCenter() + blockX * ROAD_STEP;
      const z = firstBlockCenter() + blockZ * ROAD_STEP;
      const width = 7 + random() * Math.min(4, footprintLimit - 7);
      const depth = 7 + random() * Math.min(4, footprintLimit - 7);
      const isDowntownTower = Math.abs(x) < 58 && Math.abs(z) < 58 && random() < 0.24;
      const height = isDowntownTower ? 39 + random() * 27 : 11 + random() * 26;
      const offsetX = (random() - 0.5) * Math.max(0, footprintLimit - width);
      const offsetZ = (random() - 0.5) * Math.max(0, footprintLimit - depth);
      const body = makeBox(
        scene,
        width,
        height,
        depth,
        COLORS[Math.floor(random() * COLORS.length)],
        x + offsetX,
        height / 2,
        z + offsetZ,
        true,
        true
      );
      buildingBounds.push({
        minX: body.position.x - width / 2,
        maxX: body.position.x + width / 2,
        minY: 0,
        maxY: height + 0.5,
        minZ: body.position.z - depth / 2,
        maxZ: body.position.z + depth / 2
      });
      const roofColor = ROOF_COLORS[Math.floor(random() * ROOF_COLORS.length)];
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.12, 0.24 + random() * 0.22, depth + 0.12),
        material(roofColor)
      );
      roof.position.set(body.position.x, height + roof.geometry.parameters.height / 2, body.position.z);
      roof.castShadow = true;
      roof.receiveShadow = true;
      scene.add(roof);
    }
    return buildingBounds;
  }

  function firstBlockCenter() {
    return -(BLOCKS_PER_SIDE - 1) * ROAD_STEP / 2;
  }

  function build(scene) {
    addGroundAndStreets(scene);
    // The centered crossing is the middle gap in the block grid: x=0 and z=0.
    const middleStreet = firstBlockCenter() + (BLOCKS_PER_SIDE / 2 - 0.5) * ROAD_STEP;
    return {
      buildings: addBuildings(scene),
      streetSpawn: { x: middleStreet, z: middleStreet }
    };
  }

  return { build: build };
}());
