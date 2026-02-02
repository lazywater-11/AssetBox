import React, { useState } from 'react';
import { AppState, Asset, AssetType, Currency, Market, Liability, LiabilityType, BrokerageAccount } from '../types';
import { Plus, Trash2, Wallet, Edit2, Coins, Banknote, Building, CreditCard, AlertTriangle, Handshake, Gavel, History } from 'lucide-react';

interface PortfolioProps {
  state: AppState;
  activeTab: 'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities';
  onTabChange: (tab: 'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities') => void;
  onAddAsset: (asset: Asset) => void;
  onUpdateAsset: (asset: Asset) => void;
  onRemoveAsset: (id: string) => void;
  onLiquidateAsset: (id: string, exitPrice: number, exitDate: string, exitReason: string) => void;
  onAddLiability: (liability: Liability) => void;
  onUpdateLiability: (liability: Liability) => void;
  onRemoveLiability: (id: string) => void;
  onAddBrokerage: (account: BrokerageAccount) => void;
  onUpdateBrokerage: (account: BrokerageAccount) => void;
  onRemoveBrokerage: (id: string) => void;
  refreshPrices: () => void;
  exchangeRates: { USD: number; HKD: number; CNY: number };
}

const Portfolio: React.FC<PortfolioProps> = ({ 
  state, 
  activeTab,
  onTabChange,
  onAddAsset, 
  onUpdateAsset,
  onRemoveAsset,
  onLiquidateAsset,
  onAddLiability, 
  onUpdateLiability,
  onRemoveLiability, 
  onAddBrokerage, 
  onUpdateBrokerage,
  onRemoveBrokerage, 
  refreshPrices,
  exchangeRates
}) => {
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'BROKERAGE' | 'STOCK' | 'CRYPTO' | 'MANUAL' | 'LENT' | 'LIABILITY' | 'LIQUIDATE'>('STOCK');
  const [selectedBrokerageId, setSelectedBrokerageId] = useState<string>('');
  const [editingBrokerageId, setEditingBrokerageId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string, type: 'ASSET' | 'LIABILITY'} | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formMarket, setFormMarket] = useState<Market>(Market.US);
  const [formValue, setFormValue] = useState('');
  const [formCurrency, setFormCurrency] = useState<Currency>(Currency.USD);

  // New Fields for Liability
  const [formDueDate, setFormDueDate] = useState('');
  const [formMonthlyInterest, setFormMonthlyInterest] = useState('');

  // New Fields for Lent Money
  const [formDebtor, setFormDebtor] = useState('');
  const [formDateLent, setFormDateLent] = useState('');

  // Fields for Liquidation
  const [formExitPrice, setFormExitPrice] = useState('');
  const [formExitDate, setFormExitDate] = useState('');
  const [formExitReason, setFormExitReason] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormSymbol('');
    setFormQuantity('');
    setFormCost('');
    setFormValue('');
    setFormCurrency(Currency.CNY); // Default to CNY for manual assets
    setFormDueDate('');
    setFormMonthlyInterest('');
    setFormDebtor('');
    setFormDateLent('');
    setFormExitPrice('');
    setFormExitDate(new Date().toISOString().split('T')[0]);
    setFormExitReason('');

    setShowAddModal(false);
    setSelectedBrokerageId('');
    setEditingBrokerageId(null);
    setEditingAssetId(null);
  };

  // --- Actions ---

  const handleDeleteClick = (id: string, type: 'ASSET' | 'LIABILITY') => {
      setDeleteTarget({ id, type });
      setShowDeleteConfirm(true);
  };

  const handleLiquidateClick = (asset: Asset) => {
      setEditingAssetId(asset.id);
      setModalType('LIQUIDATE');
      setFormSymbol(asset.symbol || '');
      setFormQuantity(asset.quantity?.toString() || '');
      // Prefill exit price with current price if available
      setFormExitPrice(asset.currentPrice?.toString() || '');
      setFormExitDate(new Date().toISOString().split('T')[0]);
      setShowAddModal(true);
  };

  const confirmDelete = () => {
      if (deleteTarget) {
          if (deleteTarget.type === 'ASSET') {
              onRemoveAsset(deleteTarget.id);
          } else {
              onRemoveLiability(deleteTarget.id);
          }
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
  };

  const openAddBrokerage = () => {
    setModalType('BROKERAGE');
    setEditingBrokerageId(null);
    setFormCurrency(Currency.USD);
    setShowAddModal(true);
  };

  const openEditBrokerage = (account: BrokerageAccount) => {
    setModalType('BROKERAGE');
    setEditingBrokerageId(account.id);
    setFormName(account.name);
    setFormValue((account.availableCash || 0).toString()); // In edit mode, we edit Cash, not total
    setFormCurrency(account.currency);
    setShowAddModal(true);
  };

  const openAddStock = (brokerageId: string) => {
    setSelectedBrokerageId(brokerageId);
    setEditingAssetId(null);
    setModalType('STOCK');
    // Default market based on brokerage currency
    const brokerage = state.brokerageAccounts.find(b => b.id === brokerageId);
    if (brokerage) {
        if (brokerage.currency === Currency.HKD) setFormMarket(Market.HK);
        else if (brokerage.currency === Currency.CNY) setFormMarket(Market.CN);
        else setFormMarket(Market.US);
    }
    setShowAddModal(true);
  };

  const openEditAsset = (asset: Asset) => {
      setEditingAssetId(asset.id);
      
      if (asset.type === AssetType.STOCK) {
          setModalType('STOCK');
          setSelectedBrokerageId(asset.brokerageAccountId || '');
          setFormSymbol(asset.symbol || '');
          setFormQuantity(asset.quantity?.toString() || '');
          setFormCost(asset.costBasis?.toString() || '');
          setFormMarket(asset.market || Market.US);
      } else if (asset.type === AssetType.CRYPTO) {
          setModalType('CRYPTO');
          setFormSymbol(asset.symbol || '');
          setFormQuantity(asset.quantity?.toString() || '');
          setFormCost(asset.costBasis?.toString() || '');
      } else if (asset.type === AssetType.LENT_MONEY) {
          setModalType('LENT');
          setFormDebtor(asset.debtorName || asset.name);
          setFormValue(asset.manualValue?.toString() || '');
          setFormDateLent(asset.dateLent || '');
          setFormCurrency(asset.currency || Currency.CNY);
      } else {
          setModalType('MANUAL');
          setFormName(asset.name);
          setFormValue(asset.manualValue?.toString() || '');
          setFormCurrency(asset.currency || Currency.CNY);
      }
      setShowAddModal(true);
  };

  const openEditLiability = (liability: Liability) => {
      setEditingAssetId(liability.id); // Reusing ID state
      setModalType('LIABILITY');
      setFormName(liability.name);
      setFormValue(liability.totalAmount.toString());
      setFormDueDate(liability.dueDate || '');
      setFormMonthlyInterest(liability.monthlyInterest?.toString() || '');
      setShowAddModal(true);
  }

  const openAddCrypto = () => {
    setModalType('CRYPTO');
    setEditingAssetId(null);
    setShowAddModal(true);
  }

  const openAddManual = () => {
    setModalType('MANUAL');
    setEditingAssetId(null);
    setFormCurrency(Currency.CNY); // Default CNY
    setShowAddModal(true);
  }

  const openAddLent = () => {
    setModalType('LENT');
    setEditingAssetId(null);
    setFormCurrency(Currency.CNY);
    setShowAddModal(true);
  }

  const openAddLiability = () => {
    setModalType('LIABILITY');
    setEditingAssetId(null);
    setShowAddModal(true);
  }

  const handleAddNew = () => {
    if (activeTab === 'crypto') openAddCrypto();
    else if (activeTab === 'manual') openAddManual();
    else if (activeTab === 'lent') openAddLent();
    else if (activeTab === 'liabilities') openAddLiability();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize Symbol here
    const cleanSymbol = formSymbol.trim().toUpperCase();

    if (modalType === 'LIQUIDATE') {
        if (editingAssetId) {
            onLiquidateAsset(editingAssetId, parseFloat(formExitPrice), formExitDate, formExitReason);
        }
    } else if (modalType === 'BROKERAGE') {
      const inputVal = parseFloat(formValue) || 0;
      
      if (editingBrokerageId) {
        // Find existing to preserve ID and totalValue calc logic
        const existing = state.brokerageAccounts.find(b => b.id === editingBrokerageId);
        if (existing) {
            onUpdateBrokerage({
                ...existing,
                name: formName,
                availableCash: inputVal, // Update Cash
                // totalValue will be recalc'd in App.tsx
            });
        }
      } else {
        // New Account
        const account: BrokerageAccount = {
            id: Date.now().toString(),
            name: formName,
            currency: formCurrency,
            availableCash: inputVal,
            totalValue: inputVal // Initially just cash
        };
        onAddBrokerage(account);
      }
    } else if (modalType === 'STOCK') {
      const commonAssetData = {
          id: editingAssetId || Date.now().toString(),
          name: cleanSymbol,
          type: AssetType.STOCK,
          currency: Currency.USD,
          symbol: cleanSymbol,
          quantity: parseFloat(formQuantity) || 0,
          costBasis: parseFloat(formCost) || 0,
          market: formMarket,
          brokerageAccountId: selectedBrokerageId
      };

      if (editingAssetId) {
          // Preserve existing API data if updating
          const existing = state.assets.find(a => a.id === editingAssetId);
          onUpdateAsset({ ...existing, ...commonAssetData } as Asset);
      } else {
          onAddAsset(commonAssetData as Asset);
      }

    } else if (modalType === 'CRYPTO') {
        const commonAssetData = {
            id: editingAssetId || Date.now().toString(),
            name: cleanSymbol,
            type: AssetType.CRYPTO,
            currency: Currency.USD,
            symbol: cleanSymbol,
            quantity: parseFloat(formQuantity) || 0,
            costBasis: parseFloat(formCost) || 0,
            market: Market.US
        };

        if (editingAssetId) {
            const existing = state.assets.find(a => a.id === editingAssetId);
            onUpdateAsset({ ...existing, ...commonAssetData } as Asset);
        } else {
            onAddAsset(commonAssetData as Asset);
        }

    } else if (modalType === 'MANUAL') {
        const commonAssetData = {
            id: editingAssetId || Date.now().toString(),
            name: formName,
            type: AssetType.CASH,
            currency: formCurrency,
            manualValue: parseFloat(formValue) || 0,
        };
        if (editingAssetId) {
             const existing = state.assets.find(a => a.id === editingAssetId);
             onUpdateAsset({ ...existing, ...commonAssetData } as Asset);
        } else {
             onAddAsset(commonAssetData as Asset);
        }

    } else if (modalType === 'LENT') {
        const commonAssetData = {
            id: editingAssetId || Date.now().toString(),
            name: formDebtor, // Store debtor name in name field for simplicity
            debtorName: formDebtor,
            type: AssetType.LENT_MONEY,
            currency: Currency.CNY, // Keeping Lent as CNY default for now as per minimal change for Lent
            manualValue: parseFloat(formValue) || 0,
            dateLent: formDateLent,
        };
        if (editingAssetId) {
             const existing = state.assets.find(a => a.id === editingAssetId);
             onUpdateAsset({ ...existing, ...commonAssetData } as Asset);
        } else {
             onAddAsset(commonAssetData as Asset);
        }

    } else if (modalType === 'LIABILITY') {
        const commonLiabData = {
            id: editingAssetId || Date.now().toString(),
            name: formName,
            type: LiabilityType.LOAN,
            totalAmount: parseFloat(formValue),
            currency: Currency.CNY,
            dueDate: formDueDate,
            monthlyInterest: parseFloat(formMonthlyInterest) || 0
         };
         if (editingAssetId) {
             const existing = state.liabilities.find(l => l.id === editingAssetId);
             onUpdateLiability({ ...existing, ...commonLiabData } as Liability);
         } else {
             onAddLiability(commonLiabData);
         }
    }

    resetForm();
  };

  const getCurrencySymbol = (currency: Currency) => {
      switch(currency) {
          case Currency.USD: return '$';
          case Currency.HKD: return 'HK$';
          case Currency.CNY: return '¥';
          default: return '$';
      }
  }

  const getCurrencyLabel = () => {
    if (modalType === 'CRYPTO') return '$';
    if (modalType === 'STOCK') {
        if (formMarket === Market.HK) return 'HK$';
        if (formMarket === Market.CN) return '¥';
        return '$';
    }
    return '';
  }

  // Convert a native price to CNY for display only if needed, or vice versa
  const getExchangeRate = (from: Currency, to: Currency) => {
      if (from === to) return 1;
      const rateFrom = exchangeRates[from] || 1;
      const rateTo = exchangeRates[to] || 1;
      return rateFrom / rateTo;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Portfolio Manager</h2>
        {activeTab === 'stocks' ? (
          <button 
            onClick={openAddBrokerage}
            className="bg-brand-green text-black px-4 py-2 rounded-lg font-bold hover:bg-[#00b004] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Brokerage
          </button>
        ) : (
          <button 
            onClick={handleAddNew}
            className="bg-brand-green text-black px-4 py-2 rounded-lg font-bold hover:bg-[#00b004] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: 'stocks', icon: Building, label: 'Stocks' },
          { id: 'crypto', icon: Coins, label: 'Crypto' },
          { id: 'manual', icon: Banknote, label: 'Cash / Other' },
          { id: 'lent', icon: Handshake, label: 'Money Lent' },
          { id: 'liabilities', icon: CreditCard, label: 'Liabilities' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white/10 text-white' : 'text-brand-muted hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Tab View (Grouped by Brokerage) */}
      {activeTab === 'stocks' && (
        <div className="space-y-8 animate-in fade-in">
          {state.brokerageAccounts.length === 0 && (
             <div className="text-center py-12 bg-brand-card rounded-xl border border-white/5 border-dashed">
                <p className="text-brand-muted mb-4">No brokerage accounts added yet.</p>
                <button onClick={openAddBrokerage} className="text-brand-green font-bold hover:underline">Create your first Securities Account</button>
             </div>
          )}
          {state.brokerageAccounts.map(account => {
            const accountAssets = state.assets.filter(a => a.brokerageAccountId === account.id);
            const accountSym = getCurrencySymbol(account.currency);
            
            // Calculate Stock Value in NATIVE Currency
            const stocksValueNative = accountAssets.reduce((sum, asset) => {
                return sum + ((asset.currentPrice || 0) * (asset.quantity || 0));
            }, 0);

            const dailyPnLBase = accountAssets.reduce((sum, a) => sum + (a.dailyChangeVal || 0), 0);
            
            // Convert Base PnL to Native for consistent display with Stock Value
            const rateBaseToNative = getExchangeRate(Currency.CNY, account.currency);
            const dailyPnLNative = dailyPnLBase * rateBaseToNative;
            
            const prevValueNative = stocksValueNative - dailyPnLNative;
            const dailyYieldPct = prevValueNative !== 0 ? (dailyPnLNative / prevValueNative) * 100 : 0;

            const availableCashNative = account.availableCash || 0;
            const totalNetAssetsNative = availableCashNative + stocksValueNative;
            
            const rateToCNY = getExchangeRate(account.currency, Currency.CNY);
            const totalNetAssetsCNY = totalNetAssetsNative * rateToCNY;

            return (
              <div key={account.id} className="bg-brand-card rounded-xl border border-white/5 overflow-hidden">
                {/* Account Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-green/10 rounded-lg text-brand-green">
                           <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-white flex items-center gap-2">
                             {account.name}
                             <button onClick={() => openEditBrokerage(account)} className="text-brand-muted hover:text-white p-1 rounded hover:bg-white/10">
                                <Edit2 className="w-3 h-3" />
                             </button>
                           </h3>
                           <span className="text-xs text-brand-muted">Securities Account • {account.currency}</span>
                        </div>
                     </div>
                     <button onClick={() => onRemoveBrokerage(account.id)} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete Account
                     </button>
                  </div>
                  
                  {/* Account Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                        <span className="text-xs text-brand-muted block mb-1">Total Net Assets</span>
                        <div className="flex flex-col">
                           <span className="text-lg font-mono text-white font-bold">{accountSym}{totalNetAssetsNative.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                           <span className="text-xs text-brand-muted">≈ ¥{totalNetAssetsCNY.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                     </div>
                     <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                        <span className="text-xs text-brand-muted block mb-1">Stock Value ({account.currency})</span>
                        <div className="flex flex-col">
                           <span className="text-lg font-mono text-white">{accountSym}{stocksValueNative.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                           <div className={`text-xs font-mono flex items-center gap-1 ${dailyPnLNative >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                              <span>{dailyPnLNative >= 0 ? '+' : ''}{dailyPnLNative.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                              <span>({dailyYieldPct.toFixed(2)}%)</span>
                           </div>
                        </div>
                     </div>
                     <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                        <span className="text-xs text-brand-muted block mb-1">Available Cash ({account.currency})</span>
                        <div className="flex items-center gap-2">
                             <span className={`text-lg font-mono font-bold ${availableCashNative < 0 ? 'text-brand-red' : 'text-brand-green'}`}>
                                {accountSym}{availableCashNative.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                             </span>
                             <button onClick={() => openEditBrokerage(account)} className="text-brand-muted hover:text-brand-green">
                                <Edit2 className="w-3 h-3" />
                             </button>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Stock List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs text-brand-muted uppercase tracking-wider">
                        <tr>
                          <th className="p-4 pl-6">Stock ID</th>
                          <th className="p-4 text-left">Name</th>
                          <th className="p-4 text-right">Qty</th>
                          <th className="p-4 text-right">Avg Cost</th>
                          <th className="p-4 text-right">Price</th>
                          <th className="p-4 text-right">Value ({account.currency})</th>
                          <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {accountAssets.length === 0 ? (
                          <tr><td colSpan={7} className="p-6 text-center text-brand-muted text-sm">No stocks added to this account.</td></tr>
                        ) : (
                          accountAssets.map(asset => {
                            // Display in Account Currency (Native)
                            const nativeValue = (asset.currentPrice || 0) * (asset.quantity || 0);

                            return (
                              <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-4 pl-6 font-medium text-white">{asset.symbol} <span className="text-xs text-brand-muted ml-1">{asset.market?.toUpperCase()}</span></td>
                                  <td className="p-4 text-left text-brand-muted">{asset.name}</td>
                                  <td className="p-4 text-right text-brand-muted font-mono">{asset.quantity}</td>
                                  <td className="p-4 text-right text-brand-muted font-mono">{accountSym}{asset.costBasis?.toFixed(2) || '0.00'}</td>
                                  <td className="p-4 text-right font-mono text-brand-muted">
                                    {asset.currentPrice ? `${accountSym}${asset.currentPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td className="p-4 text-right font-mono text-white">
                                    <div>{nativeValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                                    {asset.totalReturnPct !== undefined && (
                                        <div className={`text-xs ${asset.totalReturnPct >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                          {asset.totalReturnPct >= 0 ? '+' : ''}{asset.totalReturnPct.toFixed(2)}%
                                        </div>
                                    )}
                                  </td>
                                  <td className="p-4 text-right pr-6">
                                     <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => openEditAsset(asset)} className="p-2 hover:bg-white/10 text-brand-muted hover:text-brand-green rounded transition-colors" title="Edit">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleLiquidateClick(asset)} className="p-2 hover:bg-white/10 text-brand-muted hover:text-brand-green rounded transition-colors" title="Liquidate / Clear Position">
                                            <Gavel className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </td>
                              </tr>
                            );
                          })
                        )}
                        {/* Add Stock Row */}
                        <tr>
                          <td colSpan={7} className="p-2">
                              <button 
                                onClick={() => openAddStock(account.id)}
                                className="w-full py-2 flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-brand-green hover:bg-white/5 rounded transition-colors dashed-border"
                              >
                                <Plus className="w-3 h-3" /> Add Stock to {account.name}
                              </button>
                          </td>
                        </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          
          {/* Cleared Stocks List */}
          {state.clearedAssets && state.clearedAssets.length > 0 && (
              <div className="bg-brand-card rounded-xl border border-white/5 overflow-hidden mt-8">
                  <div className="p-6 border-b border-white/5 flex items-center gap-3">
                      <div className="p-2 bg-gray-500/10 rounded-lg text-gray-500">
                          <History className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-brand-muted">Cleared Stock History</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-white/5 text-xs text-brand-muted uppercase tracking-wider">
                              <tr>
                                  <th className="p-4 pl-6">Stock ID</th>
                                  <th className="p-4">Name</th>
                                  <th className="p-4 text-right">Qty</th>
                                  <th className="p-4 text-right">Exit Price</th>
                                  <th className="p-4 text-right">Total Value</th>
                                  <th className="p-4 text-right">P/L</th>
                                  <th className="p-4 text-right pr-6">Exit Date</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {state.clearedAssets.map((asset, idx) => {
                                  const sym = getCurrencySymbol(asset.currency || Currency.USD);
                                  return (
                                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                                          <td className="p-4 pl-6 font-medium text-brand-muted">{asset.symbol}</td>
                                          <td className="p-4 text-brand-muted">{asset.name}</td>
                                          <td className="p-4 text-right text-brand-muted font-mono">{asset.quantity}</td>
                                          <td className="p-4 text-right text-brand-muted font-mono">{sym}{asset.exitPrice}</td>
                                          <td className="p-4 text-right text-brand-muted font-mono">{sym}{asset.exitTotalValue.toLocaleString()}</td>
                                          <td className={`p-4 text-right font-mono ${asset.realizedPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                              {asset.realizedPnL >= 0 ? '+' : ''}{asset.realizedPnL.toFixed(2)}
                                          </td>
                                          <td className="p-4 text-right text-brand-muted pr-6">{asset.exitDate}</td>
                                      </tr>
                                  )
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
        </div>
      )}

      {/* Non-Stock Views */}
      {activeTab !== 'stocks' && (
         <div className="bg-brand-card rounded-xl border border-white/5 overflow-hidden animate-in fade-in">
            <table className="w-full text-left">
               <thead className="bg-white/5 text-xs text-brand-muted uppercase tracking-wider">
                  <tr>
                     <th className="p-4 pl-6">Name / Details</th>
                     {activeTab === 'crypto' && <th className="p-4 text-right">Quantity</th>}
                     {activeTab === 'crypto' && <th className="p-4 text-right">Price</th>}
                     {activeTab === 'liabilities' && <th className="p-4 text-right">Details</th>}
                     {activeTab === 'lent' && <th className="p-4 text-right">Date Lent</th>}
                     <th className="p-4 text-right">Total Value (Base)</th>
                     <th className="p-4 text-right pr-6">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {activeTab === 'liabilities' 
                     ? state.liabilities.map(l => (
                        <tr key={l.id} className="hover:bg-white/5">
                           <td className="p-4 pl-6 text-white">
                               <div className="font-bold">{l.name}</div>
                               <div className="text-xs text-brand-muted mt-1">{l.type}</div>
                           </td>
                           <td className="p-4 text-right text-xs text-brand-muted">
                               {l.dueDate && <div className="mb-1">Due: {l.dueDate}</div>}
                               {l.monthlyInterest ? <div>Int/Mo: {l.monthlyInterest}</div> : null}
                           </td>
                           <td className="p-4 text-right font-mono text-white">{l.totalAmount.toLocaleString()}</td>
                           <td className="p-4 text-right pr-6">
                               <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => openEditLiability(l)} className="p-2 hover:bg-white/10 text-brand-muted hover:text-brand-green rounded transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteClick(l.id, 'LIABILITY')} className="p-2 hover:bg-red-500/20 text-brand-muted hover:text-red-500 rounded transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                           </td>
                        </tr>
                     ))
                     : state.assets.filter(a => {
                         if (activeTab === 'crypto') return a.type === AssetType.CRYPTO;
                         if (activeTab === 'lent') return a.type === AssetType.LENT_MONEY;
                         return (a.type !== AssetType.STOCK && a.type !== AssetType.CRYPTO && a.type !== AssetType.LENT_MONEY);
                     }).map(a => (
                        <tr key={a.id} className="hover:bg-white/5">
                           <td className="p-4 pl-6 text-white">
                              <div className="font-medium">{activeTab === 'lent' ? (a.debtorName || a.name) : (a.symbol || a.name)}</div>
                           </td>
                           {activeTab === 'crypto' && <td className="p-4 text-right text-brand-muted font-mono">{a.quantity}</td>}
                           {activeTab === 'crypto' && <td className="p-4 text-right text-brand-muted font-mono">
                               ${a.currentPrice?.toFixed(2)}
                           </td>}
                           {activeTab === 'lent' && (
                               <td className="p-4 text-right text-xs text-brand-muted">
                                   <div>{a.dateLent || '-'}</div>
                               </td>
                           )}
                           <td className="p-4 text-right font-mono text-white">
                              <div>{getCurrencySymbol(state.baseCurrency)}{(a.currentValue || a.manualValue || 0).toLocaleString()}</div>
                              {activeTab === 'crypto' && a.totalReturnPct !== undefined && (
                                  <div className={`text-xs ${a.totalReturnPct >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                    {a.totalReturnPct >= 0 ? '+' : ''}{a.totalReturnPct.toFixed(2)}%
                                  </div>
                              )}
                           </td>
                           <td className="p-4 text-right pr-6">
                               <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => openEditAsset(a)} className="p-2 hover:bg-white/10 text-brand-muted hover:text-brand-green rounded transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteClick(a.id, 'ASSET')} className="p-2 hover:bg-red-500/20 text-brand-muted hover:text-red-500 rounded transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                           </td>
                        </tr>
                     ))
                  }
                  {((activeTab === 'liabilities' && state.liabilities.length === 0) || (activeTab !== 'liabilities' && state.assets.filter(a => {
                      if (activeTab === 'crypto') return a.type === AssetType.CRYPTO;
                      if (activeTab === 'lent') return a.type === AssetType.LENT_MONEY;
                      return (a.type !== AssetType.STOCK && a.type !== AssetType.CRYPTO && a.type !== AssetType.LENT_MONEY);
                  }).length === 0)) && (
                     <tr><td colSpan={6} className="p-8 text-center text-brand-muted">No items found.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      )}

      {/* Unified Modal */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto">
            <div className="bg-brand-card w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl my-8">
               <h3 className="text-xl font-bold text-white mb-6">
                  {modalType === 'BROKERAGE' ? (editingBrokerageId ? 'Edit Account' : 'New Securities Account') : 
                   modalType === 'STOCK' ? (editingAssetId ? 'Edit Position' : 'Add Stock Position') : 
                   modalType === 'CRYPTO' ? (editingAssetId ? 'Edit Crypto' : 'Add Crypto') :
                   modalType === 'LIQUIDATE' ? 'Liquidate / Clear Position' :
                   modalType === 'LENT' ? (editingAssetId ? 'Edit Loan' : 'Add Money Lent') :
                   modalType === 'LIABILITY' ? (editingAssetId ? 'Edit Liability' : 'Add Liability') : (editingAssetId ? 'Edit Asset' : 'Add Manual Asset')}
               </h3>
               <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {modalType === 'LIQUIDATE' && (
                      <>
                        <div className="bg-brand-green/10 p-4 rounded-lg text-sm text-brand-green mb-4">
                            Clearing a position moves it to history and updates your cash balance.
                        </div>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Stock Name/ID</label>
                           <input disabled value={formSymbol} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white cursor-not-allowed" />
                        </div>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Clearing Price</label>
                           <input required type="number" step="any" value={formExitPrice} onChange={e => setFormExitPrice(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Clearing Date</label>
                           <input required type="date" value={formExitDate} onChange={e => setFormExitDate(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Reason</label>
                           <textarea value={formExitReason} onChange={e => setFormExitReason(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="Target reached / Stop loss..." rows={3} />
                        </div>
                      </>
                  )}

                  {modalType === 'BROKERAGE' && (
                     <>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Account Name</label>
                           <input required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                        
                        {!editingBrokerageId && (
                            <div>
                                <label className="block text-xs text-brand-muted mb-1">Account Currency</label>
                                <select value={formCurrency} onChange={e => setFormCurrency(e.target.value as Currency)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white outline-none">
                                    <option value={Currency.HKD}>HKD (Hong Kong Dollar)</option>
                                    <option value={Currency.USD}>USD (US Dollar)</option>
                                    <option value={Currency.CNY}>CNY (Chinese Yuan)</option>
                                </select>
                            </div>
                        )}

                        <div>
                           <label className="block text-xs text-brand-muted mb-1">
                               {editingBrokerageId ? 'Available Cash' : 'Initial Cash'} ({getCurrencySymbol(formCurrency)})
                           </label>
                           <input required type="number" step="any" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0.00" />
                           {editingBrokerageId && <p className="text-xs text-brand-muted mt-1">Total Net Assets will be automatically calculated based on stock values + this cash amount.</p>}
                        </div>
                     </>
                  )}

                  {(modalType === 'STOCK' || modalType === 'CRYPTO') && (
                     <>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">
                               {modalType === 'STOCK' ? 'Stock ID' : 'Symbol'} {modalType === 'CRYPTO' && '(e.g. BTC)'}
                           </label>
                           <input required value={formSymbol} onChange={e => setFormSymbol(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder={modalType === 'STOCK' ? "AAPL" : "BTC"} />
                        </div>
                        {modalType === 'STOCK' && (
                          <div>
                            <label className="block text-xs text-brand-muted mb-1">Market</label>
                            <select value={formMarket} onChange={e => setFormMarket(e.target.value as Market)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white outline-none">
                              <option value={Market.US}>US</option>
                              <option value={Market.HK}>HK</option>
                              <option value={Market.CN}>CN</option>
                            </select>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs text-brand-muted mb-1">Quantity</label>
                              <input required type="number" step="any" value={formQuantity} onChange={e => setFormQuantity(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0" />
                           </div>
                           <div>
                              <label className="block text-xs text-brand-muted mb-1">Cost Per Unit ({getCurrencyLabel()})</label>
                              <input type="number" step="any" value={formCost} onChange={e => setFormCost(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0.00" />
                           </div>
                        </div>
                     </>
                  )}
                  
                  {modalType === 'LENT' && (
                      <>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Debtor Name (Who owes you?)</label>
                           <input required value={formDebtor} onChange={e => setFormDebtor(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Amount</label>
                           <input required type="number" step="any" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-xs text-brand-muted mb-1">Date Lent</label>
                            <input type="month" value={formDateLent} onChange={e => setFormDateLent(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                      </>
                  )}

                  {modalType === 'MANUAL' && (
                      <>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Name</label>
                           <input required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-brand-muted mb-1">Currency</label>
                                <select value={formCurrency} onChange={e => setFormCurrency(e.target.value as Currency)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white outline-none">
                                    <option value={Currency.CNY}>CNY (Chinese Yuan)</option>
                                    <option value={Currency.USD}>USD (US Dollar)</option>
                                    <option value={Currency.HKD}>HKD (Hong Kong Dollar)</option>
                                </select>
                            </div>
                            <div>
                               <label className="block text-xs text-brand-muted mb-1">Value/Amount</label>
                               <input required type="number" step="any" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0.00" />
                            </div>
                        </div>
                      </>
                  )}

                  {modalType === 'LIABILITY' && (
                      <>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Name</label>
                           <input required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs text-brand-muted mb-1">Total Amount</label>
                           <input required type="number" step="any" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0.00" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-xs text-brand-muted mb-1">Due Date</label>
                               <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" />
                            </div>
                            <div>
                               <label className="block text-xs text-brand-muted mb-1">Monthly Interest</label>
                               <input type="number" step="any" value={formMonthlyInterest} onChange={e => setFormMonthlyInterest(e.target.value)} className="w-full bg-brand-dark border border-white/10 rounded-lg p-3 text-white focus:border-brand-green outline-none" placeholder="0.00" />
                            </div>
                        </div>
                      </>
                  )}

                  <div className="flex gap-3 mt-6">
                     <button type="button" onClick={resetForm} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors">Cancel</button>
                     <button type="submit" className="flex-1 py-3 bg-brand-green hover:bg-[#00b004] text-black rounded-lg font-bold transition-colors">Confirm</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
            <div className="bg-brand-card w-full max-w-sm p-6 rounded-2xl border border-white/10 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Delete Item?</h3>
                <p className="text-sm text-brand-muted mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors">Delete</button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Portfolio;