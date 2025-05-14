// js/dataTransfer.js
import {
  getAllProfiles,
  getActiveProfileId,
  saveAllProfiles,
  setActiveProfileId
} from "./profileSystem.js";

export function exportProgress() {
  const data = {
    profiles: getAllProfiles(),
    active:   getActiveProfileId()
  };
  const blob = new Blob([JSON.stringify(data, null,2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "mazerush-profiles.json";
  a.click();
}

export function importProgress(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      // valida minimalmente
      if (!Array.isArray(d.profiles) || typeof d.active !== "string") {
        throw new Error("Formato inválido");
      }
      // sobrescreve todo o storage de perfis
      saveAllProfiles(d.profiles);
      setActiveProfileId(d.active);
      alert("Progresso importado! A página vai recarregar.");
      location.reload();
    } catch(err) {
      console.error(err);
      alert("Não consegui importar: ficheiro inválido.");
    }
  };
  reader.readAsText(file);
}