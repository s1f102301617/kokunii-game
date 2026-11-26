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
