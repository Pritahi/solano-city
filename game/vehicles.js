// Create parked cars, drivable vehicle physics, and lightweight grid-following traffic.
window.SolanoVehicles = (function () {
  'use strict';

  const CAR_LENGTH = 4.2;
  const CAR_WIDTH = 1.9;
  const COLLISION_RADIUS = 1.05;
  const TRAFFIC_COLORS = [0xe7c17c, 0x64a7a1, 0xe98470, 0x879abd, 0xd5d0b8, 0x81a56f, 0xcf9b63, 0xb883a0];

  function makeCar(scene, color, position, rotationY, traffic) {
    const root = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.72, metalness: 0.06 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x7b9ba0, roughness: 0.35, metalness: 0.12 });
    const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x29282a, roughness: 0.96 });
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xf4df9d, emissive: 0x5b4827, roughness: 0.45 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH, 0.72, CAR_LENGTH), bodyMaterial);
    body.position.y = 0.72;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.68, 2.12), glassMaterial);
    cabin.position.set(0, 1.34, -0.12);
    cabin.castShadow = true;
    root.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.13, 1.45), bodyMaterial);
    roof.position.set(0, 1.72, -0.12);
    roof.castShadow = true;
    root.add(roof);

    const wheels = [];
    [-1, 1].forEach(function (side) {
      [-1, 1].forEach(function (axle) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.22, 10), tireMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.98, 0.42, axle * 1.35);
        wheel.castShadow = true;
        root.add(wheel);
        wheels.push(wheel);
      });
    });

    [-1, 1].forEach(function (side) {
      const headlamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), lampMaterial);
      headlamp.position.set(side * 0.59, 0.8, -CAR_LENGTH / 2 - 0.025);
      root.add(headlamp);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.17, 0.08), new THREE.MeshStandardMaterial({ color: 0xa9423b, emissive: 0x35110e }));
      tail.position.set(side * 0.6, 0.8, CAR_LENGTH / 2 + 0.025);
      root.add(tail);
    });

    root.position.set(position.x, 0, position.z);
    root.rotation.y = rotationY || 0;
    scene.add(root);
    return {
      root: root,
      wheels: wheels,
      traffic: Boolean(traffic),
      speed: 0,
      steer: 0,
      brake: 0,
      wait: 0,
      lane: 0,
      roadIndex: 0,
      direction: 1,
      axis: 'x',
      segment: 0,
      color: color
    };
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create(scene, grid, buildings, seed) {
    const random = createRandom(seed ^ 0xA51C3E2D);
    const cars = [];
    const half = grid.cityHalf - 5;
    const lanes = [-grid.roadWidth * 0.24, grid.roadWidth * 0.24];

    // Park a handful of warm red cars in curbside lanes on separate streets.
    const parkedRoads = [0, 2, 4, 6];
    parkedRoads.forEach(function (roadNumber, index) {
      const road = grid.roadCenters[roadNumber];
      const along = -half + 35 + index * 39;
      const side = index % 2 === 0 ? 1 : -1;
      const parked = makeCar(scene, 0xc94d40, { x: road + side * (grid.roadWidth * 0.32), z: along }, 0, false);
      parked.parked = true;
      parked.doorSide = side;
      cars.push(parked);
    });

    const trafficCount = 8;
    for (let index = 0; index < trafficCount; index += 1) {
      const roadIndex = Math.floor(random() * grid.roadCenters.length);
      const axis = random() < 0.5 ? 'x' : 'z';
      const direction = random() < 0.5 ? -1 : 1;
      const lane = lanes[direction > 0 ? 0 : 1];
      const along = -half + random() * half * 2;
      const road = grid.roadCenters[roadIndex];
      const position = axis === 'x' ? { x: along, z: road + lane } : { x: road + lane, z: along };
      const angle = axis === 'x' ? (direction > 0 ? -Math.PI / 2 : Math.PI / 2) : (direction > 0 ? Math.PI : 0);
      const car = makeCar(scene, TRAFFIC_COLORS[index % TRAFFIC_COLORS.length], position, angle, true);
      car.speed = 5.2 + random() * 3.1;
      car.roadIndex = roadIndex;
      car.axis = axis;
      car.direction = direction;
      car.lane = lane;
      car.segment = along;
      car.wait = random() * 2.5;
      cars.push(car);
    }

    const input = Object.create(null);
    let driving = null;
    let cameraYawOffset = 0;
    let locked = false;

    function nearestParked(position) {
      let chosen = null;
      let nearestDistance = 2.5;
      cars.forEach(function (car) {
        if (!car.parked) return;
        const dx = car.root.position.x - position.x;
        const dz = car.root.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance <= nearestDistance) {
          nearestDistance = distance;
          chosen = car;
        }
      });
      return chosen;
    }

    function keyDown(event) {
      input[event.code] = true;
      if (event.code === 'KeyE' || (driving && (event.code === 'Space' || event.code === 'KeyW' || event.code === 'KeyS'))) event.preventDefault();
    }
    function keyUp(event) { input[event.code] = false; }
    function lockChanged() { locked = document.pointerLockElement === canvas; }
    function mouseMove(event) {
      if (driving && locked) cameraYawOffset -= event.movementX * 0.002;
    }

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    document.addEventListener('pointerlockchange', lockChanged);
    document.addEventListener('mousemove', mouseMove);

    return {
      cars: cars,
      parked: cars.filter(function (car) { return car.parked; }),
      traffic: cars.filter(function (car) { return car.traffic; }),
      nearestParked: nearestParked,
      stagePlayerBesideParked: function (player, index) {
        const car = this.parked[index || 0];
        const side = car.doorSide || 1;
        player.root.position.set(car.root.position.x + side * 2.25, 0, car.root.position.z);
        player.root.rotation.y = 0;
        return car;
      },
      update: function (deltaTime, player, controls, camera) {
        const dt = Math.min(deltaTime, 0.05);
        this.updateTraffic(dt);

        // E enters the closest curbside car, or leaves the current car beside its door.
        if (input.KeyE && !this.eHeld) {
          if (driving) {
            const side = driving.doorSide || 1;
            player.root.position.set(driving.root.position.x, 0, driving.root.position.z + side * 2.25);
            player.root.rotation.y = driving.root.rotation.y;
            player.root.visible = true;
            driving = null;
            controls.setEnabled(true);
            cameraYawOffset = 0;
          } else {
            const car = nearestParked(player.root.position);
            if (car) {
              driving = car;
              player.root.visible = false;
              car.speed = 0;
              cameraYawOffset = 0;
              controls.setEnabled(false);
            }
          }
        }
        this.eHeld = Boolean(input.KeyE);

        if (!driving) return false;

        const throttle = (input.KeyW ? 1 : 0) - (input.KeyS ? 1 : 0);
        const handbrake = Boolean(input.Space);
        const directionSign = driving.speed < -0.25 ? -1 : 1;
        const steeringInput = (input.KeyA ? 1 : 0) - (input.KeyD ? 1 : 0);
        const speedLimit = input.ShiftLeft || input.ShiftRight ? 22 : 14;
        driving.speed += throttle * (throttle * driving.speed < 0 ? 18 : 11) * dt;
        driving.speed *= Math.exp(-(throttle ? (handbrake ? 1.8 : 0.42) : (handbrake ? 3.2 : 1.25)) * dt);
        driving.speed = Math.max(-7, Math.min(speedLimit, driving.speed));
        driving.steer += (steeringInput - driving.steer) * Math.min(1, dt * 7);
        const speedFactor = Math.min(Math.abs(driving.speed) / 5, 1);
        const driftFactor = handbrake ? 1.35 : 1;
        driving.root.rotation.y += driving.steer * speedFactor * driftFactor * dt * 0.8 * directionSign;

        const forwardX = -Math.sin(driving.root.rotation.y);
        const forwardZ = -Math.cos(driving.root.rotation.y);
        const nextX = driving.root.position.x + forwardX * driving.speed * dt;
        const nextZ = driving.root.position.z + forwardZ * driving.speed * dt;
        const radius = 1.18;
        if (!this.collides(nextX, nextZ, radius)) {
          driving.root.position.x = nextX;
          driving.root.position.z = nextZ;
        } else {
          const canSlideX = !this.collides(nextX, driving.root.position.z, radius);
          const canSlideZ = !this.collides(driving.root.position.x, nextZ, radius);
          if (canSlideX) driving.root.position.x = nextX;
          if (canSlideZ) driving.root.position.z = nextZ;
          driving.speed *= -0.12;
        }
        driving.wheels.forEach(function (wheel) { wheel.rotation.x += driving.speed * dt * 0.9; });

        const target = driving.root.position.clone().add(new THREE.Vector3(0, 1.05, 0));
        const cameraAngle = driving.root.rotation.y + cameraYawOffset;
        const cameraOffset = new THREE.Vector3(Math.sin(cameraAngle) * 8.3, 3.6, Math.cos(cameraAngle) * 8.3);
        const desired = target.clone().add(cameraOffset);
        const ray = desired.clone().sub(target);
        const distance = ray.length();
        ray.normalize();
        let allowed = distance;
        for (let index = 0; index < buildings.length; index += 1) {
          const hit = rayBoxDistance(target, ray, distance, buildings[index]);
          if (hit !== null) allowed = Math.min(allowed, Math.max(1.4, hit - 0.35));
        }
        desired.copy(target).addScaledVector(ray, allowed);
        camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
        camera.lookAt(target);
        return true;
      },
      collides: function (x, z, radius) {
        return buildings.some(function (box) {
          return x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ;
        });
      },
      setCamera: function (camera, target) { camera.position.copy(target); camera.lookAt(new THREE.Vector3(target.x, target.y + 1, target.z)); },
      updateTraffic: function (deltaTime) {
        const dt = Math.min(deltaTime, 0.05);
        this.traffic.forEach(function (car) {
          if (car.wait > 0) {
            car.wait = Math.max(0, car.wait - dt);
            return;
          }
          car.segment += car.direction * car.speed * dt;
          const road = grid.roadCenters[car.roadIndex];
          if (car.segment >= half) {
            car.segment = half;
            car.wait = 0.6 + random() * 1.8;
            car.direction *= -1;
            car.lane = lanes[car.direction > 0 ? 0 : 1];
          } else if (car.segment <= -half) {
            car.segment = -half;
            car.wait = 0.6 + random() * 1.8;
            car.direction *= -1;
            car.lane = lanes[car.direction > 0 ? 0 : 1];
          } else {
            const nearestIntersection = grid.roadCenters.reduce(function (nearest, crossing) {
              return Math.abs(crossing - car.segment) < Math.abs(crossing - nearest) ? crossing : nearest;
            }, grid.roadCenters[0]);
            const atIntersection = Math.abs(nearestIntersection - car.segment) < car.speed * dt + 0.28;
            if (atIntersection && car.lastIntersection !== nearestIntersection) {
              car.lastIntersection = nearestIntersection;
              car.wait = 0.5 + random() * 1.4;
            } else if (!atIntersection) {
              car.lastIntersection = null;
            }
          }

          const location = car.axis === 'x'
            ? { x: car.segment, z: road + car.lane }
            : { x: road + car.lane, z: car.segment };
          car.root.position.x = location.x;
          car.root.position.z = location.z;
          if (car.axis === 'x') car.root.rotation.y = car.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
          else car.root.rotation.y = car.direction > 0 ? Math.PI : 0;
          car.wheels.forEach(function (wheel) { wheel.rotation.x += car.direction * dt * 4; });
        });
      }
    };
  }

  function rayBoxDistance(origin, direction, length, box) {
    let near = 0;
    let far = length;
    const axes = [
      [origin.x, direction.x, box.minX - 0.7, box.maxX + 0.7],
      [origin.y, direction.y, box.minY - 0.2, box.maxY + 0.2],
      [origin.z, direction.z, box.minZ - 0.7, box.maxZ + 0.7]
    ];
    for (let index = 0; index < axes.length; index += 1) {
      const axis = axes[index];
      if (Math.abs(axis[1]) < 0.00001) {
        if (axis[0] < axis[2] || axis[0] > axis[3]) return null;
        continue;
      }
      let start = (axis[2] - axis[0]) / axis[1];
      let end = (axis[3] - axis[0]) / axis[1];
      if (start > end) { const swap = start; start = end; end = swap; }
      near = Math.max(near, start);
      far = Math.min(far, end);
      if (near > far) return null;
    }
    return near >= 0 && near <= length ? near : null;
  }

  return { create: create, makeCar: makeCar, carLength: CAR_LENGTH, carWidth: CAR_WIDTH, collisionRadius: COLLISION_RADIUS };
}());
