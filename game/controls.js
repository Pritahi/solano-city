// Handle pointer-lock look, on-foot movement, collision sliding, and follow-camera placement.
window.SolanoControls = (function () {
  'use strict';

  const PLAYER_RADIUS = 0.48;
  const GRAVITY = 24;
  const WALK_SPEED = 4.8;
  const SPRINT_SPEED = 8.2;

  function create(canvas, camera, buildings) {
    const keys = Object.create(null);
    let yaw = 0;
    let pitch = 0.22;
    let verticalSpeed = 0;
    let locked = false;
    let cameraReady = false;
    let enabled = true;
    const target = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();

    function onKeyDown(event) {
      keys[event.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].indexOf(event.code) !== -1) event.preventDefault();
    }

    function onKeyUp(event) {
      keys[event.code] = false;
    }

    function onPointerLockChange() {
      locked = document.pointerLockElement === canvas;
    }

    function onMouseMove(event) {
      if (!locked) return;
      yaw -= event.movementX * 0.0022;
      pitch = Math.max(-0.08, Math.min(0.82, pitch + event.movementY * 0.0018));
    }

    canvas.addEventListener('click', function () {
      if (!locked && canvas.requestPointerLock) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', function () {
      Object.keys(keys).forEach(function (key) { keys[key] = false; });
    });

    function collides(x, z, radius) {
      for (let index = 0; index < buildings.length; index += 1) {
        const box = buildings[index];
        if (x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ) return true;
      }
      return false;
    }

    function segmentBoxDistance(origin, direction, length, box) {
      let near = 0;
      let far = length;
      const axes = [
        [origin.x, direction.x, box.minX - 0.55, box.maxX + 0.55],
        [origin.y, direction.y, box.minY - 0.15, box.maxY + 0.15],
        [origin.z, direction.z, box.minZ - 0.55, box.maxZ + 0.55]
      ];
      for (let axis = 0; axis < axes.length; axis += 1) {
        const values = axes[axis];
        if (Math.abs(values[1]) < 0.00001) {
          if (values[0] < values[2] || values[0] > values[3]) return null;
          continue;
        }
        let first = (values[2] - values[0]) / values[1];
        let second = (values[3] - values[0]) / values[1];
        if (first > second) {
          const swap = first;
          first = second;
          second = swap;
        }
        near = Math.max(near, first);
        far = Math.min(far, second);
        if (near > far) return null;
      }
      return near >= 0 && near <= length ? near : null;
    }

    function update(deltaTime, character, time) {
      if (!enabled) return;
      const dt = Math.min(deltaTime, 0.05);
      const position = character.root.position;

      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      let inputX = 0;
      let inputZ = 0;
      if (keys.KeyW || keys.ArrowUp) { inputX += forwardX; inputZ += forwardZ; }
      if (keys.KeyS || keys.ArrowDown) { inputX -= forwardX; inputZ -= forwardZ; }
      if (keys.KeyD || keys.ArrowRight) { inputX += rightX; inputZ += rightZ; }
      if (keys.KeyA || keys.ArrowLeft) { inputX -= rightX; inputZ -= rightZ; }

      const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ);
      if (inputLength > 0) {
        inputX /= inputLength;
        inputZ /= inputLength;
        character.root.rotation.y = yaw;
      }
      const sprinting = keys.ShiftLeft || keys.ShiftRight;
      const speed = inputLength ? (sprinting ? SPRINT_SPEED : WALK_SPEED) : 0;
      const moveX = inputX * speed * dt;
      const moveZ = inputZ * speed * dt;

      // Resolve each axis independently to slide along building walls without entering them.
      if (!collides(position.x + moveX, position.z, PLAYER_RADIUS)) position.x += moveX;
      if (!collides(position.x, position.z + moveZ, PLAYER_RADIUS)) position.z += moveZ;

      verticalSpeed -= GRAVITY * dt;
      position.y += verticalSpeed * dt;
      if (position.y < 0) {
        position.y = 0;
        verticalSpeed = 0;
      }
      character.update(time, speed);

      target.set(position.x, position.y + 1.22, position.z);
      const horizontalDistance = 6.2 * Math.cos(pitch);
      cameraOffset.set(Math.sin(yaw) * horizontalDistance, 1.9 + Math.sin(pitch) * 2.4, Math.cos(yaw) * horizontalDistance);
      desiredCamera.copy(target).add(cameraOffset);

      const ray = desiredCamera.clone().sub(target);
      const distance = ray.length();
      ray.normalize();
      let allowedDistance = distance;
      for (let index = 0; index < buildings.length; index += 1) {
        const hit = segmentBoxDistance(target, ray, distance, buildings[index]);
        if (hit !== null) allowedDistance = Math.min(allowedDistance, Math.max(1.15, hit - 0.28));
      }
      desiredCamera.copy(target).addScaledVector(ray, allowedDistance);

      const blend = 1 - Math.exp(-8 * dt);
      if (!cameraReady) {
        camera.position.copy(desiredCamera);
        cameraReady = true;
      } else {
        camera.position.lerp(desiredCamera, blend);
      }
      camera.lookAt(target);
    }

    return {
      update: update,
      setEnabled: function (value) { enabled = Boolean(value); },
      isEnabled: function () { return enabled; }
    };
  }

  return { create: create };
}());
