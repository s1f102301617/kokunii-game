const tunnelLayout = { mouth: -50, back: -85.5, halfWidth: 5, spring: 2 };
const railRuns = [[-48, -35], [-20, 0], [18, 35], [60, 117]];

// The road cut exposes fractured rock near the mouth, with soil and moss higher up.
function buildMountainCut(scene) {
  const vertices = [], colors = [], faces = [];
  const moss = new THREE.Color(0x303927), stone = new THREE.Color(0x666459);
  const color = new THREE.Color();
  const width = 96, depth = 28;

  for (let row = 0; row <= depth; row++) {
    const slope = row / depth;
    for (let col = 0; col <= width; col++) {
      const seed = col * 127.1 + row * 311.7;
      const jitter = Math.sin(seed) * Math.cos(seed * .71);
      const x = (col - width/2) * 2.6 + jitter * .9;
      const hillside = Math.min(1, Math.max(0, (Math.abs(x) - 5.4) / 15));
      const peaks = 18 + 6*Math.sin(x*.077) + 4*Math.sin(x*.19) + 2*Math.cos(x*.37);
      const front = -50.4 - hillside * (1.6 + 1.4 * Math.sin(x*.28));
      const strata = Math.sin(row*2.47 + x*.32 + Math.sin(x*.23)*2);
      const z = front - slope*61 + hillside * (strata*.57 + jitter*.8);
      const roof = 8.2 + (peaks*.7 + 2)*Math.sin(slope*Math.PI*.81);
      const cut = (peaks + 4)*Math.sin(slope*Math.PI*.87)**.53;
      const y = THREE.MathUtils.lerp(roof, cut, hillside) +
        (strata*.72 + jitter*.85)*hillside*Math.sin(slope*Math.PI);
      vertices.push(x, y, z);
      color.copy(stone).lerp(moss, THREE.MathUtils.clamp(slope*.95 + jitter*.28, 0, 1));
      color.multiplyScalar(.77 + strata*.13 + jitter*.14);
      colors.push(color.r, color.g, color.b);
      if (row > 0 && col > 0) {
        const i = row*(width+1) + col;
        faces.push(i-width-2, i-width-1, i, i-width-2, i, i-1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({vertexColors:true, roughness:1, flatShading:true, side:THREE.DoubleSide});
  scene.add(new THREE.Mesh(geometry, material));
}

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
  const lining = concrete.clone();
  lining.map = concrete.map.clone();
  lining.map.repeat.set(6, 1);
  lining.bumpMap = lining.map;
  wall(lining, -halfWidth-sideWidth, -halfWidth, back, portalFront, spring);
  wall(lining, halfWidth, halfWidth+sideWidth, back, portalFront, spring);
  wall(concrete, -halfWidth-.52, halfWidth+.52, back-.45, back, 7.1);
  obstacles.push(
    {minX:-22,maxX:-halfWidth,minZ:mouth,maxZ:portalFront},
    {minX:halfWidth,maxX:22,minZ:mouth,maxZ:portalFront}
  );
  // Cliff and boundary fence continue the entrance plane outside its concrete wings.
  obstacles.push(
    {minX:-130,maxX:-22,minZ:back,maxZ:mouth+.12},
    {minX:22,maxX:130,minZ:back,maxZ:mouth+.12}
  );

  function vaultSegment(radius, inner, from, to, material) {
    const vertices = [], uv = [], normals = [];
    const steps = 32;
    function point(angle, z, r) { return [Math.cos(angle)*r, spring+Math.sin(angle)*r, z]; }
    function vertex(coord, u, v, front = false) {
      vertices.push(...coord);
      uv.push(u, v);
      const height = coord[1] - spring;
      const radius = Math.hypot(coord[0],height);
      normals.push(...(front ? [0,0,1] : [-coord[0]/radius,-height/radius,0]));
    }
    for (let i=0; i<steps; i++) {
      const a = i*Math.PI/steps, b = (i+1)*Math.PI/steps;
      const u = i/steps*2.1, v = (i+1)/steps*2.1;
      const pa = point(a,from,inner), pb = point(b,from,inner);
      const qa = point(a,to,inner), qb = point(b,to,inner);
      vertex(pa,u,0); vertex(pb,v,0); vertex(qb,v,(to-from)/5.2);
      vertex(pa,u,0); vertex(qb,v,(to-from)/5.2); vertex(qa,u,(to-from)/5.2);
      const ra = point(a,to,radius), rb = point(b,to,radius);
      vertex(qa,u,0,true); vertex(qb,v,0,true); vertex(rb,v,1,true);
      vertex(qa,u,0,true); vertex(rb,v,1,true); vertex(ra,u,1,true);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals,3));
    geom.setIndex(Array.from({length:vertices.length/3}, (_, i) => i%3 === 0 ? i : i%3 === 1 ? i+1 : i-1));
    mesh(geom, material, 0,0,0);
  }

  const recess = mat(0x242824, .98);
  recess.side = THREE.DoubleSide;
  const trim = concrete.clone();
  trim.color.setHex(0xadb0a1);
  vaultSegment(halfWidth+.56, halfWidth, back, portalFront, concrete);
  vaultSegment(halfWidth+.76, halfWidth-.04, mouth-.18, portalFront+.26, trim);
  vaultSegment(halfWidth+.24, halfWidth-.08, portalFront+.24, portalFront+.34, recess);
  for (const side of [-1,1]) {
    const rock = new THREE.Shape();
    rock.moveTo(0, 6.2);
    rock.lineTo(2, 7.65);
    rock.lineTo(4.8, 7.15);
    rock.lineTo(8.6, 4.6);
    rock.lineTo(12.9, 3.55);
    rock.lineTo(16.8, 1.2);
    rock.lineTo(0, 1.2);
    rock.closePath();
    const shoulder = mesh(new THREE.ExtrudeGeometry(rock,{depth:2,bevelEnabled:false}),
      mat(0x30332b,1),side*5.74,0,mouth-2.83);
    shoulder.scale.x = side;
    box(trim, side*(halfWidth+.34), spring/2, portalFront+.13, .76, spring, .58);
    for (let tier=0; tier<6; tier++) {
      const reach = 16.4 - tier * 2.47;
      box(concrete, side*(halfWidth+.69+reach/2), .59+tier*1.19, portalFront+.12-tier*.035, reach, 1.20, .46);
    }
  }
  for (let z=mouth-3; z>back+1; z-=6) {
    vaultSegment(halfWidth, halfWidth-.035, z-.035, z+.035, recess);
    for (const side of [-1,1]) {
      box(recess, side*(halfWidth-.018), 1, z, .04, 2, .07);
      box(steel, side*4.93, 1.47, z-.45, .12, .16, .08);
      const drain = box(recess, side*4.76, .267, z-1.3, .28, .018, .45);
      for (let slot=-2; slot<=2; slot++) box(steel, drain.position.x,.28,drain.position.z+slot*.073,.24,.008,.015);
    }
  }
  const tunnelRoad = asphalt.clone();
  tunnelRoad.bumpScale = .003;
  tunnelRoad.roughness = .81;
  tunnelRoad.map = asphalt.map.clone();
  tunnelRoad.map.repeat.set(1, 4);
  tunnelRoad.bumpMap = tunnelRoad.map;
  const floor = mesh(new THREE.PlaneGeometry(halfWidth*2, mouth-back), tunnelRoad,0,.034,(mouth+back)/2);
  floor.rotation.x = -Math.PI/2;
  for (const side of [-1,1]) {
    box(gutter, side*4.79,.13,(mouth+back)/2,.38,.26,mouth-back);
    box(rust, side*4.93,1.47,(mouth+back)/2,.062,.062,mouth-back);
    box(warning, side*5.13,2.25,portalFront+.022,.48,2.4,.09);
  }
  const plaque = document.createElement('canvas');
  plaque.width = 512; plaque.height = 96;
  const ink = plaque.getContext('2d');
  ink.fillStyle = '#343c38'; ink.fillRect(0, 0, 512, 96);
  ink.strokeStyle = '#787e6d'; ink.lineWidth = 3; ink.strokeRect(8, 8, 496, 80);
  ink.fillStyle = '#b1ac91'; ink.font = 'bold 52px sans-serif'; ink.textAlign = 'center';
  ink.fillText('旧林道隧道', 256, 67);
  const sign = new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(plaque), roughness:.85});
  box(steel,0,7.86,portalFront+.05,3.95,.68,.11);
  mesh(new THREE.PlaneGeometry(3.82,.64),sign,0,7.86,portalFront+.109);
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

function buildTerminalGate(scene) {
  const z = -79.6;
  const gate = new THREE.Group();
  gate.position.z = z;
  scene.add(gate);
  const steel = new THREE.MeshStandardMaterial({color:0x444740, roughness:.83, metalness:.37});
  const rust = new THREE.MeshStandardMaterial({color:0x5f4734, roughness:.85});
  function bar(parent, material, x,y,w,h,d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    mesh.position.set(x,y,0);
    parent.add(mesh);
  }
  const leaves = [-1,1].map(side => {
    const leaf = new THREE.Group();
    leaf.position.x = side*4.94;
    for (let i=0; i<=12; i++) bar(leaf,steel,-side*i*.4,1.68,.075,3.36,.075);
    for (const y of [.14,1.24,3.28]) bar(leaf,steel,-side*2.44,y,4.9,.11,.13);
    bar(leaf,rust,-side*4.8,1.24,.24,.25,.22);
    gate.add(leaf);
    return leaf;
  });
  const lock = new THREE.Group();
  lock.position.set(0,1.13,.16);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(.105,.023,8,16),steel);
  shackle.position.y = .10;
  lock.add(shackle);
  bar(lock,rust,0,0,.25,.20,.12);
  gate.add(lock);
  return {
    wall: {minX:-5.2,maxX:5.2,minZ:z-.12,maxZ:z+.12},
    x:0, z,
    setOpening(progress) {
      lock.visible = progress === 0;
      leaves.forEach((leaf,i) => {leaf.rotation.y = (i ? -1 : 1)*progress*Math.PI/2;});
    }
  };
}
