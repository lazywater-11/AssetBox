import React, { useEffect, useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Journal from './components/Journal';
import Login from './components/Login';
import { AppState, Asset, AssetType, Currency, Liability, JournalEntry, BrokerageAccount, Market, ClearedAsset } from './types';
import { loadRemoteState, saveRemoteState, INITIAL_STATE } from './services/storageService';
import { fetchCryptoPrices, fetchExchangeRates, fetchStockPrices } from './services/apiService';
import { DEFAULT_HKD_CNY_RATE } from './constants';

// Firebase imports
import { auth, googleProvider } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activePortfolioTab, setActivePortfolioTab] = useState<'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities'>('stocks');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [exchangeRates, setExchangeRates] = useState({ USD: 7.2, HKD: DEFAULT_HKD_CNY_RATE, CNY: 1 });
  const [priceLoading, setPriceLoading] = useState(false);

  // Use refs to track state for closures
  const stateRef = useRef(state);
  const userRef = useRef<User | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { userRef.current = user; }, [user]);
  
  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load data from Firebase
        setDataLoading(true);
        const remoteData = await loadRemoteState(currentUser.uid);
        setState(remoteData);
        setDataLoading(false);
        // Trigger price refresh after data load
        refreshData(remoteData.assets, remoteData);
      } else {
        // Only clear state if we are NOT in guest mode
        // If userRef.current is 'guest', we ignore the firebase 'null' event
        if (userRef.current?.uid !== 'guest') {
            setUser(null);
            setState(INITIAL_STATE);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Auto-Save to Firebase (Debounced or on state change)
  useEffect(() => {
    if (user && !dataLoading) {
      saveRemoteState(user.uid, state);
    }
  }, [state, user, dataLoading]);

  // 3. Price Refresh Interval
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refreshData(stateRef.current.assets, stateRef.current);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please check your domain configuration in Firebase Console. You can use Guest Mode to test.");
    }
  };

  const handleGuestLogin = async () => {
      const guestUser = {
          uid: 'guest',
          email: 'guest@demo.com',
          displayName: 'Guest User',
          photoURL: null,
          emailVerified: true,
          isAnonymous: true,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => '',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          providerId: 'guest'
      } as unknown as User;

      setUser(guestUser);
      setAuthLoading(false);

      setDataLoading(true);
      const guestData = await loadRemoteState('guest');
      setState(guestData);
      setDataLoading(false);
      refreshData(guestData.assets, guestData);
  };

  const handleLogout = async () => {
    if (user?.uid === 'guest') {
        setUser(null);
        setState(INITIAL_STATE);
        return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const refreshData = async (assetsToUpdate: Asset[], currentState: AppState) => {
    const targetAssets = assetsToUpdate;
    if (targetAssets.length === 0 && currentState.assets.length === 0) return;

    setPriceLoading(true);
    
    // 1. Get Exchange Rate
    const ratesData = await fetchExchangeRates();
    const usdToCny = ratesData.USD;
    const hkdToCny = DEFAULT_HKD_CNY_RATE; 
    
    const newRates = { USD: usdToCny, HKD: hkdToCny, CNY: 1 };
    setExchangeRates(newRates);

    // 2. Fetch Prices
    const stockPrices = await fetchStockPrices(targetAssets);
    const cryptoPrices = await fetchCryptoPrices(targetAssets);

    // 3. Update Assets
    const updatedAssets = targetAssets.map(asset => {
      let price = asset.currentPrice;
      let dailyChangePct = asset.dailyChangePct;
      let name = asset.name;

      if (asset.type === AssetType.STOCK && stockPrices[asset.id]) {
        price = stockPrices[asset.id].price;
        dailyChangePct = stockPrices[asset.id].changePct;
        if (stockPrices[asset.id].name) {
            name = stockPrices[asset.id].name;
        }
      } else if (asset.type === AssetType.CRYPTO && cryptoPrices[asset.id]) {
        price = cryptoPrices[asset.id].price;
        dailyChangePct = cryptoPrices[asset.id].changePct;
      }

      let currentValue = 0; // Value in CNY
      let dailyChangeVal = 0;
      let totalReturnPct = 0;

      if (asset.type === AssetType.STOCK || asset.type === AssetType.CRYPTO) {
         if (price && asset.quantity) {
            let exchangeMult = 1;
            
            if (currentState.baseCurrency === Currency.CNY) {
               if (asset.type === AssetType.CRYPTO) {
                 exchangeMult = usdToCny;
               } else if (asset.market === Market.US) {
                 exchangeMult = usdToCny;
               } else if (asset.market === Market.HK) {
                 exchangeMult = hkdToCny; 
               } else if (asset.market === Market.CN) {
                 exchangeMult = 1;
               }
            } else {
               if (asset.market === Market.CN) exchangeMult = 1/usdToCny;
               else if (asset.market === Market.HK) exchangeMult = hkdToCny/usdToCny;
            }
            
            currentValue = price * asset.quantity * exchangeMult;
            
            if (dailyChangePct !== undefined) {
               const prevVal = currentValue / (1 + (dailyChangePct / 100));
               dailyChangeVal = currentValue - prevVal;
            }

            if (asset.costBasis && asset.costBasis > 0) {
               totalReturnPct = ((price - asset.costBasis) / asset.costBasis) * 100;
            }
         }
      } else {
         // Manual Assets & Lent Money
         currentValue = asset.manualValue || 0;
         // If Lent Money is in a different currency (e.g. USD), convert it to Base (CNY)
         // Assuming manualValue is stored in `asset.currency`
         // Simplified: In this app, manual value is often treated as base value for simplicity unless we enhance it.
         // Let's enhance it slightly:
         if (asset.currency !== currentState.baseCurrency) {
             if (currentState.baseCurrency === Currency.CNY && asset.currency === Currency.USD) currentValue = currentValue * usdToCny;
             if (currentState.baseCurrency === Currency.CNY && asset.currency === Currency.HKD) currentValue = currentValue * hkdToCny;
             if (currentState.baseCurrency === Currency.USD && asset.currency === Currency.CNY) currentValue = currentValue / usdToCny;
         }
      }

      return {
        ...asset,
        name,
        currentPrice: price,
        currentValue,
        dailyChangePct,
        dailyChangeVal,
        totalReturnPct
      };
    });

    // 4. Update Brokerage Account Totals
    const updatedBrokerages = currentState.brokerageAccounts.map(account => {
        const accountAssets = updatedAssets.filter(a => a.brokerageAccountId === account.id);
        
        let stocksValueNative = 0;
        
        accountAssets.forEach(asset => {
           if (asset.currentPrice && asset.quantity) {
              stocksValueNative += asset.currentPrice * asset.quantity;
           }
        });

        const totalValue = (account.availableCash || 0) + stocksValueNative;

        return {
           ...account,
           totalValue
        };
    });

    // 5. Calculate Total Net Worth for History
    const totalAssetsVal = updatedAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
    
    let totalBrokerageCashBase = 0;
    updatedBrokerages.forEach(b => {
        let cashVal = 0;
        if (currentState.baseCurrency === Currency.CNY) {
             if (b.currency === Currency.CNY) cashVal = b.availableCash;
             else if (b.currency === Currency.USD) cashVal = b.availableCash * newRates.USD;
             else if (b.currency === Currency.HKD) cashVal = b.availableCash * newRates.HKD;
        } else {
             if (b.currency === Currency.USD) cashVal = b.availableCash;
             else if (b.currency === Currency.CNY) cashVal = b.availableCash / newRates.USD;
             else if (b.currency === Currency.HKD) cashVal = b.availableCash / 7.8;
        }
        totalBrokerageCashBase += cashVal;
    });

    const totalLiabilitiesVal = currentState.liabilities.reduce((sum, l) => {
        let liabVal = l.totalAmount;
        if (currentState.baseCurrency === Currency.CNY && l.currency === Currency.USD) {
            liabVal = l.totalAmount * newRates.USD;
        }
        return sum + liabVal;
    }, 0);

    const currentNetWorth = totalAssetsVal + totalBrokerageCashBase - totalLiabilitiesVal;

    const todayStr = new Date().toISOString().split('T')[0];
    const history = [...(currentState.history || [])];
    const existingIndex = history.findIndex(h => h.date === todayStr);
    
    if (existingIndex >= 0) {
        history[existingIndex] = { date: todayStr, value: currentNetWorth };
    } else {
        history.push({ date: todayStr, value: currentNetWorth });
    }
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setState(prev => ({ 
       ...prev, 
       assets: updatedAssets,
       brokerageAccounts: updatedBrokerages,
       history
    }));
    
    setPriceLoading(false);
  };

  // State Wrappers that trigger Refresh
  const addAsset = (asset: Asset) => {
    setState(prev => {
        const newState = { ...prev, assets: [...prev.assets, asset] };
        refreshData(newState.assets, newState);
        return newState;
    });
  };

  const updateAsset = (asset: Asset) => {
    setState(prev => {
        const newAssets = prev.assets.map(a => a.id === asset.id ? asset : a);
        const newState = { ...prev, assets: newAssets };
        refreshData(newAssets, newState);
        return newState;
    });
  };

  const removeAsset = (id: string) => {
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  };

  // Logic for Clearing/Liquidating a Stock
  const liquidateAsset = (id: string, exitPrice: number, exitDate: string, exitReason: string) => {
    setState(prev => {
       const asset = prev.assets.find(a => a.id === id);
       if (!asset) return prev;

       // Create History Record
       const quantity = asset.quantity || 0;
       const costBasis = asset.costBasis || 0;
       const realizedPnL = (exitPrice - costBasis) * quantity;
       const exitTotalValue = exitPrice * quantity; // Native
       
       // Rough estimation of Base value, uses current exchange rate from state (may vary slightly from reality but sufficient for history)
       let exitTotalValueBase = exitTotalValue;
       if (asset.market === Market.US && prev.baseCurrency === Currency.CNY) exitTotalValueBase *= exchangeRates.USD;
       else if (asset.market === Market.HK && prev.baseCurrency === Currency.CNY) exitTotalValueBase *= exchangeRates.HKD;

       const clearedItem: ClearedAsset = {
          id: asset.id,
          symbol: asset.symbol || '',
          name: asset.name,
          quantity: quantity,
          market: asset.market || Market.US,
          currency: asset.currency,
          buyCostBasis: costBasis,
          exitPrice: exitPrice,
          exitDate: exitDate,
          exitReason: exitReason,
          exitTotalValue,
          exitTotalValueBase,
          realizedPnL,
          clearedAt: new Date().toISOString()
       };

       const newAssets = prev.assets.filter(a => a.id !== id);
       const newState = {
          ...prev,
          assets: newAssets,
          clearedAssets: [clearedItem, ...(prev.clearedAssets || [])]
       };

       // Also need to Update Brokerage Cash Balance!
       // When you sell, cash increases.
       if (asset.brokerageAccountId) {
           const brokerage = prev.brokerageAccounts.find(b => b.id === asset.brokerageAccountId);
           if (brokerage) {
               // Assuming exitPrice is in the brokerage's currency for simplicity in this MVP
               // Ideally, we check asset.market currency vs brokerage currency. 
               // Assuming standard matching (US stock in USD account).
               const updatedBrokerage = {
                   ...brokerage,
                   availableCash: (brokerage.availableCash || 0) + exitTotalValue
               };
               newState.brokerageAccounts = prev.brokerageAccounts.map(b => b.id === brokerage.id ? updatedBrokerage : b);
           }
       }

       setTimeout(() => refreshData(newAssets, newState), 0);
       return newState;
    });
  };

  const addLiability = (liab: Liability) => {
     setState(prev => ({ ...prev, liabilities: [...prev.liabilities, liab]}));
  };

  const updateLiability = (liab: Liability) => {
     setState(prev => ({ ...prev, liabilities: prev.liabilities.map(l => l.id === liab.id ? liab : l)}));
  };

  const removeLiability = (id: string) => {
     setState(prev => ({ ...prev, liabilities: prev.liabilities.filter(l => l.id !== id)}));
  };

  const addBrokerage = (account: BrokerageAccount) => {
    setState(prev => ({ ...prev, brokerageAccounts: [...prev.brokerageAccounts, account] }));
  };

  const updateBrokerage = (account: BrokerageAccount) => {
    setState(prev => {
        const updated = prev.brokerageAccounts.map(b => b.id === account.id ? account : b);
        const newState = { ...prev, brokerageAccounts: updated };
        // Recalc totals immediately
        setTimeout(() => refreshData(newState.assets, newState), 0);
        return newState;
    });
  };

  const removeBrokerage = (id: string) => {
    setState(prev => ({ 
      ...prev, 
      brokerageAccounts: prev.brokerageAccounts.filter(b => b.id !== id),
      assets: prev.assets.filter(a => a.brokerageAccountId !== id)
    }));
  };

  const addJournalEntry = (entry: JournalEntry) => {
    setState(prev => ({ ...prev, journal: [entry, ...prev.journal] }));
  };

  const updateJournalEntry = (entry: JournalEntry) => {
    setState(prev => ({
      ...prev,
      journal: prev.journal.map(j => j.id === entry.id ? entry : j)
    }));
  };

  const handleNavigate = (tab: string, subTab?: 'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities') => {
    setActiveTab(tab);
    if (subTab) {
      setActivePortfolioTab(subTab);
    }
  };

  // --- RENDER ---

  if (authLoading) {
      return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-green">Loading app...</div>;
  }

  if (!user) {
      return <Login onLogin={handleLogin} onGuestLogin={handleGuestLogin} loading={authLoading} />;
  }

  return (
    <div className="flex min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-green selection:text-black">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userEmail={user.email}
        onLogout={handleLogout}
      />
      
      <main className="ml-64 flex-1 p-8 overflow-x-hidden">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold capitalize">{activeTab}</h2>
            <p className="text-brand-muted text-sm mt-1">
               {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
             {(priceLoading || dataLoading) && <span className="text-xs text-brand-green animate-pulse">Syncing data...</span>}
             <div className="flex items-center gap-2 bg-brand-card px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-xs text-brand-muted">USD/CNY</span>
                <span className="font-mono font-bold text-sm">{exchangeRates.USD.toFixed(4)}</span>
             </div>
             <div className="w-10 h-10 rounded-full bg-brand-card border border-white/10 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <span className="font-bold text-brand-green">{user.email?.charAt(0).toUpperCase()}</span>
                )}
             </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            state={state} 
            exchangeRate={exchangeRates.USD} 
            onNavigate={handleNavigate}
          />
        )}
        
        {activeTab === 'portfolio' && (
          <Portfolio 
            state={state} 
            activeTab={activePortfolioTab}
            onTabChange={setActivePortfolioTab}
            onAddAsset={addAsset}
            onUpdateAsset={updateAsset} 
            onRemoveAsset={removeAsset}
            onLiquidateAsset={liquidateAsset}
            onAddLiability={addLiability}
            onUpdateLiability={updateLiability}
            onRemoveLiability={removeLiability}
            onAddBrokerage={addBrokerage}
            onUpdateBrokerage={updateBrokerage}
            onRemoveBrokerage={removeBrokerage}
            refreshPrices={() => refreshData(state.assets, state)}
            exchangeRates={exchangeRates}
          />
        )}
        
        {activeTab === 'journal' && (
          <Journal 
            entries={state.journal} 
            assets={state.assets}
            onAddEntry={addJournalEntry}
            onUpdateEntry={updateJournalEntry}
          />
        )}

        {activeTab === 'settings' && (
           <div className="text-center py-20 text-brand-muted">
              <p>Settings module allows toggling Base Currency (CNY/USD) and setting custom exchange rate sources.</p>
              <button 
                 onClick={() => {
                    const next = state.baseCurrency === Currency.CNY ? Currency.USD : Currency.CNY;
                    setState(p => ({...p, baseCurrency: next}));
                 }}
                 className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white"
              >
                 Switch Base Currency to {state.baseCurrency === Currency.CNY ? 'USD' : 'CNY'}
              </button>
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-xs text-brand-muted">User ID: {user.uid}</p>
                {user.uid === 'guest' && <p className="text-xs text-brand-green mt-2">Guest Mode: Data saved locally.</p>}
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;