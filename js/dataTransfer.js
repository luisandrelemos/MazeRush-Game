// js/dataTransfer.js
import {
  getAllProfiles,
  getCurrentProfile,
  setActiveProfileId,
  updateProfile
} from './profileSystem.js';

function findEmptyOrActiveSlot(imported) {
  const all = getAllProfiles();
  const empty = all.find(p => !p.name);
  return empty || getCurrentProfile();
}

/**
 * Gera token Base64 do perfil ativo.
 */
export function exportProgress() {
  const profile = getCurrentProfile();
  const json    = JSON.stringify(profile);
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Importa token para um perfil.
 * @param {string} token 
 * @param {boolean} [force=false]  — se true, substitui direto
 */
export function importProgressToken(token, force = false) {
  if (!token) {
    return { success: false, message: 'Nenhum token fornecido.' };
  }
  let imported;
  try {
    const str = decodeURIComponent(escape(atob(token)));
    imported  = JSON.parse(str);
  } catch {
    return { success: false, message: 'Formato de token inválido.' };
  }
  if (!imported.id) {
    return { success: false, message: 'Token inválido (sem id).' };
  }
  const slot = findEmptyOrActiveSlot(imported);
  if (!force && slot.id !== imported.id && slot.name) {
    return { success: false, needsConfirm: true };
  }
  imported.id = slot.id;
  updateProfile(imported);
  setActiveProfileId(slot.id);
  return { success: true };
}