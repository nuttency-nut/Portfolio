(() => {
  const tracks = [
    {
      cover: 'if-only',
      file: 'if-only.mp3',
      title: 'If Only',
      originalTitle: 'ขอโทษได้ไหม',
      artist: 'NONT TANONT & BILLKIN',
      color: '#202020'
    },
    {
      cover: 'golden-night',
      file: 'golden-night.mp3',
      title: 'Golden Night',
      originalTitle: 'ของขวัญปีใหม่',
      artist: 'Jeff Satur',
      color: '#304c59'
    },
    {
      cover: 'just-being-friendly',
      file: 'just-being-friendly.mp3',
      title: 'Just Being Friendly',
      originalTitle: 'เพื่อนเล่น ไม่เล่นเพื่อน',
      artist: 'Tilly Birds feat. MILLI',
      color: '#9b506f'
    },
    {
      cover: 'golden-hour',
      file: 'golden-hour.mp3',
      title: 'Golden Hour',
      originalTitle: '',
      artist: 'BILLKIN',
      color: '#40351f'
    },
    {
      cover: 'guess-who',
      file: 'guess-who.mp3',
      title: 'Guess Who?',
      originalTitle: 'เธอ ๆ เพื่อนเราชอบ',
      artist: 'SERIOUS BACON',
      color: '#75664b'
    }
  ];
  const poses = [
    { y: 0, rotation: -15 },
    { y: 10, rotation: 8 },
    { y: -14, rotation: -5 },
    { y: 10, rotation: 12 },
    { y: 10, rotation: -5 }
  ];
  const deck = document.getElementById('deck');
  const card = deck.closest('.music');
  const hint = card.querySelector('.hint');
  const defaultHint = 'Bấm vào một bài để nghe';
  const audio = document.createElement('audio');
  audio.id = 'hobby-audio';
  audio.preload = 'none';
  audio.volume = .4;
  card.append(audio);
  hint.setAttribute('role', 'status');
  let active = -1;
  let spacing = 78;

  const buttons = tracks.map((track, index) => {
    const button = document.createElement('button');
    const fullTitle = track.originalTitle ? `${track.originalTitle} (${track.title})` : track.title;
    button.type = 'button';
    button.className = 'track';
    button.title = `${fullTitle} — ${track.artist}`;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', `Phát ${fullTitle} — ${track.artist}`);
    button.style.setProperty('--bg', track.color);
    button.innerHTML = `
      <div class="art">
        <img src="assets/images/hobby/music-covers/${track.cover}.jpg" width="500" height="500" alt="" loading="lazy" decoding="async" />
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
      <h4>${track.title}</h4>
      <p>${track.artist}</p>
      <div class="ctrl" aria-hidden="true"><b>▶</b><i></i></div>`;
    button.addEventListener('click', event => {
      event.stopPropagation();
      select(index);
    });
    deck.append(button);
    return button;
  });

  function layout() {
    const middle = (tracks.length - 1) / 2;
    buttons.forEach((button, index) => {
      const offset = (index - middle) * spacing;
      const selected = index === active;
      const expanded = active >= 0;
      button.style.setProperty('--x', `${selected ? 0 : expanded ? offset * .4 : offset}px`);
      button.style.setProperty('--y', `${selected ? 8 : expanded ? 150 : poses[index].y}px`);
      button.style.setProperty('--r', `${selected ? 0 : expanded ? poses[index].rotation * .2 : poses[index].rotation}deg`);
      button.style.setProperty('--s', selected ? 1.1 : expanded ? .7 : 1);
      button.style.zIndex = selected ? 50 : index + 2;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-expanded', String(selected));
    });
  }

  function setStatus(message = defaultHint, error = false) {
    hint.textContent = message;
    card.classList.toggle('has-music-error', error);
  }

  function updatePlayback() {
    buttons.forEach((button, index) => {
      const playing = index === active && !audio.paused && !audio.ended && !audio.error;
      button.classList.toggle('playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', `${playing ? 'Tạm dừng' : 'Phát'} ${button.title}`);
      button.querySelector('.ctrl b').textContent = playing ? '❚❚' : '▶';
    });
  }

  async function select(index) {
    if (active !== index) {
      audio.pause();
      active = index;
      audio.src = `assets/audio/hobby/${encodeURIComponent(tracks[index].file)}`;
      buttons.forEach(button => button.style.setProperty('--p', '0%'));
      layout();
    } else if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }

    if (audio.error) {
      audio.src = `assets/audio/hobby/${encodeURIComponent(tracks[index].file)}?v=${Date.now()}`;
    }
    if (audio.ended) audio.currentTime = 0;
    setStatus('Đang tải bài hát…');
    try {
      await audio.play();
    } catch (error) {
      if (active !== index || error.name === 'AbortError') return;
      updatePlayback();
      setStatus('Chưa phát được bài này. Kiểm tra file MP3 rồi thử lại nhé.', true);
    }
  }

  audio.addEventListener('playing', () => {
    setStatus();
    updatePlayback();
  });
  audio.addEventListener('pause', updatePlayback);
  audio.addEventListener('ended', updatePlayback);
  audio.addEventListener('error', () => {
    updatePlayback();
    setStatus('Chưa có file nhạc cho bài này.', true);
  });
  audio.addEventListener('timeupdate', () => {
    if (active < 0 || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const progress = Math.min(100, audio.currentTime / audio.duration * 100);
    buttons[active].style.setProperty('--p', `${progress}%`);
  });
  document.addEventListener('pointerdown', event => {
    if (active < 0 || event.target.closest('.track')) return;
    audio.pause();
    active = -1;
    layout();
    updatePlayback();
    setStatus();
  });
  window.addEventListener('pagehide', () => audio.pause());
  new ResizeObserver(() => {
    spacing = Math.min(78, (card.clientWidth - 194) / 4.4);
    layout();
  }).observe(card);
  setStatus();
})();
