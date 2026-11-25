/* The chase track is unlocked with Start/Resume, then mixed by the game. */
function createChaseAudio(url, getContext) {
  let context;
  let gain;
  let clip;
  let loading;
  let source;
  let target = 0;

  function update() {
    if (!context || !clip || context.state !== 'running') return;
    if (!source && target > 0) {
      source = context.createBufferSource();
      source.buffer = clip;
      source.loop = true;
      source.connect(gain);
      source.start();
    }
    if (source) gain.gain.setTargetAtTime(target, context.currentTime, target > 0 ? .12 : .08);
  }

  function unlock() {
    if (!context) {
      try {
        context = getContext();
      } catch (error) {
        console.warn('Could not open chase audio', error);
        return;
      }
      if (!context) return;
      gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
    }
    if (context.state !== 'running') context.resume().then(update).catch(() => {});
    if (!loading) {
      loading = fetch(url).then(response => {
        if (!response.ok) throw new Error(`Chase audio: HTTP ${response.status}`);
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes)).then(buffer => {
        clip = buffer;
        update();
      }).catch(error => {
        loading = null;
        console.warn(error);
      });
    }
  }

  function level(volume) {
    if (Math.abs(target - volume) < .015 && volume !== 0) return;
    if (target === volume) return;
    target = volume;
    if (volume === 0 && source) {
      const previousSource = source;
      source = null;
      previousSource.stop();
      previousSource.disconnect();
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
    } else {
      update();
    }
  }

  return { unlock, level };
}
