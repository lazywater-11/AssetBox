import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project config
// You get this from Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyCLtNLQkKSr8E_vFg_Qgh3kv12hNeayWIc",
  authDomain: "gen-lang-client-0700094950.firebaseapp.com",
  projectId: "gen-lang-client-0700094950",
  storageBucket: "gen-lang-client-0700094950.firebasestorage.app",
  messagingSenderId: "167004705569",
  appId: "1:167004705569:web:0f5d3320654f19e2646460"
};

const app = initializeApp(firebaseConfig);
console.log("🔥 Firebase Config Check:", firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
