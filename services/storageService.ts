import { AppState, Currency } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const INITIAL_STATE: AppState = {
  baseCurrency: Currency.CNY,
  brokerageAccounts: [],
  assets: [],
  clearedAssets: [], // Initialize empty
  liabilities: [],
  journal: [],
  history: []
};

const GUEST_STORAGE_KEY = 'asset_box_guest_data';

// --- Remote Storage (Firestore) ---

export const loadRemoteState = async (userId: string): Promise<AppState> => {
  // Guest Mode Handling
  if (userId === 'guest') {
    try {
      const localData = localStorage.getItem(GUEST_STORAGE_KEY);
      if (localData) {
        return { ...INITIAL_STATE, ...JSON.parse(localData) };
      }
    } catch (e) {
      console.warn("Failed to load guest data", e);
    }
    return INITIAL_STATE;
  }

  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Merge with initial state to ensure new schema fields exist
      return { ...INITIAL_STATE, ...data.appState };
    } else {
      // User doesn't exist yet, return empty initial state
      return INITIAL_STATE;
    }
  } catch (error) {
    console.error("Error loading data from Firebase:", error);
    return INITIAL_STATE;
  }
};

export const saveRemoteState = async (userId: string, state: AppState) => {
  // Guest Mode Handling
  if (userId === 'guest') {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save guest data", e);
    }
    return;
  }

  try {
    const docRef = doc(db, "users", userId);
    
    // FIX: Firebase Firestore does not support 'undefined' values.
    // JSON.stringify removes keys with undefined values, sanitizing the object for Firestore.
    const sanitizedState = JSON.parse(JSON.stringify(state));

    // We store it under an 'appState' field
    await setDoc(docRef, { 
      appState: sanitizedState,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving data to Firebase:", error);
  }
};