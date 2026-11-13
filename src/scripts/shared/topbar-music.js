(() => {
  const player = document.querySelector('.topbar-music');
  if (!player) return;
  const audio = player.querySelector('audio');
  let sourceURL = audio.src || audio.querySelector('source[src]')?.src || '';
  let preparedURL = null;
  let preparation = null;
  const STATE_KEY = 'portfolio-music-navigation';
  const pageKey = url => `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}`;
  let navigationTarget = null;

  function readContinuation(fromHistory = false) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY));
      sessionStorage.removeItem(STATE_KEY);
      const navigationType = performance.getEntriesByType('navigation')[0]?.type;
      if (!saved || (!fromHistory && navigationType === 'reload')) return null;
      if (!fromHistory && navigationType !== 'back_forward' && saved.to !== pageKey(new URL(location.href))) return null;
      if (saved.source !== sourceURL || !Number.isFinite(saved.time) || saved.time < 0 || typeof saved.playing !== 'boolean') return null;
      return saved;
    } catch {
      return null;
    }
  }

  const continuation = readContinuation();
  function prepareAudio() {
    const fileURL = audio.src || audio.querySelector('source[src]')?.src;
    if (fileURL === preparedURL) return Promise.resolve();
    if (preparation?.source === fileURL) return preparation.promise;
    sourceURL = fileURL;
    // A local Blob is seekable even when a static server has no byte-range support.
    const promise = fetch(fileURL).then(async response => {
      if (!response.ok) return;
      const file = await response.blob();
      const currentURL = audio.src || audio.querySelector('source[src]')?.src;
      if (currentURL !== fileURL) return;
      if (preparedURL) URL.revokeObjectURL(preparedURL);
      preparedURL = URL.createObjectURL(file);
      audio.src = preparedURL;
    }).catch(() => {}); // Native playback handles network/media errors if fetching fails.
    preparation = { source: fileURL, promise };
    return promise;
  }
  const MUSIC_VOLUME = .4;
  // Route through a gain node because iOS can ignore HTMLMediaElement.volume.
  const Context = window.AudioContext || window.webkitAudioContext;
  const context = Context ? new Context() : null;
  audio.volume = MUSIC_VOLUME;
  if (context) {
    const gain = context.createGain();
    gain.gain.value = MUSIC_VOLUME;
    context.createMediaElementSource(audio).connect(gain).connect(context.destination);
    audio.volume = 1; // Apply the reduction once, in the gain node.
  }
  const button = player.querySelector('.music-toggle');
  const status = player.querySelector('.music-status');
  const titleWindow = player.querySelector('.music-title-window');
  const titleTrack = player.querySelector('.music-title-track');
  const title = player.querySelector('.music-title');
  const copy = title.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  titleTrack.append(copy);
  let statusTimer;
  let automaticPending = continuation ? continuation.playing : true;
  function stopAutomatic() {
    automaticPending = false;
    document.removeEventListener('click', fromGesture);
    document.removeEventListener('keydown', fromGesture);
  }
  function fromGesture(event) {
    if (!automaticPending || !event.isTrusted || button.contains(event.target)) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    void start(true);
  }
  const message = text => {
    clearTimeout(statusTimer);
    status.textContent = text;
    status.hidden = !text;
    if (text) statusTimer = setTimeout(() => { status.hidden = true; }, 4500);
  };
  const sync = () => {
    const playing = !audio.paused && !audio.ended && !audio.error && (!context || context.state === 'running');
    player.dataset.playing = String(playing);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Tạm dừng nhạc' : 'Phát nhạc');
    if (!playing) button.removeAttribute('aria-busy');
    else stopAutomatic();
  };
  function restorePosition(saved) {
    const seek = () => {
      audio.currentTime = Number.isFinite(audio.duration) && audio.duration > 0 ? saved.time % audio.duration : saved.time;
      sync();
    };
    if (audio.readyState >= 1) seek();
    else {
      audio.addEventListener('loadedmetadata', seek, { once: true });
      audio.preload = 'metadata';
      audio.load();
    }
  }
  async function start(automatic = false) {
    if (!audio.getAttribute('src') && !audio.querySelector('source[src]')) {
      stopAutomatic();
      message('Bài hát chưa sẵn sàng.');
      return;
    }
    message('');
    button.setAttribute('aria-busy', 'true');
    try {
      // Resume the context during the user gesture, before waiting for the file.
      const resumed = context ? context.resume().catch(() => false) : Promise.resolve(true);
      await prepareAudio();
      await audio.play();
      if (await resumed === false) {
        audio.pause();
        if (!automatic) message('Chưa phát được bài hát. Bạn thử lại nhé.');
      }
      sync();
    }
    catch (error) {
      button.removeAttribute('aria-busy');
      if (!(automatic && error.name === 'NotAllowedError') && error.name !== 'AbortError') {
        stopAutomatic();
        message('Chưa phát được bài hát. Bạn thử lại nhé.');
      }
      sync();
    }
  }
  button.addEventListener('click', () => {
    stopAutomatic();
    if (!audio.paused && (!context || context.state === 'running')) audio.pause();
    else void start();
  });
  for (const name of ['play', 'pause', 'ended', 'emptied']) audio.addEventListener(name, sync);
  audio.addEventListener('playing', () => { button.removeAttribute('aria-busy'); message(''); sync(); });
  audio.addEventListener('waiting', () => button.setAttribute('aria-busy', 'true'));
  audio.addEventListener('error', () => { stopAutomatic(); button.removeAttribute('aria-busy'); message('Bài hát chưa sẵn sàng.'); sync(); });
  context?.addEventListener('statechange', sync);
  button.disabled = false;
  const measure = () => {
    const overflow = title.getBoundingClientRect().width > titleWindow.clientWidth;
    const distance = title.getBoundingClientRect().width + 24;
    copy.hidden = !overflow;
    player.dataset.overflow = String(overflow);
    titleTrack.style.setProperty('--music-title-distance', `${distance}px`);
    titleTrack.style.setProperty('--music-title-duration', `${Math.max(8, distance / 28)}s`);
  };
  const observer = new ResizeObserver(measure);
  observer.observe(titleWindow);
  observer.observe(title);
  document.addEventListener('visibilitychange', () => {
    document.documentElement.dataset.pageHidden = String(document.hidden);
  });
  document.addEventListener('click', event => {
    navigationTarget = null;
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin) return;
    if (destination.hash && pageKey(destination) === pageKey(new URL(location.href))) return;
    const path = destination.pathname.replace(/\/+$/, '').toLowerCase();
    if (path !== '' && path !== '/about' && path !== '/project' && !path.startsWith('/project/')) return;
    queueMicrotask(() => {
      if (!event.defaultPrevented) navigationTarget = pageKey(destination);
    });
  });
  window.addEventListener('pagehide', event => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        to: navigationTarget,
        source: sourceURL,
        time: audio.currentTime,
        playing: automaticPending || (!audio.paused && !audio.ended && !audio.error)
      }));
    } catch {}
    audio.pause();
    if (!event.persisted && preparedURL) URL.revokeObjectURL(preparedURL);
  });
  window.addEventListener('pageshow', event => {
    navigationTarget = null;
    if (!event.persisted) return;
    const saved = readContinuation(true);
    if (!saved) return;
    stopAutomatic();
    audio.pause();
    automaticPending = saved.playing;
    void initializePlayback(saved);
  });

  async function initializePlayback(saved) {
    if (saved) {
      await prepareAudio();
      restorePosition(saved);
    }
    sync();
    if (automaticPending) {
      document.addEventListener('click', fromGesture);
      document.addEventListener('keydown', fromGesture);
      void start(true);
    }
  }
  measure();
  void initializePlayback(continuation);
})();
