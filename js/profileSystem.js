// js/profileSystem.js
const PROFILES_KEY = "mazeRushProfiles";
const ACTIVE_KEY   = "mazeRushActiveProfile";

function ensureData() {
  let all = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null");
  if (!all) {
    all = [
      { id:"profile-1", name:"Jogador", unlockedLevels:["level-1"],
        soundEnabled:true, musicEnabled:true, soundVolume:70, musicVolume:60 },
      { id:"profile-2", name:"",        unlockedLevels:[],
        soundEnabled:true, musicEnabled:true, soundVolume:70, musicVolume:60 },
      { id:"profile-3", name:"",        unlockedLevels:[],
        soundEnabled:true, musicEnabled:true, soundVolume:70, musicVolume:60 }
    ];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
    localStorage.setItem(ACTIVE_KEY, "profile-1");
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
  const all = ensureData().map(p => p.id === updated.id ? updated : p);
  saveAllProfiles(all);
}