// js/firebase.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";
import { getAnalytics }  from "https://www.gstatic.com/firebasejs/10.3.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCS5d0VEtxCMKYNcRGGywfTRJn6o-s_RNM",
  authDomain: "mazerush-1d4fc.firebaseapp.com",
  projectId: "mazerush-1d4fc",
  storageBucket: "mazerush-1d4fc.firebasestorage.app",
  messagingSenderId: "147885771713",
  appId: "1:147885771713:web:db51d16c50f2229ebebd40",
  measurementId: "G-8YC2BEX62G"
};

// Initialize Firebase
const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db        = getFirestore(app);

export { db };