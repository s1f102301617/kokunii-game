function createFootsteps(getContext) {
  const files = {
    walk: 'アスファルトの上を歩く1.mp3',
    run: 'アスファルトの上を歩く2.mp3',
    grass: '芝生の上を歩く.mp3'
  };
  const buffers = {};
  let context, gain, loading, source;
  let wanted = '';
  let speed = 1;

  function sync() {
    if (!context || context.state !== 'running') return;
    if (source?.name === wanted) {
      source.node.playbackRate.value = speed;
      return;
    }
    if (source) {
      source.node.stop();
      source.node.disconnect();
      source = null;
    }
    const clip = buffers[wanted];
    if (!clip) return;
    const node = context.createBufferSource();
    node.buffer = clip;
    node.loop = true;
    node.playbackRate.value = speed;
    node.connect(gain);
    gain.gain.value = wanted === 'grass' ? .86 : .66;
    node.start();
    source = {name:wanted, node};
  }

  function unlock() {
    if (!context) {
      try {
        context = getContext();
      } catch (error) {
        console.warn('Could not open footstep audio', error);
        return;
      }
      if (!context) return;
      gain = context.createGain();
      gain.connect(context.destination);
    }
    if (context.state !== 'running') context.resume().then(sync).catch(() => {});
    if (!loading) {
      loading = Promise.all(Object.entries(files).map(async ([name, file]) => {
        try {
          const response = await fetch(file);
          if (!response.ok) throw new Error(file + ': ' + response.status);
          buffers[name] = await context.decodeAudioData(await response.arrayBuffer());
          sync();
        } catch (error) {
          console.warn(error);
        }
      }));
    }
  }

  function play(surface, rate = 1) {
    wanted = surface;
    speed = rate;
    if (wanted || source) sync();
  }
  return { unlock, play };
}
