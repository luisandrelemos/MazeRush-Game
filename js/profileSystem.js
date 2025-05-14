// js/profileSystem.js

// ─────────── Constantes de Storage ───────────
const PROFILES_KEY = "mazeRushProfiles";
const ACTIVE_KEY   = "mazeRushActiveProfile";

// ─────────── Geração de UUID ───────────
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11)
    .replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4)
        .toString(16)
    );
}

// ─────────── Inicialização / garantia de dados ───────────
function ensureData() {
  let all = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null");
  if (!Array.isArray(all)) {
    all = [
      { id: "profile-1", name: "Jogador", unlockedLevels: ["level-1"], soundEnabled: true, musicEnabled: true, soundVolume: 70, musicVolume: 60},
      { id: "profile-2", name: "",             unlockedLevels: [],         soundEnabled: true, musicEnabled: true, soundVolume: 70, musicVolume: 60},
      { id: "profile-3", name: "",             unlockedLevels: [],         soundEnabled: true, musicEnabled: true, soundVolume: 70, musicVolume: 60},
    ];
  }
  all = all.map(p => {
    if (!p.userId) p.userId = generateUUID();
    return p;
  });
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  if (!localStorage.getItem(ACTIVE_KEY)) {
    localStorage.setItem(ACTIVE_KEY, all[0].id);
  }
  return all;
}

// ─────────── API Pública ───────────
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

export function getCurrentUserId() {
  return getCurrentProfile().userId;
}

export function updateProfile(updated) {
  if (!updated.userId) updated.userId = generateUUID();
  const all = ensureData().map(p =>
    p.id === updated.id ? updated : p
  );
  saveAllProfiles(all);
}