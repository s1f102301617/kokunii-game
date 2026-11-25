/* Procedural scenery. The interactive collision layout stays in game.js. */
function buildForest(scene, trees) {
  let seed = 119617;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const range = (low, high) => low + (high - low) * random();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x514235, roughness: 1, vertexColors: true });
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x496354, roughness: .98, vertexColors: true, side: THREE.DoubleSide });
  const transform = new THREE.Object3D();
  const vertical = new THREE.Vector3(0, 1, 0);
  const unitBranch = new THREE.CylinderGeometry(.43, 1, 1, 5, 1, true).toNonIndexed();
  const variants = Array.from({ length: 10 }, () => []);
  trees.forEach((tree, index) => {
    const distant = Math.abs(tree.x) > 62 || tree.z < -48 || tree.z > 100;
    variants[index % 5 + (distant ? 5 : 0)].push(tree);
  });

  function geometry(positions, colors) {
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mesh.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mesh.computeVertexNormals();
    return mesh;
  }

  function buildVariant(variant, distant) {
    const trunk = [], barkColors = [], foliage = [], needleColors = [];
    const height = range(9, 13);
    const lean = range(-.8, .8);
    const centerAt = y => new THREE.Vector3(lean * (y / height) ** 1.4, y, .18 * Math.sin(y));
    function limb(start, end, radius) {
      const delta = end.clone().sub(start);
      transform.position.copy(start).addScaledVector(delta, .5);
      transform.quaternion.setFromUnitVectors(vertical, delta.clone().normalize());
      transform.scale.set(radius, delta.length(), radius);
      transform.updateMatrix();
      const coords = unitBranch.attributes.position;
      for (let i = 0; i < coords.count; i++) {
        const node = new THREE.Vector3().fromBufferAttribute(coords, i).applyMatrix4(transform.matrix);
        trunk.push(node.x, node.y, node.z);
        const gray = .57 + .4 * (i % 7) / 6;
        barkColors.push(gray, gray, gray);
      }
    }
    function needleTriangle(a, b, c, tone) {
      foliage.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      needleColors.push(tone * .62, tone * .77, tone * .71, tone, tone, tone * .91, tone * .75, tone * .92, tone * .82);
    }
    const firstFork = variant === 0 ? 2.4 : 3.2;
    limb(centerAt(0), centerAt(firstFork), .39);
    limb(centerAt(firstFork), centerAt(height * .70), .26);
    limb(centerAt(height * .70), centerAt(height), .13);
    for (let root = 0; root < (distant ? 0 : 4); root++) {
      const angle = root * Math.PI / 2 + variant;
      const tip = new THREE.Vector3(Math.cos(angle) * .85, .05, Math.sin(angle) * .85);
      limb(centerAt(.35), tip, .16);
    }
    const levels = distant ? 4 : 6;
    const arms = distant ? 3 : 5;
    const twigs = distant ? 2 : 3;
    for (let level = 0; level < levels; level++) {
      const y = firstFork + level * (height - firstFork) / (levels + .4);
      const origin = centerAt(y);
      const branchLength = (1 - level / (levels + .8)) * range(2.0, 3.0);
      for (let arm = 0; arm < arms; arm++) {
        const angle = arm * Math.PI * 2 / arms + level * .62 + range(-.17, .17);
        const forward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const sideways = new THREE.Vector3(-forward.z, 0, forward.x);
        const length = branchLength * range(.72, 1.23);
        const tip = origin.clone().addScaledVector(forward, length);
        tip.y += range(-.45, .26);
        if (!distant && level < 4) limb(origin, tip, .065 - level * .01);
        for (let twig = 1; twig <= twigs; twig++) {
          const node = origin.clone().lerp(tip, twig / (twigs + 1));
          const tipWidth = length * (.3 - twig * .04);
          const left = node.clone().addScaledVector(sideways, tipWidth).addScaledVector(forward, length * .28);
          const right = node.clone().addScaledVector(sideways, -tipWidth * range(.65, 1.15)).addScaledVector(forward, length * .27);
          left.y -= range(.1, .42);
          right.y -= range(.1, .42);
          const crown = node.clone().addScaledVector(forward, length * .37);
          crown.y += range(.04, .32);
          const tone = range(.60, .99);
          needleTriangle(node, left, crown, tone);
          needleTriangle(node, crown, right, tone * .82);
          if (!distant && twig !== twigs) needleTriangle(left, right, crown, tone * .73);
        }
      }
    }
    return [geometry(trunk, barkColors), geometry(foliage, needleColors)];
  }

  for (let variant = 0; variant < variants.length; variant++) {
    const group = variants[variant];
    const meshes = buildVariant(variant % 5, variant >= 5);
    for (const [index, material] of [trunkMaterial, foliageMaterial].entries()) {
      const mesh = new THREE.InstancedMesh(meshes[index], material, group.length);
      group.forEach(({ x, z, scale, yaw }, instance) => {
        const height = scale * (0.82 + ((instance * 13 + variant * 17) % 21) / 50);
        transform.position.set(x, 0, z);
        transform.rotation.set(0, yaw, 0);
        transform.scale.set(scale, height, scale);
        transform.updateMatrix();
        mesh.setMatrixAt(instance, transform.matrix);
      });
      scene.add(mesh);
    }
  }

  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([
    -.08,0,0, .08,0,0, .19,.7,0,
    0,0,-.07, 0,0,.07, 0,.67,.18,
    -.2,0,.07, -.32,0,.04, -.38,.4,.18,
    .16,0,.11, .25,0,.1, .43,.48,.26
  ], 3));
  blade.computeVertexNormals();
  const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({
    color: 0x5e6743, roughness: 1, side: THREE.DoubleSide
  }), 1400);
  for (let i = 0; i < grass.count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const offset = i < 1000 ? range(5.35, 11) : range(11, 44);
    const size = range(.33, 1.22);
    transform.position.set(side * offset, .035, range(-47, 114));
    transform.rotation.set(0, range(0, Math.PI * 2), 0);
    transform.scale.set(size, size * range(.55, .98), size);
    transform.updateMatrix();
    grass.setMatrixAt(i, transform.matrix);
  }
  scene.add(grass);
}
