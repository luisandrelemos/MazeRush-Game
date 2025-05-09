// js/unlockSystem.js

import {
  getCurrentProfile,
  updateProfile
} from "./profileSystem.js";

/**
 * Obtém a lista de níveis desbloqueados do perfil activo.
 * @returns {string[]} array de IDs de níveis (ex: ["level-1", "level-2"])
 */
export function getProgress() {
  const profile = getCurrentProfile();
  return profile.unlockedLevels;
}

/**
 * Verifica se um nível está desbloqueado no perfil activo.
 * @param {string} levelName 
 * @returns {boolean}
 */
export function isLevelUnlocked(levelName) {
  return getProgress().includes(levelName);
}

/**
 * Desbloqueia um novo nível no perfil activo.
 * @param {string} levelName - ex: "level-3"
 */
export function unlockLevel(levelName) {
  const profile = getCurrentProfile();
  if (!profile.unlockedLevels.includes(levelName)) {
    profile.unlockedLevels.push(levelName);
    updateProfile(profile);
  }
}

/**
 * Restaura o progresso do perfil activo ao estado inicial
 * (apenas "level-1" desbloqueado).
 */
export function resetProgress() {
  const profile = getCurrentProfile();
  profile.unlockedLevels = ["level-1"];
  updateProfile(profile);
}