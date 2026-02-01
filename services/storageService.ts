import { AppState, Currency } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const INITIAL_STATE: AppState = {
  baseCurrency: Currency.CNY,
  brokerageAccounts: [],
  assets: [],
  liabilities: [],
  journal: [],
  history: []
};

// --- Remote Storage (Firestore) ---

export const loadRemoteState = async (userId: string): Promise<AppState> => {
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
  try {
    const docRef = doc(db, "users", userId);
    // We store it under an 'appState' field
    await setDoc(docRef, { 
      appState: state,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving data to Firebase:", error);
  }
};