import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  // TODO: Ganti dengan konfigurasi Firebase Anda dari Firebase Console
  // 1. Buka https://console.firebase.google.com/
  // 2. Pilih project Anda
  // 3. Klik ikon gear (Settings) > Project settings
  // 4. Scroll ke bagian "Your apps" > Web app
  // 5. Copy konfigurasi dan paste di sini

  apiKey: "your-api-key", // Ganti dengan apiKey asli
  authDomain: "your-project.firebaseapp.com", // Ganti dengan authDomain asli
  projectId: "your-project-id", // Ganti dengan projectId asli
  storageBucket: "your-project.appspot.com", // Ganti dengan storageBucket asli
  messagingSenderId: "123456789", // Ganti dengan messagingSenderId asli
  appId: "your-app-id" // Ganti dengan appId asli
};

// Check if Firebase config is properly set
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "your-api-key" &&
         firebaseConfig.projectId !== "your-project-id";
};

// Initialize Firebase only if properly configured
let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  console.warn('Firebase not configured. Please update js/firebase.js with your Firebase config.');
}

// Export services (will be null if not configured)
export { auth, db };
export default app;
