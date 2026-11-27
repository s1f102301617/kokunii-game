// Two-dimensional sight test against the same solid walls used for movement.
function pathOccluded(x, z, tx, tz, walls, trees) {
  const dx = tx - x, dz = tz - z;
  for (const wall of walls) {
    let first = 0, last = 1;
    for (const [origin, delta, low, high] of [
      [x, dx, wall.minX, wall.maxX],
      [z, dz, wall.minZ, wall.maxZ]
    ]) {
      if (Math.abs(delta) < 1e-7) {
        if (origin < low || origin > high) { first = 2; break; }
      } else {
        const a = (low - origin) / delta, b = (high - origin) / delta;
        first = Math.max(first, Math.min(a, b));
        last = Math.min(last, Math.max(a, b));
      }
    }
    if (first <= last) return true;
  }
  const length = dx * dx + dz * dz;
  if (length === 0) return false;
  for (const tree of trees) {
    const progress = ((tree.x - x) * dx + (tree.z - z) * dz) / length;
    if (progress <= .04 || progress >= .96) continue;
    const radius = tree.r * .66;
    if ((x + progress * dx - tree.x) ** 2 + (z + progress * dz - tree.z) ** 2 < radius * radius) return true;
  }
  return false;
}

function updatePursuit(memory, {dt, visible, heard, impact, x, z, reached}) {
  if (visible) {
    memory.state = 'C';
    memory.timer = 1.7;
    memory.x = x;
    memory.z = z;
  } else if (memory.state === 'C') {
    memory.timer -= dt;
    if (memory.timer <= 0) {
      memory.state = 'I';
      memory.timer = 5;
    }
  } else if (impact) {
    memory.state = 'I';
    memory.timer = 18;
    memory.x = impact.x;
    memory.z = impact.z;
  } else if (heard) {
    memory.state = 'I';
    memory.timer = 5.5;
    memory.x = x;
    memory.z = z;
  } else if (memory.state === 'I') {
    memory.timer -= dt * (reached ? 2 : 1);
    if (memory.timer <= 0) memory.state = 'P';
  }
  return memory.state;
}

// Expand physical obstacles by the creature's clearance for route selection.
function pursuitObstacles(walls, objects) {
  return [...walls.map(wall => ({
    minX: wall.minX - .46, maxX: wall.maxX + .46,
    minZ: wall.minZ - .46, maxZ: wall.maxZ + .46
  })), ...objects.map(({x, z, r}) => ({
    minX: x-r-.46, maxX: x+r+.46, minZ: z-r-.46, maxZ: z+r+.46
  }))];
}

function pursuitDetour(x, z, tx, tz, obstacles) {
  const blockers = obstacles.filter(wall => pathOccluded(x, z, tx, tz, [wall], []));
  if (!blockers.length) return null;
  let best = null, bestCost = Infinity;
  for (const wall of blockers) {
    for (const px of [wall.minX-.18, wall.maxX+.18]) {
      for (const pz of [wall.minZ-.18, wall.maxZ+.18]) {
        const distance = Math.hypot(px-x,pz-z);
        if (distance < .4) continue;
        const cost = distance + Math.hypot(tx-px,tz-pz);
        if (cost >= bestCost || pathOccluded(x,z,px,pz,obstacles,[])) continue;
        best = {x:px,z:pz};
        bestCost = cost;
      }
    }
  }
  return best;
}
