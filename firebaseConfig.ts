import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project config
// You get this from Firebase Console -> Project Settings -> General -> Your Apps
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXY-wtJiNbtcwgOfrOuRg5Qjl5ghI9wns",
  authDomain: "gen-lang-client-0395415742.firebaseapp.com",
  projectId: "gen-lang-client-0395415742",
  storageBucket: "gen-lang-client-0395415742.firebasestorage.app",
  messagingSenderId: "881474053856",
  appId: "1:881474053856:web:e4e3fba691665387171285"
};

const app = initializeApp(firebaseConfig);
console.log("🔥 Firebase Config Check:", firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
