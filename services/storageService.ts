import { AppState, Currency } from '../types';
import { supabase } from '../supabase/supabaseClient';

export const INITIAL_STATE: AppState = {
  baseCurrency: Currency.CNY,
  brokerageAccounts: [],
  assets: [],
  clearedAssets: [],
  liabilities: [],
  journal: [],
  history: []
};

const GUEST_STORAGE_KEY = 'asset_box_guest_data';

export const loadRemoteState = async (userId: string): Promise<AppState> => {
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
    const { data, error } = await supabase
      .from('states')
      .select('app_state')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error loading data from Supabase:", error);
      return INITIAL_STATE;
    }

    if (data) {
      return { ...INITIAL_STATE, ...data.app_state };
    }
    return INITIAL_STATE;
  } catch (error) {
    console.error("Error loading data from Supabase:", error);
    return INITIAL_STATE;
  }
};

export const saveRemoteState = async (userId: string, state: AppState) => {
  if (userId === 'guest') {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save guest data", e);
    }
    return;
  }

  try {
    // JSON.stringify removes undefined values which are not valid in JSON/PostgreSQL JSONB
    const sanitizedState = JSON.parse(JSON.stringify(state));

    const { error } = await supabase
      .from('states')
      .upsert(
        { user_id: userId, app_state: sanitizedState, last_updated: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) console.error("Error saving data to Supabase:", error);
  } catch (error) {
    console.error("Error saving data to Supabase:", error);
  }
};