// js/firebase.js - Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    query, 
    where, 
    doc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

// ... (sisa kode helper functions tetap sama)

// Firestore Helper Functions
export function getCollectionRef(collectionName) {
  return collection(db, collectionName);
}

export async function addDocWithId(collectionName, id, data) {
  try {
    await setDoc(doc(db, collectionName, id.toString()), {
      ...data,
      id: id,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    return { success: false, error };
  }
}

export async function updateDocById(collectionName, id, data) {
  try {
    const docRef = doc(db, collectionName, id.toString());
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return { success: false, error };
  }
}

export async function deleteDocById(collectionName, id) {
  try {
    await deleteDoc(doc(db, collectionName, id.toString()));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return { success: false, error };
  }
}

export async function getAllDocs(collectionName) {
  try {
    const q = query(getCollectionRef(collectionName));
    const querySnapshot = await getDocs(q);
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: docs };
  } catch (error) {
    console.error(`Error fetching documents from ${collectionName}:`, error);
    return { success: false, error };
  }
}

export async function getDocsWithQuery(collectionName, field, operator, value) {
  try {
    const q = query(getCollectionRef(collectionName), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: docs };
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    return { success: false, error };
  }
}

// One-time Migration Function (run once to sync localStorage to Firestore)
export async function migrateLocalStorageToFirestore() {
  const collections = ['products', 'sales', 'purchases', 'categories', 'customers', 'settings'];
  
  for (const collectionName of collections) {
    const localData = localStorage.getItem(`lababil-${collectionName}`);
    if (localData) {
      const dataArray = JSON.parse(localData);
      for (const item of dataArray) {
        if (item.id) {
          await addDocWithId(collectionName, item.id, item);
        }
      }
      console.log(`Migrated ${dataArray.length} items from ${collectionName}`);
      localStorage.removeItem(`lababil-${collectionName}`); // Clear after migration
    }
  }
  
  console.log('Migration completed!');
  return { success: true };
}

// Helper function to check if Firebase is properly configured
export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

