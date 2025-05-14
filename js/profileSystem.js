// js/profileSystem.js
import { exportProgress, importProgress } from './dataTransfer.js';

// ─────────── Wire-up do Export/Import ───────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-export')
    .addEventListener('click', exportProgress);

  document.getElementById('btn-import-trigger')
    .addEventListener('click', () =>
      document.getElementById('file-import').click()
    );

  document.getElementById('file-import')
    .addEventListener('change', e =>
      importProgress(e.target.files[0])
    );
});


// ─────────── Constantes de Storage ───────────
const PROFILES_KEY = "mazeRushProfiles";
const ACTIVE_KEY   = "mazeRushActiveProfile";


// ─────────── Geração de UUID para leaderboard ───────────
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11)
    .replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4)
        .toString(16)
    );
}

// Se quiser continuar a usar userId/userName separados para a leaderboard:
let userId   = localStorage.getItem('mr_userId');
let userName = localStorage.getItem('mr_userName');

if (!userId) {
  userId = generateUUID();
  localStorage.setItem('mr_userId', userId);
}
if (!userName) {
  userName = prompt('Como quer ser chamado?')?.trim() || 'Jogador';
  localStorage.setItem('mr_userName', userName);
}

export { userId, userName };


// ─────────── Funções de Gestão de Perfis ───────────
function ensureData() {
  let all = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null");
  if (!Array.isArray(all)) {
    all = [
      {
        id: "profile-1",
        name: "Jogador",
        unlockedLevels: ["level-1"],
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 70,
        musicVolume: 60
      },
      {
        id: "profile-2",
        name: "",
        unlockedLevels: [],
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 70,
        musicVolume: 60
      },
      {
        id: "profile-3",
        name: "",
        unlockedLevels: [],
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 70,
        musicVolume: 60
      }
    ];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
    // Se ainda não existir um ativo, define o primeiro
    if (!localStorage.getItem(ACTIVE_KEY)) {
      localStorage.setItem(ACTIVE_KEY, "profile-1");
    }
  }
  return all;
}

export function getAllProfiles() {
  return ensureData();
}

export function saveAllProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId() {
  ensureData();
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProfileId(id) {
  ensureData();
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getCurrentProfile() {
  const all = ensureData();
  const id  = getActiveProfileId();
  return all.find(p => p.id === id);
}

export function updateProfile(updated) {
  const all = ensureData().map(p =>
    p.id === updated.id ? updated : p
  );
  saveAllProfiles(all);
}