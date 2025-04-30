// js/unlockSystem.js

// Chave usada no localStorage
const STORAGE_KEY = 'mazeRushProgress';

/**
 * Obtém o progresso atual do jogador.
 * Se não houver, cria um novo onde apenas o nível 1 está desbloqueado.
 */
export function getProgress() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler progresso guardado:', e);
      // Se houver erro, reinicia o progresso
    }
  }
  // progresso inicial
  const initialProgress = {
    unlockedLevels: ['level-1']
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProgress));
  return initialProgress;
}

/**
 * Desbloqueia um novo nível.
 * @param {string} levelName - Nome do nível (ex: "level-2")
 */
export function unlockLevel(levelName) {
  const progress = getProgress();
  if (!progress.unlockedLevels.includes(levelName)) {
    progress.unlockedLevels.push(levelName);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
}

/**
 * Verifica se um nível está desbloqueado.
 * @param {string} levelName 
 * @returns {boolean}
 */
export function isLevelUnlocked(levelName) {
  const progress = getProgress();
  return progress.unlockedLevels.includes(levelName);
}

/**
 * Restaura o progresso ao estado inicial (apenas o nível 1 desbloqueado).
 */
export function resetProgress() {
    const initialProgress = {
      unlockedLevels: ['level-1']
    };
    localStorage.setItem('mazeRushProgress', JSON.stringify(initialProgress));
  }
  
