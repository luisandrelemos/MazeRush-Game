// js/profileSystem.js
import { db } from './firebase.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

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

// ─────────── Valores padrão de cores por modelo ───────────
const DEFAULT_CAR_MODEL_COLORS = {
  0: { primary: "#603441", secondary: "#ffffff", structure: "#131313", wheels: "#666666" },
  1: { primary: "#4B5320", secondary: "#A9A9A9", structure: "#2F4F4F", wheels: "#333333" },
  2: { primary: "#ff0000", secondary: "#111111", structure: "#333333", wheels: "#222222" },
  3: { primary: "#0000ff", secondary: "#eeeeee", structure: "#555555", wheels: "#444444" }
};

// ─────────── Inicialização / garantia de dados ───────────
function ensureData() {
  let all = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null");

  if (!Array.isArray(all)) {
    // Criar 3 perfis com id e userId únicos
    all = [1, 2, 3].map((_, index) => {
      return {
        id: generateUUID(),
        userId: generateUUID(),
        name: index === 0 ? "Jogador" : "",
        unlockedLevels: index === 0 ? ["level-1"] : [],
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 70,
        musicVolume: 60,
        coins: 0,
        levelTimes: {},
        carModels: { ...DEFAULT_CAR_MODEL_COLORS },
        selectedModel: 0,
        unlockedCars: [0]
      };
    });
  }

  // Atualiza perfis antigos com campos novos se necessário
  all = all.map(p => {
    if (!p.id)                  p.id = generateUUID();
    if (!p.userId)              p.userId = generateUUID();
    if (p.coins === undefined) p.coins = 0;
    if (!p.levelTimes)         p.levelTimes = {};
    if (!p.carModels)          p.carModels = { ...DEFAULT_CAR_MODEL_COLORS };
    else {
      for (let i = 0; i < 4; i++) {
        if (!p.carModels[i]) p.carModels[i] = { ...DEFAULT_CAR_MODEL_COLORS[i] };
      }
    }
    if (p.selectedModel === undefined) p.selectedModel = 0;
    if (!Array.isArray(p.unlockedCars)) p.unlockedCars = [0];
    return p;
  });

  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  if (!localStorage.getItem(ACTIVE_KEY)) {
    localStorage.setItem(ACTIVE_KEY, all[0].id);
  }
  return all;
}

// ─────────── Atualização local apenas ───────────
function updateProfileLocalOnly(updated) {
  if (!updated.userId) updated.userId = generateUUID();
  if (!updated.id)     updated.id     = generateUUID();
  const all = ensureData().map(p => p.id === updated.id ? updated : p);
  saveAllProfiles(all);
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

export async function syncProfileFromFirestore() {
  const all = ensureData();
  const id  = getActiveProfileId();
  const localProfile = all.find(p => p.id === id);
  if (!localProfile || !localProfile.userId) return;

  try {
    const ref = doc(db, "users", localProfile.userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const updated = { ...localProfile, ...data };
      updateProfileLocalOnly(updated);
    }
  } catch (err) {
    console.error("Erro ao sincronizar com Firestore:", err);
  }
}

export async function updateProfile(updated) {
  if (!updated.userId) updated.userId = generateUUID();
  if (!updated.id)     updated.id     = generateUUID();

  // Atualizar localStorage
  const all = ensureData().map(p =>
    p.id === updated.id ? updated : p
  );
  saveAllProfiles(all);

  // Atualizar na Firestore
  try {
    const userRef = doc(db, "users", updated.userId);
    await setDoc(userRef, {
      coins: updated.coins,
      name: updated.name,
      unlockedLevels: updated.unlockedLevels,
      soundEnabled: updated.soundEnabled,
      musicEnabled: updated.musicEnabled,
      soundVolume: updated.soundVolume,
      musicVolume: updated.musicVolume,
      levelTimes: updated.levelTimes,
      carModels: updated.carModels,
      selectedModel: updated.selectedModel,
      unlockedCars: updated.unlockedCars
    });
  } catch (err) {
    console.error("Erro ao atualizar perfil na Firestore:", err);
  }
}

export { DEFAULT_CAR_MODEL_COLORS };
