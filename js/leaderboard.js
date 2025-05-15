// js/leaderboard.js

import { db } from "./firebase.js";
import { getCurrentProfile, getCurrentUserId } from "./profileSystem.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

/**
 * Submete o tempo de finish de um nível para:
 *   levels/{levelId}/leaderboard/{userId},
 * — só se for melhor do que o anterior (ou não existir).
 */
export async function submitScore(levelId, timeSec) {
  const profile = getCurrentProfile();
  const userId  = getCurrentUserId();
  const scoreRef = doc(db, "levels", levelId, "leaderboard", userId);
  const snap     = await getDoc(scoreRef);

  if (!snap.exists() || timeSec < snap.data().time) {
    await setDoc(scoreRef, {
      name:    profile.name,
      time:    timeSec,
      updated: Date.now()
    });
  }
}

/**
 * Busca o topN (p. ex. 5) de tempos ascendentes
 * da sub-coleção levels/{levelId}/leaderboard
 * Retorna [{ userId, name, time }, …]
 */
export async function fetchLeaderboard(levelId, topN = 5) {
  const q    = query(
    collection(db, "levels", levelId, "leaderboard"),
    orderBy("time", "asc"),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    userId: d.id,
    name:   d.data().name,
    time:   d.data().time
  }));
}

/**
 * Garante que o documento users/{userId} existe e lá
 * guarda o total de moedas acumuladas.
 */
export async function saveCoins(userId, totalCoins) {
  const userRef = doc(db, "users", userId);
  // Merge mantém outros campos intactos
  await setDoc(userRef, { coins: totalCoins }, { merge: true });
}

/**
 * Lê quantas moedas este user já tem registadas
 * no documento users/{userId}. Retorna 0 se não existir.
 */
export async function fetchCoins(userId) {
  const userRef = doc(db, "users", userId);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return 0;
  return snap.data().coins || 0;
}

/**
 * Busca o melhor tempo pessoal desse nível:
 * levels/{levelId}/leaderboard/{userId}.
 * Retorna o tempo em segundos ou null se nunca jogou.
 */
export async function fetchPersonalBest(levelId) {
  const userId   = getCurrentUserId();
  const scoreRef = doc(db, "levels", levelId, "leaderboard", userId);
  const snap     = await getDoc(scoreRef);
  return snap.exists() ? snap.data().time : null;
}