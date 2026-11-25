function boot() {
    const el = id => document.getElementById(id);

    // 🎵 音声処理（完全にクリーンで安全な設計に書き直し）
    const aEnv = new Audio('夏の田舎の夜.mp3'); aEnv.volume = 0.5;
    const aChase = new Audio('bgm.mp3'); aChase.volume = 0;
    const aOver = new Audio('夏の山2.mp3');
    const aWalk = new Audio('アスファルトの上を歩く1.mp3'); aWalk.volume = 0.6;
    const aDash = new Audio('アスファルトの上を歩く2.mp3'); aDash.volume = 0.9;
    const aGrass = new Audio('芝生の上を歩く.mp3'); aGrass.volume = 0.7;

    // バグの原因となるWeb Audio APIを排除し、純粋なループイベントを設定
    [aEnv, aChase, aWalk, aDash, aGrass].forEach(a => {
      a.loop = true;
    });

    let activeStep = null;

    // 🎨 テクスチャ生成
    function makeTex(w, h, draw, repX=1, repY=1) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c);
      if(repX!==1 || repY!==1){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(repX,repY); }
      return t;
    }
    const texGrass = makeTex(512,512, ctx=>{ ctx.fillStyle='#0a0f07'; ctx.fillRect(0,0,512,512); for(let i=0;i<15000;i++){ ctx.fillStyle=Math.random()>0.6?'#050804':(Math.random()>0.2?'#101a0d':'#17140e'); ctx.fillRect(Math.random()*512,Math.random()*512,2,3); }}, 40,40);
    const texRoad = makeTex(256,512, ctx=>{ ctx.fillStyle='#141416'; ctx.fillRect(0,0,256,512); for(let i=0;i<8000;i++){ ctx.fillStyle=`rgba(${~~(Math.random()*25)},${~~(Math.random()*25)},${~~(Math.random()*25)},0.2)`; ctx.fillRect(Math.random()*256,Math.random()*512,2,2);} ctx.strokeStyle='#08080a'; ctx.lineWidth=2; for(let i=0;i<15;i++){ ctx.beginPath(); let cx=Math.random()*256,cy=Math.random()*512; ctx.moveTo(cx,cy); for(let j=0;j<5;j++){ cx+=(Math.random()-0.5)*30; cy+=(Math.random()-0.5)*30; ctx.lineTo(cx,cy); } ctx.stroke(); } ctx.fillStyle='rgba(160,160,160,0.35)'; ctx.fillRect(122,40,12,160); ctx.fillRect(122,300,12,160); }, 1,20);
    const texConc = makeTex(256,256, ctx=>{ ctx.fillStyle='#1c1c20'; ctx.fillRect(0,0,256,256); for(let i=0;i<8000;i++){ ctx.fillStyle=`rgba(${~~(Math.random()*30)},${~~(Math.random()*30)},${~~(Math.random()*30)},0.25)`; ctx.fillRect(Math.random()*256,Math.random()*256,2,2); }}, 2,6);
    const texWarn = makeTex(512,128, ctx=>{ ctx.fillStyle='#222225'; ctx.fillRect(0,0,512,128); ctx.fillStyle='#9e7308'; for(let i=-512; i<1024; i+=64){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+32,0); ctx.lineTo(i-32,128); ctx.lineTo(i-64,128); ctx.fill(); } });
    const texCliff = makeTex(512,512, ctx=>{ ctx.fillStyle='#0a0d08'; ctx.fillRect(0,0,512,512); for(let i=0;i<35000;i++){ ctx.fillStyle=`rgba(${~~(Math.random()*20)},${~~(Math.random()*20)+2},${~~(Math.random()*20)},0.7)`; ctx.fillRect(Math.random()*512,Math.random()*512,1.5+Math.random()*3,1.5+Math.random()*3); } ctx.strokeStyle='#040503'; for(let i=0;i<40;i++){ ctx.lineWidth=1+Math.random()*4; ctx.beginPath(); let cx=Math.random()*512,cy=Math.random()*512; ctx.moveTo(cx,cy); for(let j=0;j<8;j++){ cx+=(Math.random()-0.5)*70; cy+=(Math.random()-0.5)*70; ctx.lineTo(cx,cy); } ctx.stroke(); }}, 4,2);
    const texFence = makeTex(128,128, ctx=>{ ctx.strokeStyle='#7a7c78'; ctx.lineWidth=2; ctx.beginPath(); for(let i=-128; i<=256; i+=16){ ctx.moveTo(i,0); ctx.lineTo(i+128,128); ctx.moveTo(i+128,0); ctx.lineTo(i,128); } ctx.stroke(); });

    // 3Dシーン構築
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1b29);
    scene.fog = new THREE.FogExp2(0x142431, 0.031);
    const camera = new THREE.PerspectiveCamera(78, innerWidth/innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); document.body.appendChild(renderer.domElement);
    function resize() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
      if (!isRun) renderer.render(scene, camera);
    }
    window.addEventListener('resize', resize);

    const ambLight = new THREE.HemisphereLight(0x82a4bf, 0x323e35, 0.75);
    scene.add(ambLight);
    const moonlight = new THREE.DirectionalLight(0xa9c9e8, 0.55);
    moonlight.position.set(45, 54, -120);
    scene.add(moonlight);
    const flash = new THREE.SpotLight(0xffe7b9, 9, 51, Math.PI / 4.5, 0.72, 1.65); camera.add(flash); flash.target.position.set(0,0,-5); camera.add(flash.target);
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
    const mGrass = new THREE.MeshStandardMaterial({map: texGrass, roughness: 0.95}), mRoad = new THREE.MeshStandardMaterial({map: texRoad, roughness: 0.9, metalness: 0});
    const mGrd = new THREE.MeshStandardMaterial({color: 0x888888, metalness: 0.5, roughness: 0.6}), mRust = new THREE.MeshStandardMaterial({color: 0x5a2d18, roughness: 0.9});
    const mClf = new THREE.MeshStandardMaterial({map: texCliff, roughness: 1}), mCon = new THREE.MeshStandardMaterial({map: texConc, roughness: 0.9, side: THREE.DoubleSide});
    const mFence = new THREE.MeshStandardMaterial({map: texFence, transparent: true, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4});

    // 地形・道路
    addM(new THREE.PlaneGeometry(500,500), mGrass, 0,0,0, -Math.PI/2); addM(new THREE.PlaneGeometry(10,240), mRoad, 0,0.02,10, -Math.PI/2);

    // ガードレール
    const isGap = z => [{min:35,max:60},{min:0,max:18},{min:-35,max:-20}].some(g=> z>=g.min && z<=g.max);
    for (let z=-45; z<=120; z+=6) {
      if(isGap(z)){ if(Math.random()>0.3) addM(new THREE.BoxGeometry(0.2,0.5,4.5), mRust, Math.random()>0.5?5.3:-5.3, 0.2, z, 0, (Math.random()-0.5)*0.8, (Math.random()-0.5)*1.2); continue; }
      addM(new THREE.BoxGeometry(0.15,0.5,5.8), mGrd, -5.2,0.8,z); addM(new THREE.BoxGeometry(0.15,0.5,5.8), mGrd, 5.2,0.8,z);
    }

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
    const carMat = new THREE.MeshStandardMaterial({color:0x881111, roughness:0.8});
    addM(new THREE.BoxGeometry(2.2, 1.2, 4.2), carMat, -25, 0.6, 15, 0, 0.4, 0.1);
    addM(new THREE.BoxGeometry(1.8, 0.8, 2.2), carMat, -25, 1.4, 14.5, 0, 0.4, 0.1);
    colls.push({x: -25, z: 15, r: 2.2});

    const wellMat = new THREE.MeshStandardMaterial({color:0x444444, roughness:0.9});
    addM(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 12, 1, true), wellMat, 30, 0.6, -10);
    colls.push({x: 30, z: -10, r: 1.6});

    // 山肌
    function buildRidge(profile, bottom, depth, z) {
      const shape = new THREE.Shape();
      shape.moveTo(profile[0][0], bottom);
      for (const [x, height] of profile) shape.lineTo(x, height);
      shape.lineTo(profile[profile.length - 1][0], bottom);
      shape.closePath();
      const rock = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      const positions = rock.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        rock.attributes.uv.setXY(i, (positions.getX(i) + positions.getZ(i)) / 16, positions.getY(i) / 13);
      }
      addM(rock, mClf, 0, 0, z);
    }
    buildRidge([[-91, 17], [-77, 29], [-65, 26], [-50, 38], [-35, 34], [-24, 27], [-14, 31], [-6, 18]], 0, 44, -94);
    buildRidge([[6, 18], [15, 26], [27, 24], [40, 33], [55, 28], [69, 31], [87, 17]], 0, 44, -94);
    buildRidge([[-7, 21], [-3, 17], [0, 22], [5, 19], [7, 22]], 8, 42, -94);

    // トンネル内部構造
    const tunnelGroup = new THREE.Group(); tunnelGroup.position.set(0, 0, -50);
    const arch = addM(new THREE.CylinderGeometry(5,5,35,32,1,true,0,Math.PI), mCon, 0,2,-67.5, Math.PI/2,Math.PI/2);
    addM(new THREE.BoxGeometry(0.5,2,35), mCon, -5.25,1,-67.5); addM(new THREE.BoxGeometry(0.5,2,35), mCon, 5.25,1,-67.5);
    addM(new THREE.BoxGeometry(11,8,1), mCon, 0,4,-85.5);

    // トンネル入口
    const shp = new THREE.Shape(); shp.moveTo(-20,0); shp.lineTo(20,0); shp.lineTo(20,15); shp.lineTo(-20,15); shp.lineTo(-20,0);
    const hl = new THREE.Path(); hl.moveTo(-5,0); hl.lineTo(-5,2); hl.absarc(0,2,5,Math.PI,0,true); hl.lineTo(5,0); hl.lineTo(-5,0); shp.holes.push(hl);
    const fGeo = new THREE.ExtrudeGeometry(shp, {depth:0.5, bevelEnabled:false});
    for(let i=0; i<fGeo.attributes.position.count; i++) fGeo.attributes.uv.setXY(i, fGeo.attributes.position.getX(i)/8, fGeo.attributes.position.getY(i)/8);
    addM(fGeo, mCon, 0,0,-50.25);
    addM(new THREE.BoxGeometry(1,9,1.5), mCon, -5.5,4.5,-49.5); addM(new THREE.BoxGeometry(1,9,1.5), mCon, 5.5,4.5,-49.5);
    addM(new THREE.BoxGeometry(12,1.5,1.6), new THREE.MeshStandardMaterial({map: texWarn, roughness: 0.8}), 0,9.25,-49.5);

    // 非常灯・PCデスク
    [-58,-68,-78].forEach(z=>{ addM(new THREE.BoxGeometry(0.3,0.4,0.2), new THREE.MeshBasicMaterial({color:0xff6600}), -4.8,4,z); const l=new THREE.PointLight(0xff6600,1.5,12); l.position.set(-4.4,4,z); scene.add(l); });

    const entryLamp = new THREE.MeshBasicMaterial({ color: 0xffb16b });
    for (const x of [-4.3, 4.3]) {
      addM(new THREE.BoxGeometry(.22, .6, .18), entryLamp, x, 2.6, -49.1);
    }
    const entryGlow = new THREE.PointLight(0xff9857, 1.6, 13);
    entryGlow.position.set(0, 3, -48);
    scene.add(entryGlow);

    const deskM = new THREE.MeshStandardMaterial({color:0x333333, roughness:0.7});
    addM(new THREE.BoxGeometry(2.4, 0.1, 1.2), deskM, 0, 1.0, -83.5);
    addM(new THREE.BoxGeometry(0.1, 1.0, 1.0), deskM, -1.1, 0.5, -83.5);
    addM(new THREE.BoxGeometry(0.1, 1.0, 1.0), deskM, 1.1, 0.5, -83.5);

    const pcM = new THREE.MeshStandardMaterial({color:0x222222, roughness:0.6});
    addM(new THREE.BoxGeometry(0.9, 0.05, 0.6), pcM, 0, 1.075, -83.3);
    const pcMon = addM(new THREE.BoxGeometry(0.9, 0.6, 0.05), pcM, 0, 1.35, -83.55, -0.1);
    addM(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({color:0xffffff, emissive:0x0088ff, emissiveIntensity: 0.8}), 0, 1.35, -83.52, -0.1);
    const pcLight = new THREE.PointLight(0x00aaff, 1.0, 5); pcLight.position.set(0, 1.5, -83.0); scene.add(pcLight);

    // 🌲 リアル針葉樹
    // Each part has its own searchable area, with a safe fallback off the obstacle line.
    const partZones = [
      { x: -22, z: 19, name: '廃車の周辺' },
      { x: 27, z: -7, name: '井戸の周辺' },
      { x: -18, z: -29, name: 'トンネル手前の左の林' },
      { x: 19, z: 39, name: '道路南側の林' }
    ];
    const trees = [];
    function addTree(x, z, scale = 1, radius = 0.7) {
      if (Math.hypot(x, z) < 6 || partZones.some(zone => Math.hypot(x - zone.x, z - zone.z) < 2)) return;
      trees.push({ x, z, scale, yaw: Math.random() * Math.PI });
      colls.push({ x, z, r: radius });
    }
    for(let i=0;i<120;i++){ let x=(Math.random()-0.5)*140, z=(Math.random()-0.5)*120; if(Math.abs(x)<7) x+=x>=0?8:-8; if(z>-48) addTree(x,z); }
    for(let i=0;i<350;i++){ let r=75+Math.random()*120, a=Math.random()*Math.PI*2, x=Math.cos(a)*r, z=Math.sin(a)*r; if(!(z<-45 && Math.abs(x)<20)) addTree(x,z,1.2,1.0); }

    // Four instanced meshes share the geometry and materials for the whole forest.
    const treeTrunk = new THREE.MeshStandardMaterial({color:0x110a05, roughness:1});
    const treeLeaves = new THREE.MeshStandardMaterial({color:0x050d05, roughness:0.9});
    const treeTransform = new THREE.Object3D();
    for (const { geometry, material, height } of [
      { geometry: new THREE.CylinderGeometry(0.3, 0.5, 3.5, 7), material: treeTrunk, height: 1.75 },
      { geometry: new THREE.ConeGeometry(2.4, 4, 8), material: treeLeaves, height: 4 },
      { geometry: new THREE.ConeGeometry(1.9, 3.5, 8), material: treeLeaves, height: 5.5 },
      { geometry: new THREE.ConeGeometry(1.3, 3, 8), material: treeLeaves, height: 7 }
    ]) {
      const mesh = new THREE.InstancedMesh(geometry, material, trees.length);
      trees.forEach(({ x, z, scale, yaw }, index) => {
        treeTransform.position.set(x, height * scale, z);
        treeTransform.rotation.y = yaw;
        treeTransform.scale.setScalar(scale);
        treeTransform.updateMatrix();
        mesh.setMatrixAt(index, treeTransform.matrix);
      });
      scene.add(mesh);
    }

    // アイテムスポーン
    const bats=[], parts=[], bG=new THREE.CylinderGeometry(0.2,0.2,0.5,8), bM=new THREE.MeshStandardMaterial({color:0xffff00,emissive:0x888800}), partG=new THREE.BoxGeometry(0.5,0.2,0.4), partM=new THREE.MeshStandardMaterial({color:0x00ff66,emissive:0x00aa44});
    function spawnAt(arr, geo, mat, zone) {
      let x = zone.x, z = zone.z;
      for (let attempt = 0; attempt < 24; attempt++) {
        const candidateX = zone.x + (Math.random() - 0.5) * 8;
        const candidateZ = zone.z + (Math.random() - 0.5) * 8;
        if (colls.every(o => Math.hypot(candidateX - o.x, candidateZ - o.z) > o.r + 0.7)) {
          x = candidateX;
          z = candidateZ;
          break;
        }
      }
      const item = addM(geo, mat, x, 0.35, z);
      item.userData.zone = zone.name;
      arr.push(item);
    }
    function spawnBattery() {
      const zones = [
        { x: 0, z: 46 }, { x: -11, z: 49 }, { x: 11, z: 11 }, { x: -10, z: 9 },
        { x: -14, z: -25 }, { x: 15, z: -29 }, { x: -2, z: -34 }, { x: 2, z: 13 }
      ];
      for (const zone of zones) spawnAt(bats, bG, bM, zone);
    }

    // 敵
    const enemy = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.TextureLoader().load('kokunii.PNG')})); enemy.scale.set(3.5,3.5,1); scene.add(enemy);

    // 変数定義
    let isRun=false, isOver=false, isClr=false, light=true, isDash=false, batt=100, stam=100, pCnt=0, noBatt=0, eSt='P', pTgt=new THREE.Vector3(), eDir=new THREE.Vector3(0,0,1), lastT=0;
    let headBobTime = 0;
    const keys = { yaw: 0, pitch: 0 };
    let mTch=null, lTch=null, mSt={x:0,y:0}, lSt={x:0,y:0}, mDir={f:0,s:0};

    const touchDevice = navigator.maxTouchPoints > 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let paused = false;
    let sprintExhausted = false;
    const running = () => isRun && !paused && !isOver && !isClr;
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
    function pause() {
      if (!running()) return;
      paused = true;
      document.body.dataset.mode = 'paused';
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      clearInputs();
      unlockView();
      if (activeStep) { activeStep.pause(); activeStep = null; }
      aEnv.pause();
      aChase.pause();
      el('pause-screen').style.display = 'grid';
      el('resume-btn').focus();
    }
    function resume(event) {
      paused = false;
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
    const tracks = [aEnv, aChase, aOver, aWalk, aDash, aGrass];
    let muted = false;
    el('sound-btn').addEventListener('click', () => {
      muted = !muted;
      tracks.forEach(track => { track.muted = muted; });
      el('sound-btn').textContent = muted ? '音声 OFF' : '音声 ON';
      el('sound-btn').setAttribute('aria-pressed', String(muted));
    });
    el('resume-btn').addEventListener('click', resume);
    window.addEventListener('blur', pause);
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
      pTgt.set((Math.random() - 0.5) * 145, 1.85, -40 + Math.random() * 142);
    }
    el('start-btn').onclick = event => {
      if (isRun) return;
      isRun = true;
      camera.position.set(0, 1.8, 25);
      setLight(true);
      enemy.position.set(29, 1.85, -20);
      patrolTarget();
      spawnBattery();
      for (const zone of partZones) spawnAt(parts, partG, partM, zone);
      el('start-screen').style.display = 'none';
      el('ui-top-left').style.display = 'flex';
      el('pause-btn').style.display = 'block';
      if (touchDevice) {
        el('light-btn').style.display = 'block';
        dashButton.style.display = 'block';
      } else {
        el('view-cue').style.display = 'block';
      }
      resume(event);
    };

    window.addEventListener('keydown', event => {
      if (!running()) return;
      if (event.code === 'Escape') { pause(); return; }
      if (event.code.startsWith('Arrow')) event.preventDefault();
      keys[event.code] = true;
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
    let pickupUntil = 0;
    function showPickup(message) {
      const notice = el('pickup-notice');
      notice.textContent = message;
      notice.style.display = 'block';
      pickupUntil = elapsed + 2.4;
    }
    function summary() {
      const seconds = Math.floor(elapsed % 60);
      return `部品 ${pCnt} / 4　捜索時間 ${Math.floor(elapsed / 60)}:${String(seconds).padStart(2, '0')}`;
    }
    function updateMeter(id, value) {
      el(id + '-lv').style.width = value + '%';
      const readout = el(id + '-value');
      const label = Math.ceil(value) + '%';
      if (readout.textContent !== label) readout.textContent = label;
    }
    const directionArrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    function arrowTo(x, z) {
      const angle = Math.atan2(x - camera.position.x, camera.position.z - z) + keys.yaw;
      const direction = Math.round(angle / (Math.PI / 4));
      return directionArrows[((direction % 8) + 8) % 8];
    }
    function updateObjective() {
      const objective = pCnt >= 4 ? 'トンネル奥のPCへ戻る' : `部品を探す ${pCnt} / 4`;
      if (el('objective').textContent !== objective) el('objective').textContent = objective;
      let nearest = null;
      let nearestDistance = Infinity;
      for (const part of parts) {
        const distance = Math.hypot(part.position.x - camera.position.x, part.position.z - camera.position.z);
        if (distance < nearestDistance) { nearest = part; nearestDistance = distance; }
      }
      const inTunnel = camera.position.z < -49;
      const exitX = inTunnel ? pcMon.position.x : 0;
      const exitZ = inTunnel ? pcMon.position.z : -51;
      const hint = nearest
        ? `${arrowTo(nearest.position.x, nearest.position.z)} 近い捜索地点：${nearest.userData.zone}`
        : `${arrowTo(exitX, exitZ)} ${inTunnel ? 'トンネル奥のPC' : 'トンネル入口'}`;
      if (el('hud-hint').textContent !== hint) el('hud-hint').textContent = hint;
    }

    // 描画ループ
    function animate() {
      frameId = null;
      if (!running()) return;
      frameId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      elapsed += dt;
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
      const spd = sprinting ? 7.2 : 4.2;

      // 🎥 ヘッドボブ（カメラ揺れ）
      if(isMv && !reducedMotion) {
        headBobTime += dt * (sprinting ? 14 : 8);
        camera.position.y = 1.8 + Math.sin(headBobTime) * (sprinting ? 0.08 : 0.04);
      } else { camera.position.y = 1.8; }

      // 👣 足音の完全制御（遅延・衝突バグ解消版）
      if(isMv) {
        let onRoad = Math.abs(camera.position.x) <= 5.5;
        let targetStep = onRoad ? (sprinting ? aDash : aWalk) : aGrass;

        if(targetStep === aGrass) targetStep.playbackRate = sprinting ? 1.4 : 1.0;

        if(activeStep !== targetStep) {
          if(activeStep) activeStep.pause();
          activeStep = targetStep;
          activeStep.currentTime = 0; // 最初から再生
          activeStep.play().catch(()=>{});
        }
      } else {
        if(activeStep) {
          activeStep.pause();
          activeStep = null;
        }
      }

      // UI更新
      if(light && batt>0){ batt-=dt*0.2; if(batt<=0){ batt=0; setLight(false); } }
      updateMeter('bat', batt);
      el('bat-lv').classList.toggle('low', batt <= 20);
      if (sprinting) {
        stam = Math.max(0, stam - dt * 25);
        if (stam === 0) sprintExhausted = true;
      } else if (!sprintRequested) {
        stam = Math.min(100, stam + dt * 15);
      }
      updateMeter('sta', stam);

      const wTxt = el('warning-text');
      document.body.dataset.threat = String(eSt === 'C' || batt <= 0);
      if(batt<=0){
        noBatt += dt; wTxt.style.display = 'block'; wTxt.textContent = `暗闇　${Math.max(0, 5 - noBatt).toFixed(1)}秒で急襲`;
        if(noBatt>=5){
          enemy.position.copy(camera.position).add(new THREE.Vector3(0,0,-1.2).applyAxisAngle(new THREE.Vector3(0,1,0), keys.yaw));
          triggerGameOver("暗闇の中で捕まった..."); return;
        }
      } else {
        noBatt=0;
        if (eSt === 'C') {
          wTxt.style.display = 'block';
          wTxt.textContent = 'こくにいに追われている';
        } else { wTxt.style.display='none'; }
      }

      // アイテム取得
      [bats, parts].forEach((arr, idx) => {
        for(let i=arr.length-1; i>=0; i--){
          arr[i].rotation.y+=dt*(idx?3:2);
          if(Math.hypot(camera.position.x - arr[i].position.x, camera.position.z - arr[i].position.z) < 1.5){
            scene.remove(arr[i]); arr.splice(i,1);
            if(!idx){ batt=100; setLight(true); showPickup('電池を交換した'); }
            else{
              pCnt++;
              showPickup(`部品を回収　${pCnt} / 4`);
              const pIcons = el('parts-icons').children;
              for(let j=0; j<4; j++) if(j < pCnt) pIcons[j].classList.add('active');
            }
          }
        }
      });

      updateObjective();

      // クリア判定
      if(pCnt>=4 && Math.hypot(camera.position.x - pcMon.position.x, camera.position.z - pcMon.position.z) < 2.5) {
        isClr=true;
        if(activeStep) activeStep.pause();
        aEnv.pause();
        aChase.pause();
        unlockView();
        document.body.dataset.mode = 'clear';
        el('clear-stats').textContent = summary();
        el('game-clear').style.display = 'grid';
        return;
      }

      camera.rotation.set(keys.pitch, keys.yaw, 0, 'YXZ');
      const oX = camera.position.x, oZ = camera.position.z;
      walkVector.set(tS, 0, -tF).clampLength(0, 1).applyAxisAngle(up, keys.yaw);
      camera.position.addScaledVector(walkVector, spd * dt);

      for(let t of colls){ let dx=camera.position.x-t.x, dz=camera.position.z-t.z, d=Math.hypot(dx,dz), minD=t.r+0.3; if(d>0 && d<minD) { camera.position.x+=(dx/d)*(minD-d); camera.position.z+=(dz/d)*(minD-d); } }
      if(camera.position.z<60 && camera.position.z>-50 && !isGap(camera.position.z)) { if(oX>=-5&&oX<=5) camera.position.x=Math.max(-5,Math.min(5,camera.position.x)); else camera.position.x=oX>5?Math.max(5.3,camera.position.x):Math.min(-5.3,camera.position.x); }
      if(camera.position.z<-49) { if(camera.position.x>-4.6 && camera.position.x<4.6) camera.position.z=Math.max(-84,camera.position.z); else { if(oZ>=-49) camera.position.z=-49; else camera.position.x=oX>0?Math.max(4.6,camera.position.x):Math.min(-4.6,camera.position.x); } }
      camera.position.set(Math.max(-129,Math.min(129,camera.position.x)), camera.position.y, Math.max(-84,Math.min(129,camera.position.z)));

      // 👁️📈 こくにいAI
      const pVec = enemyOffset.subVectors(camera.position, enemy.position); pVec.y=0; const pDist = pVec.length();

      const currentChaseSpeed = 4.5 + pCnt * 0.52;
      const detectRange = 16 + (pCnt * 4) + (light ? 8 : 0);

      if(eSt==='P') {
        if(pDist < detectRange) {
          const angle = eDir.angleTo(enemyMove.copy(pVec).normalize());
          if(angle < Math.PI / 3 || pDist < 8) eSt='C';
        }
      } else if(eSt==='C') {
        if(pDist > detectRange + 8) { eSt='P'; patrolTarget(); }
      }

      const moveDir = eSt === 'C' ? enemyMove.copy(pVec) : enemyMove.subVectors(pTgt, enemy.position).setY(0);
      if (eSt === 'C' && (camera.position.z < -49) !== (enemy.position.z < -49) && Math.abs(enemy.position.x) >= 4) {
        // The chase crosses the cliff through the tunnel mouth.
        moveDir.set(-enemy.position.x, 0, -47 - enemy.position.z);
      }
      moveDir.normalize();
      if(eSt==='P' && enemy.position.distanceTo(pTgt)<1.5) patrolTarget();
      enemy.position.addScaledVector(moveDir, (eSt === 'C' ? currentChaseSpeed : 2.1) * dt);
      if (enemy.position.z < -49) {
        enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -4.4, 4.4);
      }
      enemy.position.y = 1.85;
      eDir.copy(moveDir);

      // ⚠️ 追跡BGMの制御
      if(eSt==='C' && pDist<18){
        if(aChase.paused) {
          aChase.currentTime = 0;
          aChase.play().catch(()=>{});
        }
        aChase.volume = Math.pow(Math.max(0, 1 - pDist/18), 1.2) * 0.8;
      } else {
        if(!aChase.paused){
          aChase.pause();
        }
      }

      if(pDist<1.5){ triggerGameOver("こくにいに捕まった！"); }
      renderer.render(scene, camera);
    }

    function triggerGameOver(reason) {
      isOver = true;
      document.body.dataset.mode = 'over';
      if(activeStep) { activeStep.pause(); activeStep = null; }
      aEnv.pause();
      aChase.pause();

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
