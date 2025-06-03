// js/audio.js
import { getCurrentProfile } from './profileSystem.js';

const music      = new Audio('assets/sounds/background-music.wav');
const clickSound = new Audio('assets/sounds/click.wav');
const coinSound  = new Audio('assets/sounds/coinsplash.wav');

music.loop = true;
music.volume = 0;
music.play().catch(() => {
  window.addEventListener('click', () => {
    updateAudioSettings();
    music.play().catch(() => {});
  }, { once: true });
});

// Efeitos de clique via delegation
document.body.addEventListener('click', e => {
  const trigger = e.target.closest('a, button, .level-card.clickable');
  if (!trigger) return;
  const cur = getCurrentProfile();
  if (cur.soundEnabled) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }
});

/**
 * Aplica ao estado atual do perfil:
 *  - habilita/desabilita música
 *  - ajusta volumes de música e efeitos
 */
export function updateAudioSettings() {
  const cur = getCurrentProfile();

  // Música de fundo
  if (cur.musicEnabled) {
    music.volume = cur.musicVolume / 100;
    if (music.paused) music.play().catch(() => {});
  } else {
    music.pause();
  }

  // Efeito de clique
  clickSound.volume = cur.soundVolume / 100;

  // Efeito de moeda
  coinSound.volume = cur.soundVolume / 100;
}

/**
 * Sincroniza os ícones de mute com o estado atual do perfil
 */
export function updateMuteIcons() {
  const cur = getCurrentProfile();
  const btnSound = document.getElementById('mute-sound-btn');
  const btnMusic = document.getElementById('mute-music-btn');
  if (!btnSound || !btnMusic) return;

  btnSound.textContent = cur.soundEnabled ? '🔊' : '🔇';
  btnMusic.textContent = cur.musicEnabled ? '🎵' : '🚫🎵';
}

// Exportar o objeto coinSound para podermos reproduzir no main.js
export { coinSound };