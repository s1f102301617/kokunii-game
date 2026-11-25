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
  function updateScreen(parts) {
    ctx.fillStyle = '#0c2119';
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.strokeStyle = '#779b64';
    ctx.strokeRect(17, 18, 350, 215);
    ctx.fillStyle = '#c3e8a6';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('FIELD TERMINAL', 31, 68);
    ctx.font = '21px monospace';
    ctx.fillText('MODULES  ' + parts + '/4', 31, 122);
    ctx.fillText(parts >= 4 ? 'LINK READY' : 'STANDBY', 31, 184);
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
