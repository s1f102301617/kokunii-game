const tunnelLayout = { mouth: -50, back: -85.5, halfWidth: 5, spring: 2 };
const railRuns = [[-48, -35], [-20, 0], [18, 35], [60, 117]];

function buildRoadStructures(scene, concrete, asphalt, warning) {
  const { mouth, back, halfWidth, spring } = tunnelLayout;
  const obstacles = [];
  const mat = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const steel = mat(0x8f9183, .67, .38);
  const rust = mat(0x493223, .94, .15);
  const gutter = mat(0x30332d, .93);
  const marker = new THREE.MeshBasicMaterial({color:0xc6b573});
  const amber = new THREE.MeshBasicMaterial({color:0xffa75a});
  function mesh(geometry, material, x, y, z) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    scene.add(item);
    return item;
  }
  function box(material, x, y, z, w, h, d) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
  }
  function wall(material, minX, maxX, minZ, maxZ, height) {
    obstacles.push({minX, maxX, minZ, maxZ});
    box(material, (minX + maxX) / 2, height / 2, (minZ + maxZ) / 2, maxX - minX, height, maxZ - minZ);
  }

  for (const [start, end] of railRuns) {
    for (const side of [-1, 1]) {
      const x = side * 5.2;
      obstacles.push({minX:x-.17, maxX:x+.17, minZ:start, maxZ:end});
      // Folded steel, with a distinct raised top and lower lip.
      for (const row of [{ y:.63, x:0, w:.17, h:.13 }, { y:.80, x:-.05, w:.24, h:.18 }, { y:.91, x:0, w:.17, h:.08 }]) {
        box(steel, x + side * row.x, row.y, (start + end) / 2, row.w, row.h, end - start);
      }
      for (let z = start + .15; z < end; z += 4.4) {
        box(rust, x + side * .15, .49, z, .12, .98, .14);
        box(rust, x + side * .15, .04, z, .25, .08, .25);
        box(marker, x - side * .155, .86, z, .018, .11, .22);
      }
      for (const endZ of [start + .08, end - .08]) {
        box(rust, x, .74, endZ, .29, .35, .16);
      }
    }
  }

  // The portal's visible opening and its collision use the same inner width.
  const sideWidth = .52;
  const portalFront = mouth + .45;
  wall(concrete, -halfWidth-sideWidth, -halfWidth, back, portalFront, spring);
  wall(concrete, halfWidth, halfWidth+sideWidth, back, portalFront, spring);
  wall(concrete, -halfWidth-.52, halfWidth+.52, back-.45, back, 7.1);
  wall(concrete, -22, -halfWidth, mouth, portalFront, 7.7);
  wall(concrete, halfWidth, 22, mouth, portalFront, 7.7);
  // Cliff and boundary fence continue the entrance plane outside its concrete wings.
  obstacles.push(
    {minX:-130,maxX:-22,minZ:back,maxZ:mouth+.12},
    {minX:22,maxX:130,minZ:back,maxZ:mouth+.12}
  );

  function vaultSegment(radius, inner, from, to, material) {
    const vertices = [], uv = [];
    const steps = 24;
    function point(angle, z, r) { return [Math.cos(angle)*r, spring+Math.sin(angle)*r, z]; }
    function vertex(coord, u, v) { vertices.push(...coord); uv.push(u, v); }
    for (let i=0; i<steps; i++) {
      const a = i*Math.PI/steps, b = (i+1)*Math.PI/steps;
      const u = i/steps*3, v = (i+1)/steps*3;
      const pa = point(a,from,inner), pb = point(b,from,inner);
      const qa = point(a,to,inner), qb = point(b,to,inner);
      vertex(pa,u,0); vertex(pb,v,0); vertex(qb,v,(to-from)/8);
      vertex(pa,u,0); vertex(qb,v,(to-from)/8); vertex(qa,u,(to-from)/8);
      const ra = point(a,to,radius), rb = point(b,to,radius);
      vertex(qa,u,0); vertex(qb,v,0); vertex(rb,v,1);
      vertex(qa,u,0); vertex(rb,v,1); vertex(ra,u,1);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    geom.computeVertexNormals();
    mesh(geom, material, 0,0,0);
  }

  vaultSegment(halfWidth+.56, halfWidth, back, portalFront, concrete);
  for (let z=mouth-3; z>back+1; z-=6) {
    vaultSegment(halfWidth, halfWidth-.18, z-.11, z+.11, concrete);
    for (const side of [-1,1]) box(gutter, side*(halfWidth-.04), 1, z, .13, 2, .22);
  }
  const tunnelRoad = asphalt.clone();
  tunnelRoad.map = asphalt.map.clone();
  tunnelRoad.map.repeat.set(1, 4);
  tunnelRoad.bumpMap = tunnelRoad.map;
  const floor = mesh(new THREE.PlaneGeometry(halfWidth*2, mouth-back), tunnelRoad,0,.034,(mouth+back)/2);
  floor.rotation.x = -Math.PI/2;
  for (const side of [-1,1]) {
    box(gutter, side*4.79,.13,(mouth+back)/2,.38,.26,mouth-back);
    box(rust, side*4.93,1.2,(mouth+back)/2,.055,.055,mouth-back);
    box(warning, side*5.13,2.25,portalFront+.022,.48,2.4,.09);
  }
  box(steel,0,7.52,portalFront+.05,4.8,.54,.11);
  for (const z of [mouth+.15,-57.5,-68,-78.5]) {
    const x = z === mouth+.15 ? 3.8 : -4.71;
    box(rust,x,3.1,z,.42,.40,.32);
    box(amber,x,3.09,z+.17,.30,.17,.058);
    const lamp = new THREE.PointLight(0xe79957,z === mouth+.15 ? 2 : 1.4,13);
    lamp.position.set(x*.93,2.96,z+.28);
    scene.add(lamp);
  }
  return obstacles;
}

// Sweep both coordinate axes separately so blocked movement slides along a wall.
function sweepRoadWalls(x, z, destX, destZ, obstacles, radius = .35) {
  for (const wall of obstacles) {
    if (z <= wall.minZ-radius || z >= wall.maxZ+radius) continue;
    const low = wall.minX-radius, high = wall.maxX+radius;
    if (x <= low && destX > low) destX = low;
    if (x >= high && destX < high) destX = high;
  }
  for (const wall of obstacles) {
    if (destX <= wall.minX-radius || destX >= wall.maxX+radius) continue;
    const low = wall.minZ-radius, high = wall.maxZ+radius;
    if (z <= low && destZ > low) destZ = low;
    if (z >= high && destZ < high) destZ = high;
  }
  return [destX, destZ];
}
