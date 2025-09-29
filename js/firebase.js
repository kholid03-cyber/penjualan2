// js/firebase.js - Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase configuration - Lababil Sales System
const firebaseConfig = {
  apiKey: "AIzaSyBMVecv_dcp6bsSLa1AXZbNrTbwmgWFca8",
  authDomain: "penjualan2-2c10a.firebaseapp.com",
  databaseURL: "https://penjualan2-2c10a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "penjualan2-2c10a",
  storageBucket: "penjualan2-2c10a.firebasestorage.app",
  messagingSenderId: "901549145903",
  appId: "1:901549145903:web:e5628d36b2e0013b31abda",
  measurementId: "G-0XEGMQ2FQD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

export default app;

// Helper function to check if Firebase is properly configured
export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}
