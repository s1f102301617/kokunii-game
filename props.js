function makeForestProps(scene) {
  const standard = (color, roughness = .88, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const metal = standard(0x403c38, .76, .52);
  const rubber = standard(0x1a1a19);
  const rust = standard(0x683725, .98);
  const glass = standard(0x303e48, .28, .33);
  const glassCrack = new THREE.LineBasicMaterial({ color: 0x8b9595 });
  const armor = standard(0x403b31, .93);
  function add(parent, geo, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const box = (parent, mat, size, at) => add(parent, new THREE.BoxGeometry(...size), mat, ...at);
  function panel(parent, mat, a, b, c, d) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    geo.computeVertexNormals();
    return add(parent, geo, mat);
  }
  function loft(parent, mat, sections) {
    const geo = new THREE.BufferGeometry();
    const points = sections.flatMap(([z, w, base, top]) => [
      -w, base, z, w, base, z, w, top, z, -w, top, z
    ]);
    const faces = [0, 3, 2, 0, 2, 1];
    for (let i = 1; i < sections.length; i++) {
      const prev = (i - 1) * 4, next = i * 4;
      for (let j = 0; j < 4; j++) {
        const a = prev + j, b = prev + (j + 1) % 4;
        const c = next + (j + 1) % 4, d = next + j;
        faces.push(a, b, c, a, c, d);
      }
    }
    const last = (sections.length - 1) * 4;
    faces.push(last, last + 1, last + 2, last, last + 2, last + 3);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geo.setIndex(faces);
    const facesGeo = geo.toNonIndexed();
    facesGeo.computeVertexNormals();
    geo.dispose();
    const surface = mat.clone();
    surface.side = THREE.DoubleSide;
    return add(parent, facesGeo, surface);
  }
  function line(parent, coords, material) {
    const geo = new THREE.BufferGeometry().setFromPoints(coords.map(point => new THREE.Vector3(...point)));
    parent.add(new THREE.Line(geo, material));
  }

  const wreck = new THREE.Group();
  wreck.position.set(-25, .07, 15);
  wreck.rotation.set(0, .55, .065);
  scene.add(wreck);
  const paint = standard(0x613927, .77, .21);
  const sides = standard(0x2f2c26, .98);
  const body = loft(wreck, paint, [
    [-2.38, .85, .37, .73], [-1.95, 1.05, .41, .88], [-.65, 1.05, .41, .96],
    [.84, 1.04, .42, .96], [1.8, 1.04, .4, .83], [2.14, .91, .43, .72]
  ]);
  body.name = 'Wrecked station wagon';
  loft(wreck, metal, [[-1.14, .88, .87, .98], [-.56, .78, .96, 1.55], [.8, .76, .96, 1.52], [1.55, .86, .8, 1.04]]);
  box(wreck, paint, [1.59, .07, 1.39], [0, 1.56, .11]);
  const windscreen = panel(wreck, glass, [-.85,.98,-1.14], [.85,.98,-1.14], [.75,1.49,-.58], [-.75,1.49,-.58]);
  windscreen.material.side = THREE.DoubleSide;
  line(wreck, [[.29,1.13,-.99],[-.1,1.26,-.86],[-.38,1.36,-.76]], glassCrack);
  line(wreck, [[-.1,1.26,-.86],[-.16,1.46,-.66]], glassCrack);
  for (const side of [-1, 1]) {
    for (const [a, b] of [[-.55, .04], [.17, .75]]) {
      panel(wreck, glass, [side*.84,1.01,a], [side*.84,1.01,b], [side*.77,1.43,b], [side*.77,1.43,a]);
    }
    for (const z of [-1.45, 1.35]) {
      const wheel = add(wreck, new THREE.CylinderGeometry(.43, .43, .22, 16), rubber, side * .99, .42, z);
      wheel.rotation.z = Math.PI / 2;
      const hub = add(wreck, new THREE.CylinderGeometry(.22,.22,.04,12), metal, side * 1.12, .42, z);
      hub.rotation.z = Math.PI / 2;
    }
    for (let i = 0; i < 7; i++) {
      const z = -1.3 + i * .44;
      const y = .52 + ((i * 11) % 5) * .073;
      box(wreck, i % 3 === 0 ? sides : rust, [.014, .04 + (i % 4) * .03, .16 + (i % 3) * .07], [side * 1.05, y, z]);
    }
    box(wreck, standard(0x928878, .39), [.36, .18, .07], [side * .62, .69, -2.35]);
    box(wreck, standard(0x723b32, .55), [.32, .12, .05], [side * .67, .64, 2.14]);
    box(wreck, metal, [.18, .04, .034], [side * 1.06, .86, .41]);
  }
  for (const z of [-2.39, 2.14]) box(wreck, metal, [1.78, .14, .16], [0, .51, z]);
  box(wreck, sides, [.7, .19, .04], [0, .68, -2.37]);
  box(wreck, armor, [.37, .12, .05], [0, .60, 2.24]);

  const terminal = new THREE.Group();
  terminal.position.set(0, 0, -83.55);
  terminal.name = 'Tunnel terminal';
  scene.add(terminal);
  box(terminal, armor, [2.55, .13, 1.15], [0, 1.01, .22]);
  box(terminal, metal, [2.53, .09, .08], [0, .94, .79]);
  for (const x of [-1.07, 1.07]) {
    for (const z of [-.17, .65]) box(terminal, metal, [.08, .97, .08], [x, .49, z]);
    box(terminal, metal, [.08, .076, .88], [x, .32, .24]);
  }
  loft(terminal, armor, [[-.52, .35, 1.14, 1.65], [-.34, .46, 1.12, 1.8], [.05, .48, 1.11, 1.79]]);
  box(terminal, metal, [.57, .08, .42], [0, 1.08, -.06]);
  box(terminal, rubber, [.84, .54, .035], [0, 1.46, .074]);
  const screen = document.createElement('canvas');
  screen.width = 384;
  screen.height = 252;
  const ctx = screen.getContext('2d');
  const screenTexture = new THREE.CanvasTexture(screen);
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  add(terminal, new THREE.PlaneGeometry(.73, .46), screenMaterial, 0, 1.46, .098);
  const green = new THREE.PointLight(0x81bf91, .66, 3);
  green.position.set(0, 1.56, .35);
  terminal.add(green);
  box(terminal, armor, [.22, .34, .67], [.84, 1.24, -.05]);
  for (let i = 0; i < 4; i++) box(terminal, rubber, [.13,.014,.02], [.84, 1.18 + i*.046, .29]);
  box(terminal, standard(0x777364), [.62, .045, .24], [0, 1.10, .54]);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 11; col++) box(terminal, rubber, [.041,.012,.036], [-.25 + col*.05, 1.13, .45 + row*.05]);
  }
  for (const coords of [
    [[.32,1.22,-.4],[.67,1.07,-.35],[.9,1.07,.06]],
    [[.14,1.12,.45],[.37,1.07,.37],[.74,1.07,-.05]],
    [[1.13, .98, -.22], [1.08,.56,-.3],[.84,.11,.09],[1.25,.035,.35]]
  ]) {
    const wire = new THREE.CatmullRomCurve3(coords.map(p => new THREE.Vector3(...p)));
    add(terminal, new THREE.TubeGeometry(wire, 12, .012, 4, false), rubber);
  }
  function updateScreen(parts, progress = null) {
    ctx.fillStyle = '#0c2119';
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.strokeStyle = '#779b64';
    ctx.strokeRect(17, 18, 350, 215);
    ctx.fillStyle = '#c3e8a6';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('FIELD TERMINAL', 31, 68);
    ctx.font = '21px monospace';
    ctx.fillText('MODULES  ' + parts + '/4', 31, 122);
    ctx.fillText(progress !== null ? 'SYNC ' + progress + '%' : parts >= 4 ? 'LINK READY' : 'STANDBY', 31, 184);
    for (let y = 0; y < screen.height; y += 4) {
      ctx.fillStyle = '#04120c46';
      ctx.fillRect(0, y, screen.width, 1);
    }
    screenTexture.needsUpdate = true;
    green.intensity = parts >= 4 ? 1.4 : .66;
  }
  updateScreen(0);
  return { target: terminal.position, updateScreen };
}

