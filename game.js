function boot() {
    const el = id => document.getElementById(id);

    // 🎵 音声処理（完全にクリーンで安全な設計に書き直し）
    const aEnv = new Audio('夏の田舎の夜.mp3'); aEnv.volume = 0.5;
    let audioContext;
    function getAudioContext() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioContext && AudioContext) audioContext = new AudioContext();
      return audioContext;
    }
    const chaseAudio = createChaseAudio('bgm.mp3', getAudioContext);
    const aOver = new Audio('夏の山2.mp3');
    const footsteps = createFootsteps(getAudioContext);
    aEnv.loop = true;

    // 🎨 テクスチャ生成
    function makeTex(w, h, draw, repX=1, repY=1) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c);
      if(repX!==1 || repY!==1){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(repX,repY); }
      return t;
    }
    const texGrass = makeTex(512, 512, ctx => {
      ctx.fillStyle = '#262923';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 380; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const radius = 3 + Math.random() * 25;
        const spot = ctx.createRadialGradient(x, y, 0, x, y, radius);
        spot.addColorStop(0, i % 3 === 0 ? '#4b5137a0' : '#171c1999');
        spot.addColorStop(1, '#171c1900');
        ctx.fillStyle = spot;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      for (let i = 0; i < 16000; i++) {
        ctx.fillStyle = ['#6d665040', '#94907535', '#25231b60', '#41472b9c'][i % 4];
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 2);
      }
    }, 42, 42);
    const texRoad = makeTex(512, 512, ctx => {
      ctx.fillStyle = '#262a2c';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 26000; i++) {
        ctx.fillStyle = ['#68717629', '#11161a50', '#47505745', '#77705c21'][i % 4];
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      for (let i = 0; i < 22; i++) {
        let x = Math.random() * 512, y = Math.random() * 512;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 6; j++) {
          x += (Math.random() - .5) * 40; y += Math.random() * 18;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#0c101299';
        ctx.lineWidth = .6 + Math.random() * 1.3;
        ctx.stroke();
      }
      for (const start of [28, 284]) {
        ctx.fillStyle = '#b8b9a782';
        ctx.fillRect(252, start, 8, 145);
        for (let i = 0; i < 330; i++) {
          ctx.fillStyle = '#3b42425e';
          ctx.fillRect(252 + Math.random() * 8, start + Math.random() * 144, 1, 2);
        }
      }
    }, 1, 23);
    const texConc = makeTex(512, 512, ctx => {
      ctx.fillStyle = '#464944';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 220; i++) {
        const x = (i * 113.7) % 512, y = (i * 77.3) % 512;
        const r = 9 + (i * 13 % 47);
        const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
        stain.addColorStop(0, i % 3 ? '#252d265a' : '#84715c46');
        stain.addColorStop(1, '#252d2600');
        ctx.fillStyle = stain;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 30; i++) {
        const x = (i * 173.7) % 512, y = (i * 97.4) % 390;
        const length = 22 + (i * 17 % 96), width = 2 + i % 8;
        const drip = ctx.createLinearGradient(0, y, 0, y + length);
        drip.addColorStop(0, i % 4 ? '#222e2655' : '#8e624860');
        drip.addColorStop(1, '#222e2600');
        ctx.fillStyle = drip;
        ctx.fillRect(x, y, width, length);
      }
      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle = i % 2 ? '#20262250' : '#aca28e44';
        ctx.fillRect(Math.random()*512, Math.random()*512, 1 + i % 3, 1 + i % 2);
      }
    });
    texConc.wrapS = texConc.wrapT = THREE.RepeatWrapping;
    const texWarn = makeTex(512,128, ctx=>{ ctx.fillStyle='#222225'; ctx.fillRect(0,0,512,128); ctx.fillStyle='#9e7308'; for(let i=-512; i<1024; i+=64){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+32,0); ctx.lineTo(i-32,128); ctx.lineTo(i-64,128); ctx.fill(); } });
    const texFence = makeTex(128,128, ctx=>{ ctx.strokeStyle='#7a7c78'; ctx.lineWidth=2; ctx.beginPath(); for(let i=-128; i<=256; i+=16){ ctx.moveTo(i,0); ctx.lineTo(i+128,128); ctx.moveTo(i+128,0); ctx.lineTo(i,128); } ctx.stroke(); });

    // 3Dシーン構築
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1b29);
    scene.fog = new THREE.FogExp2(0x15222b, 0.026);
    const walkFov = 78;
    const sprintFov = 88;
    const walkSpeed = 4.2;
    const sprintSpeed = 8.4;
    const camera = new THREE.PerspectiveCamera(walkFov, innerWidth/innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    document.body.appendChild(renderer.domElement);
    function resize() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
      if (!isRun) renderer.render(scene, camera);
    }
    window.addEventListener('resize', resize);

    const ambLight = new THREE.HemisphereLight(0x99afbd, 0x485244, 0.7);
    scene.add(ambLight);
    const moonlight = new THREE.DirectionalLight(0xa9c9e8, .75);
    moonlight.position.set(45, 54, -120);
    scene.add(moonlight);
    const flash = new THREE.SpotLight(0xffe9c8, 4.5, 53, Math.PI / 5.2, .76, 1.7); camera.add(flash); flash.target.position.set(0,0,-5); camera.add(flash.target);
    const lLight = new THREE.PointLight(0xfffae6, 0.15, 5); camera.add(lLight); scene.add(camera);

    function setLight(on) {
      light = on;
      flash.visible = on;
      lLight.visible = on;
      ambLight.intensity = on ? 0.75 : 0.42;
      el('light-btn').textContent = on ? 'ライト ON' : 'ライト OFF';
      el('light-btn').setAttribute('aria-pressed', String(on));
    }

    function addM(geo, mat, x, y, z, rx=0, ry=0, rz=0) { const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.rotation.set(rx,ry,rz); scene.add(m); return m; }

    const moonTexture = makeTex(128, 128, ctx => {
      const halo = ctx.createRadialGradient(64, 64, 0, 64, 64, 63);
      halo.addColorStop(0, 'rgba(210,232,229,.95)');
      halo.addColorStop(.24, 'rgba(193,222,230,.85)');
      halo.addColorStop(.28, 'rgba(147,195,222,.34)');
      halo.addColorStop(1, 'rgba(147,195,222,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#dce8df';
      ctx.beginPath(); ctx.arc(64, 64, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b9d1d1';
      ctx.beginPath(); ctx.arc(68, 61, 7, 0, Math.PI * 2); ctx.fill();
    });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: moonTexture, transparent: true, depthWrite: false, fog: false
    }));
    moon.position.set(88, 86, -164);
    moon.scale.set(63, 63, 1);
    scene.add(moon);

    // Thin mist at the road crossings, drawn with one shared texture.
    const mistTexture = makeTex(128, 64, ctx => {
      ctx.save();
      ctx.scale(1, .5);
      const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 63);
      gradient.addColorStop(0, 'rgba(155,189,198,.36)');
      gradient.addColorStop(.45, 'rgba(126,171,185,.2)');
      gradient.addColorStop(1, 'rgba(126,171,185,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      ctx.restore();
    });
    const mistMaterial = new THREE.SpriteMaterial({map: mistTexture, depthWrite: false, opacity: .58});
    const mist = [[8, -29], [-13, -17], [13, 35], [-19, 49], [-25, -36]].map(([x, z]) => {
      const sprite = new THREE.Sprite(mistMaterial);
      sprite.position.set(x, 1.15, z);
      sprite.scale.set(26, 3.4, 1);
      scene.add(sprite);
      return { sprite, x };
    });

    // マテリアル定義
    const mGrass = new THREE.MeshStandardMaterial({map: texGrass, roughness: .98});
    const mRoad = new THREE.MeshStandardMaterial({map: texRoad, bumpMap: texRoad, bumpScale: .004, roughness: .85});
    const mCon = new THREE.MeshStandardMaterial({map: texConc, bumpMap: texConc, bumpScale: .009, roughness: .91, side: THREE.DoubleSide});
    const mFence = new THREE.MeshStandardMaterial({map: texFence, transparent: true, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4});

    // 地形・道路
    addM(new THREE.PlaneGeometry(500,500), mGrass, 0,0,0, -Math.PI/2); addM(new THREE.PlaneGeometry(10,240), mRoad, 0,0.02,10, -Math.PI/2);

    // バリケード
    const bGrp = new THREE.Group(); bGrp.position.set(0,0,65); bGrp.add(new THREE.Mesh(new THREE.BoxGeometry(10,1.2,0.2), new THREE.MeshStandardMaterial({color:0x992222,roughness:0.7})).translateY(1.2));
    const poleM=new THREE.MeshStandardMaterial({color:0x888888,metalness:0.8}), poleG=new THREE.CylinderGeometry(0.1,0.1,2.2); bGrp.add(new THREE.Mesh(poleG,poleM).translateX(-4.5).translateY(1.1), new THREE.Mesh(poleG,poleM).translateX(4.5).translateY(1.1)); scene.add(bGrp);

    // 金網フェンス
    function buildFence(x1, z1, x2, z2) {
      const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz), ang=Math.atan2(dx,dz);
      const fMat=mFence.clone(); fMat.map=fMat.map.clone(); fMat.map.repeat.set(len/4, 2);
      const f=addM(new THREE.PlaneGeometry(len,4), fMat, x1+dx/2, 2, z1+dz/2); f.rotation.y = ang+Math.PI/2;
      const tM=new THREE.MeshStandardMaterial({color:0x333, metalness:0.8}), tG=new THREE.CylinderGeometry(0.08,0.08,4);
      for(let i=0; i<=len; i+=4) addM(tG, tM, x1+dx*(i/len), 2, z1+dz*(i/len));
      const bar=addM(new THREE.BoxGeometry(len,0.1,0.1), tM, x1+dx/2, 4, z1+dz/2); bar.rotation.y = ang+Math.PI/2;
    }
    buildFence(-129.5, -49.5, -84, -49.5); buildFence(84, -49.5, 129.5, -49.5);
    buildFence(-129.5, -49.5, -129.5, 129.5); buildFence(129.5, -49.5, 129.5, 129.5);
    buildFence(-129.5, 129.5, 129.5, 129.5);

    // 🗺️ ランドマーク（廃車・井戸）
    const colls = [];
    colls.push({x: -25, z: 15, r: 2.2});

    const scenery = buildRecoveryScenery(scene);
    const terminal = makeForestProps(scene);
    colls.push({x: 30, z: -10, r: 1.6});

    buildMountainCut(scene);

    const barriers = buildRoadStructures(scene, mCon, mRoad, new THREE.MeshStandardMaterial({ map: texWarn, roughness: .8 }));
    barriers.push({ minX: -5, maxX: 5, minZ: 64.9, maxZ: 65.1 });
    const gate = buildTerminalGate(scene);
    barriers.push(gate.wall);
    const mapSite = { x: 3.35, z: -77.9 };
    const keySite = { x: -22, z: 17.3 };



    // 🌲 リアル針葉樹
    const wreckZone = { x: terminal.wreckSearch.x, z: terminal.wreckSearch.z, name: '廃車の後ろ', part: 'レバー' };
    const partZones = [
      wreckZone,
      { x: 27.6, z: -9.2, name: '井戸', part: 'ボタン', open: '井戸のつるべを引く', reveal: scenery.raiseWellBucket, display: [29.0, 1.28, -9.52] },
      { x: -14, z: -31, name: 'トンネル手前の作業跡', part: '基板', needsLight: true },
      { x: 14, z: 40, name: '南側の作業箱', part: '配線', open: '作業箱の留め金を外す', reveal: scenery.openWorkBox }
    ];
    const batteryZones = [
      { x: 2, z: 45 }, { x: -11, z: 49 }, { x: 11, z: 11 }, { x: -10, z: 9 },
      { x: -13, z: -25 }, { x: 15, z: -29 }, { x: -2, z: -34 }, { x: 2, z: 13 }
    ];
    scenery.workCache(-14, -31, false);
    scenery.workCache(14, 40, true);
    const trees = [];
    let layoutSeed = 413092;
    function layoutRandom() {
      layoutSeed = (Math.imul(layoutSeed, 1664525) + 1013904223) >>> 0;
      return layoutSeed / 4294967296;
    }
    const clearings = [...partZones, ...batteryZones, keySite, {x: -25, z: 15}, {x: 30, z: -10}, {x: 29, z: -20}, {x: -29, z: -20}];
    function addTree(x, z, scale = 1, radius = .7) {
      if (clearings.some(zone => Math.hypot(x - zone.x, z - zone.z) < 3.5)) return;
      if (x >= -129 && x <= 129 && colls.some(o => Math.hypot(x - o.x, z - o.z) < radius + o.r + .5)) return;
      trees.push({ x, z, scale, yaw: layoutRandom() * Math.PI });
      if (z >= -49 && z <= 129 && Math.abs(x) <= 129) colls.push({ x, z, r: radius });
    }
    for (let i = 0; i < 120; i++) {
      let x = (layoutRandom()-.5)*140;
      const z = (layoutRandom()-.5)*120;
      if (Math.abs(x) < 8) x += x >= 0 ? 9 : -9;
      if (z > -48) addTree(x,z);
    }
    for (let i = 0; i < 350; i++) {
      const r = 75 + layoutRandom()*120, angle = layoutRandom()*Math.PI*2;
      const x = Math.cos(angle)*r, z = Math.sin(angle)*r;
      if (Math.abs(x) > 7 && !(z < -45 && Math.abs(x) < 20)) addTree(x,z,1.2,1);
    }
    buildForest(scene, trees);
    let enemyObstacles = pursuitObstacles(barriers, colls);
    const mapCanvas = el('field-map');
    drawFieldMap(mapCanvas, partZones, keySite);
    const paperMaterial = new THREE.MeshStandardMaterial({
      map:new THREE.CanvasTexture(mapCanvas), roughness:.94,
      emissive:0x52412b, emissiveIntensity:.42
    });
    const mapPaper = addM(new THREE.PlaneGeometry(.64,.37),paperMaterial,mapSite.x,.047,mapSite.z,-Math.PI/2);
    mapPaper.rotation.z = -.23;
    const keyMetal = new THREE.MeshStandardMaterial({
      color:0xad9660, metalness:.44, roughness:.57, emissive:0x533b1e, emissiveIntensity:.43
    });
    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.076,.02,7,16),keyMetal);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(.21,.045,.035),keyMetal);
    stem.position.x = .156;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(.05,.088,.035),keyMetal);
    tooth.position.set(.23,-.024,0);
    key.add(ring,stem,tooth);
    key.position.set(keySite.x,.067,keySite.z);
    key.rotation.x = -Math.PI/2;
    key.rotation.z = .35;
    scene.add(key);
    const bats = [], parts = [];
    function spawnAt(items, zone) {
      const item = scenery.makeItem(items === bats ? 'battery' : 'module', items.length);
      item.position.set(zone.x, items === bats ? .34 : .26, zone.z);
      if (zone === wreckZone) item.position.copy(terminal.wreckCargo);
      if (zone.display) item.position.set(...zone.display);
      item.visible = !(zone === wreckZone || zone.open || zone.needsLight);
      item.userData.zone = zone.name;
      item.userData.partName = zone.part;
      item.userData.site = zone;
      item.userData.opened = false;
      scene.add(item);
      items.push(item);
    }
    // 敵
    const enemy = new THREE.Group();
    const enemyShape = new THREE.MeshStandardMaterial({color:0x202221, roughness:.88});
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(1,16,12), enemyShape);
    shoulders.scale.set(1.25,.6,.38);
    shoulders.position.set(0,-.66,-.12);
    enemy.add(shoulders);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1,16,12), enemyShape);
    head.scale.set(.60,.83,.43);
    head.position.set(0,.27,-.16);
    enemy.add(head);
    const enemyFace = new THREE.Mesh(new THREE.PlaneGeometry(2.65,2.67), new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load('kokunii.PNG'), color:0xc4c4bd, alphaTest:.48
    }));
    enemyFace.position.z = .34;
    enemy.add(enemyFace);
    enemy.visible = false;
    scene.add(enemy);

    // 変数定義
    let isRun=false, isOver=false, isClr=false, light=true, isDash=false, batt=100, stam=100, pCnt=0, eSt='P', pTgt=new THREE.Vector3(), eDir=new THREE.Vector3(0,0,1), lastT=0;
    let headBobTime = 0;
    let sprintBlend = 0;
    const pursuit = { state: 'P', timer: 0, x: 0, z: 0 };
    let hasMap = false, hasKey = false;
    let gateOpeningAt = null, gateOpen = false;
    let inventoryOpen = false;
    let arcadeActive = false;
    const arcade = createArcadeTerminal(finishEscape, () => !needsLandscape());
    const keys = { yaw: 0, pitch: 0 };
    let mTch=null, lTch=null, mSt={x:0,y:0}, lSt={x:0,y:0}, mDir={f:0,s:0};

    const touchDevice = navigator.maxTouchPoints > 0;
    const touchPrimary = matchMedia('(pointer: coarse)');
    const portrait = matchMedia('(orientation: portrait)');
    const needsLandscape = () => touchDevice && touchPrimary.matches && portrait.matches;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let paused = false;
    let sprintExhausted = false;
    const running = () => isRun && !paused && !isOver && !isClr && !arcadeActive;
    const unlockView = () => {
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    };
    function requestView() {
      try {
        renderer.domElement.requestPointerLock?.()?.catch(() => {});
      } catch {
        // Drag-to-look still works if the browser does not allow pointer lock.
      }
    }
    function clearInputs() {
      for (const key of Object.keys(keys)) {
        if (key !== 'yaw' && key !== 'pitch') keys[key] = false;
      }
      mTch = lTch = null;
      mDir = { f: 0, s: 0 };
      isDash = false;
      sprintExhausted = false;
    }
    function pause(showInventory = false) {
      if (!running()) return;
      paused = true;
      document.body.dataset.mode = 'paused';
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      clearInputs();
      unlockView();
      footsteps.play('');
      aEnv.pause();
      chaseAudio.level(0);
      inventoryOpen = showInventory === true;
      if (inventoryOpen) {
        el('inventory-count').textContent = `アケコン部品 ${pCnt} / 4`;
        el('inventory-key').hidden = !hasKey;
        el('inventory-map').hidden = !hasMap;
        el('inventory-screen').style.display = 'grid';
        el('inventory-close').focus();
      } else {
        el('pause-screen').style.display = 'grid';
        el('resume-btn').focus();
      }
    }
    function updateOrientation() {
      const rotate = needsLandscape() && !isOver && !isClr;
      if (rotate) pause();
      el('rotate-screen').classList.toggle('visible', rotate);
      el('rotate-hint').textContent = arcadeActive ? '横に戻すとコマンド入力を続けられます。' : isRun
        ? '捜索を中断しました。横に戻したら「再開する」を押してください。'
        : '横にすると捜索を始められます。';
      el('start-btn').disabled = rotate;
      el('resume-btn').disabled = rotate;
    }
    function resume(event) {
      if (needsLandscape()) return;
      chaseAudio.unlock();
      footsteps.unlock();
      paused = false;
      inventoryOpen = false;
      el('inventory-screen').style.display = 'none';
      document.body.dataset.mode = 'play';
      lastT = performance.now();
      el('pause-screen').style.display = 'none';
      aEnv.play().catch(() => {});
      if (!touchDevice || event.pointerType === 'mouse') requestView();
      frameId = requestAnimationFrame(animate);
    }
    function turn(dx, dy, sensitivity) {
      keys.yaw -= dx * sensitivity;
      keys.pitch = THREE.MathUtils.clamp(keys.pitch - dy * sensitivity, -1.2, 1.2);
    }
    renderer.domElement.addEventListener('pointerdown', event => {
      if (running() && event.pointerType === 'mouse') requestView();
    });
    document.addEventListener('mousemove', event => {
      if (running() && (document.pointerLockElement === renderer.domElement ||
          (event.buttons === 1 && event.target === renderer.domElement))) {
        turn(event.movementX, event.movementY, 0.0025);
      }
    });
    let wasLocked = false;
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === renderer.domElement;
      if (wasLocked && !locked) pause();
      wasLocked = locked;
      el('view-cue').style.display = running() && !touchDevice && !locked ? 'block' : 'none';
    });
    el('view-cue').textContent = '画面クリックで視点操作。ロックできない場合はマウスでドラッグ。';
    el('pause-btn').addEventListener('click', pause);
    const tracks = [aEnv, aOver];
    let muted = false;
    el('sound-btn').addEventListener('click', () => {
      muted = !muted;
      tracks.forEach(track => { track.muted = muted; });
      if (muted) { chaseAudio.level(0); footsteps.play(''); }
      el('sound-btn').textContent = muted ? '音声 OFF' : '音声 ON';
      el('sound-btn').setAttribute('aria-pressed', String(muted));
    });
    el('resume-btn').addEventListener('click', resume);
    el('inventory-btn').addEventListener('click', () => pause(true));
    el('inventory-close').addEventListener('click', resume);
    el('inventory-map').addEventListener('click', event => {
      mapCanvas.hidden = !mapCanvas.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!mapCanvas.hidden));
      event.currentTarget.textContent = mapCanvas.hidden ? '手描きの地図を広げる' : '手描きの地図をたたむ';
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    el('light-btn').addEventListener('click', () => { if (running() && batt > 0) setLight(!light); });
    const dashButton = el('dash-btn');
    dashButton.addEventListener('pointerdown', event => {
      if (!running() || stam <= 0) return;
      dashButton.setPointerCapture(event.pointerId);
      isDash = true;
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      dashButton.addEventListener(type, () => { isDash = false; });
    }

    function patrolTarget() {
      for (let attempt = 0; attempt < 24; attempt++) {
        pTgt.set((Math.random()-.5)*145, 1.85, -40 + Math.random()*142);
        if (!enemyObstacles.some(wall => pTgt.x > wall.minX && pTgt.x < wall.maxX && pTgt.z > wall.minZ && pTgt.z < wall.maxZ)) return;
      }
      pTgt.set(0, 1.85, 3);
    }
    if (touchPrimary.matches) el('start-btn').textContent = 'タップしてスタート';
    el('start-btn').onclick = event => {
      if (isRun || needsLandscape()) return;
      isRun = true;
      camera.position.set(0, 1.8, 25);
      setLight(true);
      for (const zone of batteryZones) spawnAt(bats, zone);
      for (const zone of partZones) spawnAt(parts, zone);
      el('start-screen').style.display = 'none';
      el('ui-top-left').style.display = 'flex';
      el('pause-btn').style.display = 'block';
      el('inventory-btn').hidden = false;
      if (touchDevice) {
        el('light-btn').style.display = 'block';
        dashButton.style.display = 'block';
      } else {
        el('view-cue').style.display = 'block';
      }
      resume(event);
    };

    window.addEventListener('keydown', event => {
      if (inventoryOpen && (event.code === 'KeyI' || event.code === 'Escape') && !event.repeat) {
        resume(event);
        return;
      }
      if (!running()) return;
      if (event.code === 'KeyI' && !event.repeat) { pause(true); return; }
      if (event.code === 'Escape') { pause(); return; }
      if (event.code.startsWith('Arrow')) event.preventDefault();
      keys[event.code] = true;
      if (event.code === 'KeyE' && !event.repeat) useNearbyAction();
      if (event.code === 'KeyF' && !event.repeat && batt > 0) setLight(!light);
    });
    window.addEventListener('keyup', event => { keys[event.code] = false; });

    window.addEventListener('touchstart', event => {
      if (!running() || event.target.closest('button')) return;
      for (const touch of event.changedTouches) {
        if (touch.clientX < innerWidth / 2 && mTch === null) {
          mTch = touch.identifier; mSt = { x: touch.clientX, y: touch.clientY };
        } else if (touch.clientX >= innerWidth / 2 && lTch === null) {
          lTch = touch.identifier; lSt = { x: touch.clientX, y: touch.clientY };
        }
      }
    });
    window.addEventListener('touchmove', event => {
      if (!running()) return;
      for (const touch of event.changedTouches) {
        if (touch.identifier === mTch) {
          mDir.s = THREE.MathUtils.clamp((touch.clientX - mSt.x) / 40, -1, 1);
          mDir.f = THREE.MathUtils.clamp((mSt.y - touch.clientY) / 40, -1, 1);
        } else if (touch.identifier === lTch) {
          turn(touch.clientX - lSt.x, touch.clientY - lSt.y, 0.005);
          lSt = { x: touch.clientX, y: touch.clientY };
        }
      }
    });
    for (const type of ['touchend', 'touchcancel']) {
      window.addEventListener(type, event => {
        for (const touch of event.changedTouches) {
          if (touch.identifier === mTch) { mTch = null; mDir = { f: 0, s: 0 }; }
          if (touch.identifier === lTch) lTch = null;
        }
      });
    }

    const up = new THREE.Vector3(0, 1, 0);
    const walkVector = new THREE.Vector3();
    const enemyOffset = new THREE.Vector3();
    const enemyMove = new THREE.Vector3();
    let frameId = null;
    let elapsed = 0;
    let enemyDelay = 20;
    let detour = null, nextRouteCheck = 0;
    let pickupUntil = 0;
    function showPickup(message) {
      const notice = el('pickup-notice');
      notice.textContent = message;
      notice.style.display = 'block';
      pickupUntil = elapsed + 2.4;
    }
    const actionButton = el('nearby-action');
    actionButton.addEventListener('click', useNearbyAction);
    let hatchOpenedAt = null;
    let wreckNoise = null;
    const hatchDuration = .68;
    function distanceTo(x, z) {
      return Math.hypot(camera.position.x - x, camera.position.z - z);
    }
    function nearbyAction() {
      if (!hasMap && distanceTo(mapSite.x,mapSite.z) < 1.4) return { kind:'map', label:'手描きの地図を拾う' };
      if (!hasKey && distanceTo(keySite.x,keySite.z) < 1.2) return { kind:'key', label:'鉄格子の鍵を拾う' };
      if (gateOpeningAt === null && camera.position.z > gate.z && distanceTo(gate.x,gate.z) < 1.6) {
        return { kind:'gate', label:hasKey ? '鍵で鉄格子を開ける' : '鉄格子を調べる' };
      }
      const wreckDistance = distanceTo(wreckZone.x, wreckZone.z);
      if (wreckDistance < 1.45 && hatchOpenedAt === null) {
        return { label: 'トランクを開ける' };
      }
      let closest = null;
      let closestDistance = 1.5;
      for (const items of [parts, bats]) {
        for (const item of items) {
          const inWreck = item.userData.zone === wreckZone.name;
          if (inWreck && (hatchOpenedAt === null || elapsed - hatchOpenedAt < hatchDuration || wreckDistance >= 1.45)) continue;
          const site = item.userData.site;
          const distance = inWreck ? wreckDistance : distanceTo(site.x, site.z);
          if (distance >= closestDistance) continue;
          closestDistance = distance;
          const name = items === bats ? '電池' : item.userData.partName;
          const search = site.open || (site.needsLight && !light ? '手探りで基板を探す' : '');
          closest = search && !item.userData.opened
            ? { reveal: item, label: search }
            : { items, item, label: name + 'を拾う' };
        }
      }
      return closest;
    }
    function updateNearbyAction() {
      const action = nearbyAction();
      actionButton.hidden = !action;
      if (!action) return;
      const label = touchDevice ? action.label : 'E　' + action.label;
      if (actionButton.textContent !== label) actionButton.textContent = label;
    }
    function useNearbyAction() {
      if (!running()) return;
      const action = nearbyAction();
      if (!action) return;
      if (action.kind === 'map') {
        hasMap = true;
        scene.remove(mapPaper);
        showPickup(touchDevice ? '地図を拾った。「持ち物」で確認できる' : '地図を拾った。Iキーで「持ち物」を開く');
      } else if (action.kind === 'key') {
        hasKey = true;
        scene.remove(key);
        showPickup('鉄格子の鍵を拾った');
      } else if (action.kind === 'gate') {
        if (hasKey) {
          gateOpeningAt = elapsed;
          showPickup('鉄格子の鍵を開けた');
        } else {
          showPickup('錠が掛かっている');
        }
      } else if (action.reveal) {
        action.reveal.userData.opened = true;
        action.reveal.visible = true;
        action.reveal.userData.site.reveal?.();
      } else if (!action.item) {
        openWreck();
      } else {
        const { items, item } = action;
        items.splice(items.indexOf(item), 1);
        scene.remove(item);
        if (items === bats) {
          batt = 100;
          setLight(true);
          showPickup('電池を交換した');
        } else {
          pCnt++;
          terminal.updateScreen(pCnt);
          showPickup(`${item.userData.partName}を回収　${pCnt} / 4`);
        }
      }
      updateNearbyAction();
    }
    function openWreck() {
      hatchOpenedAt = elapsed;
      showPickup('トランクの音が森に響いた');
      if (enemy.visible && Math.hypot(enemy.position.x - wreckZone.x, enemy.position.z - wreckZone.z) < 52) {
        wreckNoise = wreckZone;
      }
      const audio = muted ? null : getAudioContext();
      if (audio?.state === 'running') {
        const now = audio.currentTime;
        const length = Math.ceil(audio.sampleRate * .68);
        const buffer = audio.createBuffer(1, length, audio.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / audio.sampleRate;
          const latch = Math.exp(-t*45);
          const stop = t < .35 ? 0 : Math.exp(-(t-.35)*29);
          const creak = Math.sin(2*Math.PI*(140*t + 310*t*t)) * Math.sin(Math.PI*t/.68)**2;
          samples[i] = (Math.random()*2-1)*(.28*latch + .36*stop) + .06*creak;
        }
        const sound = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2300;
        sound.buffer = buffer;
        sound.connect(filter).connect(audio.destination);
        sound.start(now);
      }
    }
    function summary() {
      const seconds = Math.floor(elapsed % 60);
      return `アケコン部品 ${pCnt} / 4　捜索時間 ${Math.floor(elapsed / 60)}:${String(seconds).padStart(2, '0')}`;
    }
    function updateMeter(id, value) {
      el(id + '-lv').style.width = value + '%';
      const readout = el(id + '-value');
      const label = Math.ceil(value) + '%';
      if (readout.textContent !== label) readout.textContent = label;
    }
    function enterArcade() {
      arcadeActive = true;
      clearInputs();
      footsteps.play('');
      aEnv.pause();
      chaseAudio.level(0);
      unlockView();
      document.body.dataset.mode = 'arcade';
      arcade.start();
    }

    function finishEscape() {
      isClr = true;
      arcadeActive = false;
      document.body.dataset.mode = 'clear';
      el('clear-stats').textContent = summary();
      el('game-clear').style.display = 'grid';
    }

    function updateObjective() {
      const objective = `アケコン部品 ${pCnt} / 4`;
      if (el('objective').textContent !== objective) el('objective').textContent = objective;
    }

    // 描画ループ
    function animate() {
      frameId = null;
      if (!running()) return;
      frameId = requestAnimationFrame(animate);
      const now = performance.now();
      const frameSeconds = (now - lastT) / 1000;
      const dt = Math.min(frameSeconds, 0.05);
      lastT = now;
      elapsed += dt;
      if (!enemy.visible) {
        enemyDelay -= frameSeconds;
        if (enemyDelay <= 0) {
          const spawnX = camera.position.x > 0 ? -29 : 29;
          enemy.position.set(spawnX, 1.85, -20);
          patrolTarget();
          enemy.visible = true;
          if (hatchOpenedAt !== null && elapsed - hatchOpenedAt <= 8 &&
              Math.hypot(spawnX - wreckZone.x, -20 - wreckZone.z) < 74) wreckNoise = wreckZone;
        }
      }
      if (pickupUntil && elapsed >= pickupUntil) {
        el('pickup-notice').style.display = 'none';
        pickupUntil = 0;
      }
      if (!reducedMotion) {
        mist.forEach(({sprite, x}, i) => { sprite.position.x = x + Math.sin(elapsed * .22 + i) * 2; });
      }

      const tF = mDir.f + (keys['KeyW']||keys['ArrowUp']?1:0) - (keys['KeyS']||keys['ArrowDown']?1:0);
      const tS = mDir.s + (keys['KeyD']||keys['ArrowRight']?1:0) - (keys['KeyA']||keys['ArrowLeft']?1:0);
      const isMv = tF !== 0 || tS !== 0;
      const sprintRequested = isDash || keys.ShiftLeft || keys.ShiftRight;
      if (!sprintRequested) sprintExhausted = false;
      const sprinting = sprintRequested && !sprintExhausted && stam > 0 && isMv;
      const sprintResponse = sprinting ? 8 : 11;
      sprintBlend = THREE.MathUtils.lerp(sprintBlend, sprinting ? 1 : 0, 1 - Math.exp(-dt * sprintResponse));
      const speed = THREE.MathUtils.lerp(walkSpeed, sprintSpeed, sprintBlend);
      const fov = reducedMotion ? walkFov : THREE.MathUtils.lerp(walkFov, sprintFov, sprintBlend);
      if (Math.abs(camera.fov - fov) > .02) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      document.body.classList.toggle('sprinting', !reducedMotion && sprinting);

      // 🎥 ヘッドボブ（カメラ揺れ）
      if(isMv && !reducedMotion) {
        headBobTime += dt * THREE.MathUtils.lerp(8, 15, sprintBlend);
        camera.position.y = 1.8 + Math.sin(headBobTime) * THREE.MathUtils.lerp(.035, .095, sprintBlend);
      } else { camera.position.y = 1.8; }

      // UI更新
      if(light && batt>0){ batt-=dt*.54; if(batt<=0){ batt=0; setLight(false); } }
      const charge = Math.min(1, batt / 20);
      flash.intensity = THREE.MathUtils.lerp(1.8, 4.5, charge);
      flash.distance = THREE.MathUtils.lerp(18, 53, charge);
      updateMeter('bat', batt);
      el('bat-lv').classList.toggle('low', batt <= 20);
      if (sprinting) {
        stam = Math.max(0, stam - dt * 12.5);
        if (stam === 0) sprintExhausted = true;
      } else if (!sprintRequested) {
        stam = Math.min(100, stam + dt * 23);
      }
      updateMeter('sta', stam);
      el('sta-lv').classList.toggle('low', stam <= 25);

      const wTxt = el('warning-text');
      document.body.dataset.threat = String(eSt === 'C' || batt <= 0);
      const warning = batt <= 0 ? '電池切れ　予備電池を探す' :
        eSt === 'I' ? 'こくにいが周囲を探っている' : '';
      wTxt.style.display = warning ? 'block' : 'none';
      if (wTxt.textContent !== warning) wTxt.textContent = warning;

      if (hatchOpenedAt !== null && terminal.hatch.rotation.x !== -1.48) {
        const progress = Math.min(1, (elapsed - hatchOpenedAt) / hatchDuration);
        terminal.hatch.rotation.x = -1.48 * (1 - (1 - progress)**3);
        const cargo = parts.find(item => item.userData.zone === wreckZone.name);
        if (cargo) cargo.visible = progress >= .35;
      }
      for (const battery of bats) battery.rotation.y += dt * 2;
      for (const part of parts) {
        part.rotation.y += dt * 3;
        if (part.userData.site.needsLight) part.visible = part.userData.opened || (light && distanceTo(part.position.x, part.position.z) < 12);
      }

      updateObjective();
      if (gateOpeningAt !== null && !gateOpen) {
        const progress = Math.min(1, (elapsed-gateOpeningAt)/.8);
        gate.setOpening(progress);
        if (progress === 1) {
          gateOpen = true;
          barriers.splice(barriers.indexOf(gate.wall),1);
          enemyObstacles = pursuitObstacles(barriers, colls);
          detour = null;
          nextRouteCheck = elapsed;
        }
      }

      camera.rotation.set(keys.pitch, keys.yaw, 0, 'YXZ');
      const oX = camera.position.x, oZ = camera.position.z;
      walkVector.set(tS, 0, -tF).clampLength(0, 1).applyAxisAngle(up, keys.yaw);
      camera.position.addScaledVector(walkVector, speed * dt);

      for(let t of colls){ let dx=camera.position.x-t.x, dz=camera.position.z-t.z, d=Math.hypot(dx,dz), minD=t.r+0.3; if(d>0 && d<minD) { camera.position.x+=(dx/d)*(minD-d); camera.position.z+=(dz/d)*(minD-d); } }
      const [safeX, safeZ] = sweepRoadWalls(oX, oZ, camera.position.x, camera.position.z, barriers);
      camera.position.set(Math.max(-129, Math.min(129, safeX)), camera.position.y, Math.max(-85, Math.min(129, safeZ)));
      updateNearbyAction();
      const moved = Math.hypot(camera.position.x - oX, camera.position.z - oZ) > dt * .4;
      const walkingOnRoad = Math.abs(camera.position.x) <= 5;
      if (muted || !isMv || !moved) {
        footsteps.play('');
      } else {
        footsteps.play(walkingOnRoad ? (sprinting ? 'run' : 'walk') : 'grass', !walkingOnRoad && sprinting ? 1.38 : 1);
      }

      if (gateOpen && pCnt >= 4 && Math.hypot(camera.position.x - terminal.target.x, camera.position.z - terminal.target.z) < 2.7) {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        enterArcade();
        return;
      }

      if (!enemy.visible) {
        renderer.render(scene, camera);
        return;
      }

      // 👁️📈 こくにいAI
      const pVec = enemyOffset.subVectors(camera.position, enemy.position); pVec.y=0; const pDist = pVec.length();

      const currentChaseSpeed = 4.5 + pCnt * 0.52;
      const detectRange = 13 + pCnt * 2 + (light ? 10 : 0);
      const hearingRange = moved && isMv ? (sprinting ? 21 : 6.5) : 0;
      const relevantDistance = Math.max(detectRange, hearingRange, 2);
      const blocked = pDist <= relevantDistance && pathOccluded(
        enemy.position.x, enemy.position.z, camera.position.x, camera.position.z, barriers, colls
      );
      const bearing = eDir.angleTo(enemyMove.copy(pVec).normalize());
      const canSee = !blocked && pDist < detectRange && (bearing < Math.PI / 3.2 || pDist < 5.5);
      const heard = pDist < hearingRange * (blocked ? .36 : 1);
      const previousState = eSt;
      eSt = updatePursuit(pursuit, {
        dt, visible: canSee, heard, impact: wreckNoise, x: camera.position.x, z: camera.position.z,
        reached: Math.hypot(pursuit.x - enemy.position.x, pursuit.z - enemy.position.z) < 1.25
      });
      wreckNoise = null;
      if (eSt === 'P' && (previousState !== 'P' || enemy.position.distanceTo(pTgt) < 1.5)) patrolTarget();
      let targetX = eSt === 'P' ? pTgt.x : pursuit.x;
      let targetZ = eSt === 'P' ? pTgt.z : pursuit.z;
      if ((targetZ < -49) !== (enemy.position.z < -49) && Math.abs(enemy.position.x) >= 4) {
        targetX = 0;
        targetZ = enemy.position.z < -49 ? -51 : -47;
      }
      if (eSt !== previousState || (detour && Math.hypot(detour.x-enemy.position.x, detour.z-enemy.position.z) < .3)) {
        detour = null;
        nextRouteCheck = elapsed;
      }
      if (!detour && elapsed >= nextRouteCheck) {
        detour = pursuitDetour(enemy.position.x, enemy.position.z, targetX, targetZ, enemyObstacles);
        nextRouteCheck = elapsed + .16;
      }
      const moveDir = enemyMove.set((detour?.x ?? targetX)-enemy.position.x, 0, (detour?.z ?? targetZ)-enemy.position.z);
      if (moveDir.lengthSq() < .1 && eSt === 'I') {
        eDir.applyAxisAngle(up, dt * 1.8);
      } else {
        moveDir.normalize();
      }
      const enemyStep = (eSt === 'C' ? currentChaseSpeed : eSt === 'I' ? 3.15 : 2.1) * dt;
      const [enemyX, enemyZ] = sweepRoadWalls(
        enemy.position.x, enemy.position.z,
        enemy.position.x + moveDir.x * enemyStep, enemy.position.z + moveDir.z * enemyStep, enemyObstacles, 0
      );
      if (Math.hypot(enemyX-enemy.position.x, enemyZ-enemy.position.z) < enemyStep*.15) {
        detour = null;
        if (eSt === 'P') patrolTarget();
      }
      enemy.position.x = enemyX;
      enemy.position.z = enemyZ;
      enemy.position.y = 1.85;
      if (moveDir.lengthSq() > 0) eDir.copy(moveDir);
      const facing = Math.atan2(eDir.x,eDir.z);
      const turnAngle = Math.atan2(Math.sin(facing-enemy.rotation.y), Math.cos(facing-enemy.rotation.y));
      enemy.rotation.y += turnAngle * Math.min(1, dt*7);

      const chasing = eSt === 'C';
      const tension = 1 - THREE.MathUtils.clamp(pDist / 36, 0, 1);
      chaseAudio.level(chasing && !muted ? .43 + tension * .4 : 0);
      aEnv.volume = THREE.MathUtils.lerp(aEnv.volume, chasing ? .12 : .5, Math.min(1, dt * 5));

      if(pDist<1.5 && !blocked){ triggerGameOver("こくにいに捕まった！"); }
      renderer.render(scene, camera);
    }

    function triggerGameOver(reason) {
      isOver = true;
      document.body.dataset.mode = 'over';
      footsteps.play('');
      aEnv.pause();
      chaseAudio.level(0);

      // ゲームオーバー時のみひぐらしを再生
      aOver.currentTime = 0;
      aOver.play().catch(()=>{});

      unlockView();
      el('death-reason').innerText = reason;
      el('death-stats').textContent = summary();
      el('game-over').style.display = 'grid';
    }

    // Render the actual forest behind the title before entering the road.
    camera.position.set(-2.6, 2.5, 32);
    camera.lookAt(9, 6, -48);
    setLight(false);
    resize();
    for (const media of [portrait, touchPrimary]) {
      if (media.addEventListener) media.addEventListener('change', updateOrientation);
      else media.addListener(updateOrientation);
    }
    updateOrientation();
}

try {
  boot();
} catch (error) {
  console.error(error);
  const message = document.getElementById("start-error");
  message.textContent = "3D画面を起動できません。WebGL対応のブラウザで、読み込み直してください。";
  message.hidden = false;
  document.getElementById("start-btn").disabled = true;
}
