// js/leaderboard.js
import { db } from "./firebase.js";
import { getCurrentProfile, getCurrentUserId } from "./profileSystem.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

/**
 * Submete o tempo de finish de um nível para
 * levels/{levelId}/leaderboard/{userId},
 * mas só se for melhor do que o anterior (ou não existir).
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
