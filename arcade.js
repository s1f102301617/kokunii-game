const escapeCommands = [
  { label:'波動拳', directions:[2, 3, 6], arrows:'↓ ↘ →', window:1800 },
  { label:'昇竜拳', directions:[6, 2, 3], arrows:'→ ↓ ↘', window:1800 },
  { label:'真空波動拳', directions:[2, 3, 6, 2, 3, 6], arrows:'↓ ↘ → ↓ ↘ →', window:2800 }
];

function matchesEscapeCommand(samples, command, now) {
  const tail = samples.slice(-command.directions.length);
  if (tail.length !== command.directions.length || now - tail[0].time > command.window) return false;
  if (now - tail.at(-1).time > 800) return false;
  return tail.every((sample, index) => sample.direction === command.directions[index]);
}

function createArcadeTerminal(onComplete, canInput) {
  const screen = document.getElementById('arcade-screen');
  const instructions = document.getElementById('arcade-sequence');
  const title = document.getElementById('arcade-command');
  const status = document.getElementById('arcade-status');
  const history = document.getElementById('arcade-history');
  const steps = document.getElementById('arcade-steps');
  const pad = document.getElementById('arcade-pad');
  const punch = document.getElementById('arcade-punch');
  const keys = new Set();
  const symbols = {1:'↙',2:'↓',3:'↘',4:'←',6:'→',7:'↖',8:'↑',9:'↗'};
  const horizontal = code => ({
    ArrowLeft:-1, KeyA:-1, ArrowRight:1, KeyD:1
  })[code] || 0;
  const vertical = code => ({
    ArrowDown:-1, KeyS:-1, ArrowUp:1, KeyW:1
  })[code] || 0;
  let active = false;
  let step = 0;
  let samples = [];
  let pointer = null;

  function updateStep() {
    title.textContent = escapeCommands[step].label;
    instructions.textContent = escapeCommands[step].arrows + ' ＋ P';
    steps.textContent = `${step + 1} / ${escapeCommands.length}`;
    history.textContent = '入力履歴：—';
  }

  function direction(value) {
    if (!active || !canInput() || value === 5) return;
    const now = performance.now();
    if (samples.length && now - samples.at(-1).time > 900) samples = [];
    if (samples.at(-1)?.direction === value) return;
    samples.push({direction:value, time:now});
    if (samples.length > 12) samples.shift();
    history.textContent = '入力履歴：' + samples.slice(-8).map(sample => symbols[sample.direction]).join(' ');
  }

  function submit() {
    if (!active || !canInput()) return;
    if (!matchesEscapeCommand(samples, escapeCommands[step], performance.now())) {
      status.textContent = '入力が合っていません。表示の順にもう一度。';
      samples = [];
      history.textContent = '入力履歴：—';
      return;
    }
    step++;
    samples = [];
    if (step === escapeCommands.length) {
      active = false;
      screen.hidden = true;
      onComplete();
      return;
    }
    updateStep();
    status.textContent = '入力成功。次のコマンドを入力。';
  }

  function updateKeyboardDirection() {
    let x = 0, y = 0;
    for (const key of keys) {
      x += horizontal(key);
      y += vertical(key);
    }
    direction(5 + Math.sign(x) + 3 * Math.sign(y));
  }

  window.addEventListener('keydown', event => {
    if (!active || !canInput()) return;
    const keypad = /^Numpad([12346789])$/.exec(event.code);
    if (!horizontal(event.code) && !vertical(event.code) && !keypad && event.code !== 'KeyJ') return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'KeyJ') {
      submit();
    } else if (keypad) {
      direction(Number(keypad[1]));
    } else {
      keys.add(event.code);
      updateKeyboardDirection();
    }
  });
  window.addEventListener('keyup', event => {
    if (keys.delete(event.code) && active && canInput()) updateKeyboardDirection();
  });
  window.addEventListener('blur', () => keys.clear());

  function pointDirection(event) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element && pad.contains(element) && element.dataset.direction) direction(Number(element.dataset.direction));
  }
  pad.addEventListener('pointerdown', event => {
    if (!active || !canInput() || pointer !== null) return;
    pointer = event.pointerId;
    pad.setPointerCapture(pointer);
    pointDirection(event);
  });
  pad.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) pointDirection(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pad.addEventListener(type, event => { if (event.pointerId === pointer) pointer = null; });
  }
  pad.addEventListener('click', event => {
    if (event.detail === 0 && event.target.dataset.direction) direction(Number(event.target.dataset.direction));
  });
  punch.addEventListener('click', submit);

  return {
    start() {
      active = true;
      screen.hidden = false;
      keys.clear();
      updateStep();
      status.textContent = '方向を入力してから P を押す。失敗しても再挑戦できます。';
      document.getElementById('arcade-title').focus();
    }
  };
}
