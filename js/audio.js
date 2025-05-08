const music = new Audio('assets/sounds/background-music.wav');
const clickSound = new Audio('assets/sounds/click.wav');

music.loop = true;

// Volume inicial em silêncio por segurança de autoplay
music.volume = 0;

// Forçar tentativa inicial de reprodução (alguns browsers bloqueiam)
music.play().catch(() => {
  // Se falhar, aguardar primeiro clique
  window.addEventListener('click', tryPlayMusicOnce, { once: true });
});

function tryPlayMusicOnce() {
  updateAudioSettings(); // Garante que volume e estado estão corretos
  music.play().catch(() => {});
}

// Volumes iniciais (com fallback)
let musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let musicVolume = parseFloat(localStorage.getItem('musicVolume')) || 60;
let soundVolume = parseFloat(localStorage.getItem('soundVolume')) || 70;

clickSound.volume = soundVolume / 100;

// Inicializar música se possível
if (musicEnabled) {
  music.volume = musicVolume / 100;
} else {
  music.pause();
}

// Som de clique em botões
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('click', () => {
    if (soundEnabled) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  });
});

// Tornar disponíveis globalmente para atualização em tempo real
window.updateAudioSettings = function () {
  musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
  soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  musicVolume = parseFloat(localStorage.getItem('musicVolume')) || 60;
  soundVolume = parseFloat(localStorage.getItem('soundVolume')) || 70;

  if (musicEnabled) {
    music.volume = musicVolume / 100;
    if (music.paused) music.play().catch(() => {});
  } else {
    music.pause();
  }

  clickSound.volume = soundVolume / 100;
};