function buildRecoveryScenery(scene) {
  const material = (color, roughness = .9, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const steel = material(0x6a6a61, .63, .35);
  const black = material(0x242820);
  const bone = material(0xa9a185, .7);
  const copper = material(0x955a32, .58, .3);
  const board = material(0x365843);
  const brick = [0x474a3e, 0x56584a, 0x5c5848, 0x41463d].map(color => material(color));
  const lamp = new THREE.MeshStandardMaterial({color:0xc8a568, emissive:0xe3a958, emissiveIntensity:.64, roughness:.55});
  const moss = material(0x4b5139);
  function mesh(group, geo, mat, x,y,z) {
    const item = new THREE.Mesh(geo,mat);
    item.position.set(x,y,z);
    group.add(item);
    return item;
  }
  const box = (group, mat, w,h,d,x,y,z) => mesh(group,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const well = new THREE.Group();
  well.position.set(30,0,-10);
  scene.add(well);
  for (let row=0;row<4;row++) {
    for (let segment=0;segment<14;segment++) {
      const angle = (segment + row*.5) * Math.PI/7;
      const stone = box(well,brick[(segment*5+row)%brick.length],.61,.24,.35,Math.cos(angle)*1.36,.14+row*.245,Math.sin(angle)*1.36);
      stone.rotation.y = Math.PI/2-angle;
    }
  }
  mesh(well,new THREE.TorusGeometry(1.36,.18,6,24),brick[2],0,1.03,0).rotation.x=Math.PI/2;
  mesh(well,new THREE.CircleGeometry(1.22,24),black,0,.1,0).rotation.x=-Math.PI/2;
  box(well,steel,.13,1.66,.13,-1.12,.83,0);
  box(well,steel,.13,1.66,.13,1.12,.83,0);
  box(well,steel,2.35,.11,.11,0,1.63,0);
  box(well,copper,.035,.55,.035,-.31,1.33,.03);
  mesh(well,new THREE.CylinderGeometry(.21,.16,.29,9,1,true),steel,-.31,.93,.03);
  for (let i=0;i<11;i++) {
    const angle = i * 1.7;
    const patch = box(well,moss,.19,.025,.1,Math.cos(angle)*1.41,1.186,Math.sin(angle)*1.41);
    patch.rotation.y = angle;
  }

  function makeItem(kind, variant) {
    const prop = new THREE.Group();
    if (kind === 'battery') {
      mesh(prop,new THREE.CylinderGeometry(.15,.15,.46,12),bone,0,0,0);
      mesh(prop,new THREE.CylinderGeometry(.153,.153,.13,12),black,0,-.125,0);
      mesh(prop,new THREE.CylinderGeometry(.06,.06,.045,10),steel,0,.25,0);
      box(prop,copper,.19,.13,.022,0,.03,.146);
    } else if (variant % 2 === 0) {
      box(prop,board,.53,.075,.34,0,0,0);
      box(prop,steel,.23,.074,.22,.04,.074,-.025);
      box(prop,black,.16,.052,.12,-.13,.059,.012);
      for (let i=0;i<7;i++) box(prop,copper,.025,.02,.095,-.21+.065*i,.049,.12);
      box(prop,lamp,.055,.028,.046,.19,.054,-.087);
    } else {
      box(prop,black,.51,.105,.31,0,0,0);
      box(prop,bone,.37,.027,.23,0,.058,-.02);
      for(const x of [-.17,0,.17]) {
        const fuse=mesh(prop,new THREE.CylinderGeometry(.056,.056,.2,9),steel,x,.103,.025);
        fuse.rotation.x=Math.PI/2;
        box(prop,copper,.075,.06,.062,x,.075,.14);
      }
      box(prop,lamp,.05,.028,.047,-.2,.065,-.105);
    }
    return prop;
  }

  function trailMarker(x,z,code) {
    const post = new THREE.Group();
    post.position.set(x,0,z);
    const face=box(post,steel,.54,.27,.06,0,1.11,0);
    face.rotation.y=x<0?.36:-.36;
    box(post,black,.083,1.22,.083,0,.61,0);
    box(post,lamp,.13,.046,.018,-.11,1.14,.037);
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#242620'; ctx.fillRect(0,0,128,64);
    ctx.strokeStyle='#a09570'; ctx.strokeRect(5,5,118,54);
    ctx.fillStyle='#bfb591'; ctx.font='29px monospace'; ctx.fillText(code,20,43);
    mesh(face,new THREE.PlaneGeometry(.49,.24),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(canvas),roughness:.9}),0,0,.031);
    scene.add(post);
  }
  return { makeItem, trailMarker };
}
