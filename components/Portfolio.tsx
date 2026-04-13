import React, { useState, useRef } from 'react';
import { AppState, Asset, AssetType, Currency, LLMConfig, Market, Liability, LiabilityType, BrokerageAccount, ParsedStockItem } from '../types';
import { Plus, Trash2, Wallet, Edit2, Coins, Banknote, Building, CreditCard, AlertTriangle, Handshake, Gavel, History, Camera, Loader2, Bot, X } from 'lucide-react';
import { parseStockScreenshot, searchStockCodeByName } from '../services/apiService';
import { callLLMText } from '../services/llmService';

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
  llmConfig?: LLMConfig;
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
  exchangeRates,
  llmConfig,
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

  // Screenshot import state
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [screenshotBrokerageId, setScreenshotBrokerageId] = useState('');
  const [screenshotParsing, setScreenshotParsing] = useState(false);
  const [screenshotError, setScreenshotError] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedStockItem[]>([]);
  const [screenshotInputKey, setScreenshotInputKey] = useState(0);

  // AI analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisAccountName, setAnalysisAccountName] = useState('');
  const [analysisAccountId, setAnalysisAccountId] = useState('');
  const [showAnalysisDrawer, setShowAnalysisDrawer] = useState(false);
  const [analysisCache, setAnalysisCache] = useState<Record<string, string>>({});

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

  // --- Screenshot Import ---

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, brokerageId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!llmConfig?.apiKey) {
      alert('请先在设置页面配置 LLM 模型和 API Key');
      return;
    }

    setScreenshotInputKey(k => k + 1);
    setScreenshotBrokerageId(brokerageId);
    setScreenshotParsing(true);
    setScreenshotError('');
    setParsedItems([]);
    setShowScreenshotModal(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const items = await parseStockScreenshot(base64, file.type, llmConfig);

        // Auto-search codes for items not confirmed from screenshot (sequential to avoid JSONP collision)
        const enriched = [...items];
        for (let i = 0; i < enriched.length; i++) {
          if (!enriched[i].symbolConfirmed || !enriched[i].symbol) {
            const found = await searchStockCodeByName(enriched[i].name);
            if (found) {
              enriched[i] = { ...enriched[i], symbol: found };
              // symbolConfirmed stays false → shows '搜' badge in table
            }
          }
        }

        setParsedItems(enriched);
      } catch (err) {
        setScreenshotError(err instanceof Error ? err.message : '识别失败，请检查截图或手动录入');
      } finally {
        setScreenshotParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateParsedItem = (index: number, field: keyof ParsedStockItem, value: string | number | boolean | null) => {
    setParsedItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleConfirmImport = () => {
    const brokerage = state.brokerageAccounts.find(b => b.id === screenshotBrokerageId);
    if (!brokerage) return;

    const marketCurrencyMap: Record<string, Currency> = {
      cn: Currency.CNY,
      hk: Currency.HKD,
      us: Currency.USD,
    };

    parsedItems
      .filter(item => item.selected && item.symbol?.trim())
      .forEach(item => {
        const market = item.market as Market;
        const currency = marketCurrencyMap[item.market] || brokerage.currency;
        const cleanSymbol = item.symbol.trim().toUpperCase();

        // Upsert: if same symbol already exists in this brokerage account, overwrite it
        const existing = state.assets.find(
          a => a.brokerageAccountId === screenshotBrokerageId && a.symbol === cleanSymbol
        );

        if (existing) {
          onUpdateAsset({
            ...existing,
            name: item.name || cleanSymbol,
            currency,
            symbol: cleanSymbol,
            quantity: item.quantity ?? existing.quantity,
            costBasis: item.costPrice ?? existing.costBasis,
            market,
          });
        } else {
          onAddAsset({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
            name: item.name || cleanSymbol,
            type: AssetType.STOCK,
            currency,
            symbol: cleanSymbol,
            quantity: item.quantity || 0,
            costBasis: item.costPrice || 0,
            market,
            brokerageAccountId: screenshotBrokerageId,
          });
        }
      });

    setShowScreenshotModal(false);
    setParsedItems([]);
  };

  // --- AI Analysis ---

  const handleAnalyzeAccount = async (account: BrokerageAccount, forceRefresh = false) => {
    if (!llmConfig?.apiKey) {
      alert('请先在设置页面配置 LLM 模型和 API Key');
      return;
    }

    const accountAssets = state.assets.filter(a => a.brokerageAccountId === account.id);
    if (accountAssets.length === 0) {
      alert('该账户暂无持仓，无法分析');
      return;
    }

    setAnalysisAccountName(account.name);
    setAnalysisAccountId(account.id);
    setShowAnalysisDrawer(true);

    // Return cached result unless user explicitly requests a refresh
    if (!forceRefresh && analysisCache[account.id]) {
      setAnalysisResult(analysisCache[account.id]);
      return;
    }

    setAnalysisResult('');
    setAnalysisLoading(true);

    const rows = accountAssets.map(a => {
      const nativeValue = ((a.currentPrice || 0) * (a.quantity || 0)).toFixed(2);
      const pnl = a.totalReturnPct !== undefined ? `${a.totalReturnPct.toFixed(2)}%` : 'N/A';
      return `| ${a.symbol} | ${a.name} | ${a.quantity} | ${a.costBasis?.toFixed(2) ?? 'N/A'} | ${a.currentPrice?.toFixed(2) ?? 'N/A'} | ${nativeValue} | ${pnl} |`;
    }).join('\n');

    const prompt = `你是一位专业的投资顾问。以下是用户在"${account.name}"证券账户中的当前持仓数据：

| 代码 | 名称 | 数量 | 成本价 | 现价 | 市值(${account.currency}) | 总收益率 |
|------|------|------|--------|------|--------------------------|---------|
${rows}

请从以下两个维度进行简明分析：

**1. 仓位健康度**
- 评估持仓的集中度（是否有单只股票占比过高的风险）
- 评估行业/市场分散度

**2. 个股建议**
- 针对每只持仓股票，结合其盈亏情况，给出简短的操作建议（如：继续持有、逢高减仓、关注风险等）

请用中文回答，格式清晰，语言简洁专业。`;

    try {
      const result = await callLLMText(llmConfig, prompt);
      setAnalysisResult(result);
      setAnalysisCache(prev => ({ ...prev, [account.id]: result }));
    } catch (err) {
      setAnalysisResult(`分析失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setAnalysisLoading(false);
    }
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

  // --- Lightweight Markdown Renderer ---
  const renderInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderMarkdown = (raw: string): React.ReactNode => {
    const lines = raw.split('\n');
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed === '---') {
        i++;
        continue;
      }

      // H2 / H3 heading → section card header
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
        const level = trimmed.startsWith('## ') ? 2 : 3;
        const text = trimmed.replace(/^#{2,3} /, '');
        nodes.push(
          <div key={i} className={`flex items-center gap-2 mt-6 mb-3 ${level === 2 ? 'mt-2' : ''}`}>
            <div className="w-1 h-5 rounded-full bg-brand-green shrink-0" />
            <span className="text-sm font-bold text-brand-green tracking-wide uppercase">{text}</span>
          </div>
        );
        i++;
        continue;
      }

      // H4 heading → sub-section
      if (trimmed.startsWith('#### ')) {
        const text = trimmed.replace(/^#### /, '');
        nodes.push(
          <p key={i} className="text-white font-semibold text-sm mt-4 mb-1">{renderInline(text)}</p>
        );
        i++;
        continue;
      }

      // Markdown table: collect consecutive lines starting with |
      if (trimmed.startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        // Parse header, skip separator, parse rows
        const parseRow = (line: string) =>
          line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        const headerCells = parseRow(tableLines[0] || '');
        const dataRows = tableLines
          .slice(1)
          .filter(l => !/^\|[-:| ]+\|$/.test(l))
          .map(parseRow);

        nodes.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-white/[0.07]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-brand-green/5 border-b border-white/[0.07]">
                  {headerCells.map((cell, ci) => (
                    <th key={ci} className="p-2 text-left text-brand-green/80 font-semibold uppercase tracking-wide whitespace-nowrap">{renderInline(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {dataRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-white/[0.03]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-2 text-white/70 whitespace-nowrap">{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Collect consecutive list items (- or *)
      if (trimmed.match(/^[-*] /)) {
        const items: string[] = [];
        while (i < lines.length && lines[i].trim().match(/^[-*] /)) {
          items.push(lines[i].trim().replace(/^[-*] /, ''));
          i++;
        }
        nodes.push(
          <ul key={`ul-${i}`} className="space-y-1.5 my-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-white/75 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-green/60 shrink-0" />
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Collect consecutive numbered list items
      if (trimmed.match(/^\d+\. /)) {
        const items: string[] = [];
        let idx = 1;
        while (i < lines.length && lines[i].trim().match(/^\d+\. /)) {
          items.push(lines[i].trim().replace(/^\d+\. /, ''));
          i++;
        }
        nodes.push(
          <ol key={`ol-${i}`} className="space-y-1.5 my-2">
            {items.map((item, n) => (
              <li key={n} className="flex items-start gap-2.5 text-sm text-white/75 leading-relaxed">
                <span className="mt-0.5 min-w-[20px] h-5 rounded bg-brand-green/15 text-brand-green text-xs font-mono font-bold flex items-center justify-center shrink-0">{idx++}</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Regular paragraph
      nodes.push(
        <p key={i} className="text-sm text-white/70 leading-relaxed my-1.5">{renderInline(trimmed)}</p>
      );
      i++;
    }

    return <div className="space-y-0.5">{nodes}</div>;
  };

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
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => handleAnalyzeAccount(account)}
                         disabled={analysisLoading}
                         className="text-brand-green hover:text-[#00e004] text-xs flex items-center gap-1 disabled:opacity-50"
                       >
                         <Bot className="w-3 h-3" />
                         {analysisLoading && analysisAccountName === account.name ? 'AI 分析中...' : 'AI 持仓分析'}
                       </button>
                       <button onClick={() => onRemoveBrokerage(account.id)} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1">
                         <Trash2 className="w-3 h-3" /> Delete Account
                       </button>
                     </div>
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => openAddStock(account.id)}
                                className="flex-1 py-2 flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-brand-green hover:bg-white/5 rounded transition-colors dashed-border"
                              >
                                <Plus className="w-3 h-3" /> Add Stock
                              </button>
                              <label className="flex-1 py-2 flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-brand-green hover:bg-white/5 rounded transition-colors dashed-border cursor-pointer">
                                <Camera className="w-3 h-3" /> Import from Screenshot
                                <input
                                  key={screenshotInputKey}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleScreenshotUpload(e, account.id)}
                                />
                              </label>
                            </div>
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

      {/* AI Analysis Drawer */}
      {showAnalysisDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAnalysisDrawer(false)} />
          <div className="relative w-full max-w-[480px] bg-[#0f0f0f] border-l border-white/[0.07] flex flex-col shadow-2xl">
            {/* Green accent bar at top */}
            <div className="h-[3px] w-full bg-gradient-to-r from-brand-green via-brand-green/60 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-brand-green" />
                </div>
                <div>
                  <div className="text-xs text-brand-muted uppercase tracking-widest font-medium">AI 持仓分析</div>
                  <div className="text-sm font-semibold text-white leading-tight">{analysisAccountName}</div>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysisDrawer(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
              {analysisLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-5 py-20">
                  {/* Pulsing ring animation */}
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-brand-green/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-brand-green/40" />
                    <div className="absolute inset-2 rounded-full bg-brand-green/5 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-brand-green" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm text-white/80 font-medium">正在深度分析持仓数据</p>
                    <p className="text-xs text-white/30">AI 正在评估仓位健康度与个股风险...</p>
                  </div>
                  {/* Animated dots */}
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(n => (
                      <div
                        key={n}
                        className="w-1.5 h-1.5 rounded-full bg-brand-green/60"
                        style={{ animation: `pulse 1.2s ease-in-out ${n * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Timestamp badge */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[10px] text-white/25 font-mono uppercase tracking-wider">
                      {new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Rendered markdown */}
                  {renderMarkdown(analysisResult)}

                  {/* Footer: disclaimer + re-analyze button */}
                  <div className="mt-8 pt-4 border-t border-white/[0.05] space-y-3">
                    <p className="text-[11px] text-white/20 leading-relaxed">
                      以上分析由 AI 模型生成，仅供参考，不构成投资建议。投资有风险，决策需谨慎。
                    </p>
                    <button
                      onClick={() => {
                        const account = state.brokerageAccounts.find(b => b.id === analysisAccountId);
                        if (account) handleAnalyzeAccount(account, true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-brand-green transition-colors"
                    >
                      <Bot className="w-3 h-3" /> 再次分析
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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

      {/* Screenshot Import Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto">
          <div className="bg-brand-card w-full max-w-2xl p-6 rounded-2xl border border-white/10 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-2">从截图导入持仓</h3>
            <p className="text-xs text-brand-muted mb-6">
              导入到：{state.brokerageAccounts.find(b => b.id === screenshotBrokerageId)?.name}
            </p>

            {screenshotParsing && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                <span className="text-brand-muted text-sm">AI 正在识别截图中的持仓数据...</span>
              </div>
            )}

            {screenshotError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm mb-4">
                {screenshotError}
              </div>
            )}

            {!screenshotParsing && parsedItems.length > 0 && (
              <>
                <p className="text-xs text-brand-muted mb-3">
                  识别到 {parsedItems.length} 只持仓，请核对并修改股票代码后导入。勾选要导入的条目：
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-xs text-brand-muted uppercase">
                      <tr>
                        <th className="p-3 text-left w-8"></th>
                        <th className="p-3 text-left">名称</th>
                        <th className="p-3 text-left">股票代码 *</th>
                        <th className="p-3 text-left">市场</th>
                        <th className="p-3 text-right">持仓</th>
                        <th className="p-3 text-right">成本价</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedItems.map((item, idx) => (
                        <tr key={idx} className={`${!item.selected ? 'opacity-40' : ''}`}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={e => updateParsedItem(idx, 'selected', e.target.checked)}
                              className="w-4 h-4 accent-brand-green cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-brand-muted text-xs">{item.name}</td>
                          <td className="p-3">
                            <div className="relative w-28">
                              <input
                                value={item.symbol || ''}
                                onChange={e => {
                                  updateParsedItem(idx, 'symbol', e.target.value);
                                  if (e.target.value.trim()) updateParsedItem(idx, 'symbolConfirmed', true);
                                }}
                                className="w-full bg-brand-dark border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-brand-green outline-none font-mono"
                                placeholder="如 601658"
                              />
                              {/* '搜' badge: code was auto-searched, not read from screenshot */}
                              {item.symbol && !item.symbolConfirmed && (
                                <span
                                  className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-brand-green/20 text-brand-green/80 rounded px-0.5 leading-tight"
                                  title="代码由搜索自动填入，请确认是否正确"
                                >搜</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <select
                              value={item.market}
                              onChange={e => updateParsedItem(idx, 'market', e.target.value)}
                              className="bg-brand-dark border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                            >
                              <option value="cn">CN</option>
                              <option value="hk">HK</option>
                              <option value="us">US</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={item.quantity ?? ''}
                              onChange={e => updateParsedItem(idx, 'quantity', e.target.value === '' ? null : Number(e.target.value))}
                              className="w-20 bg-brand-dark border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-brand-green outline-none text-right font-mono"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              step="any"
                              value={item.costPrice ?? ''}
                              onChange={e => updateParsedItem(idx, 'costPrice', e.target.value === '' ? null : Number(e.target.value))}
                              className="w-20 bg-brand-dark border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-brand-green outline-none text-right font-mono"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {!screenshotParsing && parsedItems.length === 0 && !screenshotError && (
              <div className="text-center py-8 text-brand-muted text-sm">暂无识别结果</div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setShowScreenshotModal(false); setParsedItems([]); }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              {parsedItems.length > 0 && !screenshotParsing && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 py-3 bg-brand-green hover:bg-[#00b004] text-black rounded-lg font-bold transition-colors"
                >
                  确认导入 ({parsedItems.filter(i => i.selected).length} 只)
                </button>
              )}
            </div>
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