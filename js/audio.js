// js/audio.js
import { getCurrentProfile } from './profileSystem.js';

const music      = new Audio('assets/sounds/background-music.wav');
const clickSound = new Audio('assets/sounds/click.wav');

music.loop = true;
music.volume = 0;
music.play().catch(() => {
  window.addEventListener('click', () => {
    updateAudioSettings();
    music.play().catch(() => {});
  }, { once: true });
});

// Efeitos de clique
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('click', () => {
    const cur = getCurrentProfile();
    if (cur.soundEnabled) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  });
});

/**
 * Aplica ao estado actual do perfil:
 *  - habilita/desabilita música
 *  - ajusta volumes
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

  // Atualiza efeitos de clique
  clickSound.volume = cur.soundVolume / 100;
}