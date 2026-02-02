import React from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AppState, Asset, AssetType, Currency } from '../types';
import { ICONS } from '../constants';

interface DashboardProps {
  state: AppState;
  exchangeRate: number; // USD to Base
  onNavigate: (tab: string, subTab?: 'stocks' | 'crypto' | 'manual' | 'lent' | 'liabilities') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, exchangeRate, onNavigate }) => {
  // Calculations
  
  const stockAssets = state.assets.filter(a => a.type === AssetType.STOCK);
  const cryptoAssets = state.assets.filter(a => a.type === AssetType.CRYPTO);
  const manualAssets = state.assets.filter(a => a.type === AssetType.CASH || a.type === AssetType.REAL_ESTATE || a.type === AssetType.OTHER);
  const lentAssets = state.assets.filter(a => a.type === AssetType.LENT_MONEY);

  // Totals in CNY (Base)
  const cryptoTotal = cryptoAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const manualTotal = manualAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const lentTotal = lentAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  
  let totalBrokerageNetWorthCNY = 0;
  
  state.brokerageAccounts.forEach(account => {
      // 1. Stock portion (already converted in asset list)
      const accountStocks = stockAssets.filter(a => a.brokerageAccountId === account.id);
      const stockValCNY = accountStocks.reduce((sum, a) => sum + (a.currentValue || 0), 0);
      
      // 2. Cash portion
      let cashValCNY = 0;
      if (account.currency === Currency.CNY) cashValCNY = account.availableCash;
      else if (account.currency === Currency.USD) cashValCNY = account.availableCash * exchangeRate;
      else if (account.currency === Currency.HKD) cashValCNY = account.availableCash * 0.92; // hardcoded constant fallback
      
      totalBrokerageNetWorthCNY += (stockValCNY + cashValCNY);
  });

  // Include Lent Money in Total Assets
  const totalAssets = totalBrokerageNetWorthCNY + cryptoTotal + manualTotal + lentTotal;

  const calculateTotalLiabilities = () => {
    return state.liabilities.reduce((sum, liab) => {
      const val = liab.currency === Currency.USD && state.baseCurrency === Currency.CNY 
        ? liab.totalAmount * exchangeRate 
        : liab.totalAmount;
      return sum + val;
    }, 0);
  };

  const totalLiabilities = calculateTotalLiabilities();
  const netWorth = totalAssets - totalLiabilities;
  
  const dailyPnL = state.assets.reduce((sum, asset) => sum + (asset.dailyChangeVal || 0), 0);
  const dailyPnLPct = totalAssets > 0 ? (dailyPnL / totalAssets) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(state.baseCurrency === 'CNY' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: state.baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper to get top items for a category
  const getTopItems = (items: Asset[], count: number = 3) => {
    return [...items].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)).slice(0, count);
  };

  // --- Chart Data Logic ---
  // Generate data for the last 7 days (default) using history
  const getChartData = () => {
      const days = 7; // Fixed 7 days for Trend view
      const data = [];
      const historyMap = new Map((state.history || []).map(h => [h.date, h.value]));
      
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const val = historyMap.get(dateStr);
          // "If it was 0 before let it be 0"
          data.push({
              name: dateStr.slice(5), // MM-DD
              value: val !== undefined ? val : 0,
              fullDate: dateStr
          });
      }
      return data;
  };

  const chartData = getChartData();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-end">
        <div>
          <h2 className="text-brand-green text-sm font-semibold tracking-wider mb-1 uppercase">Total Net Worth</h2>
          <div className="text-5xl font-mono font-bold text-white tracking-tight">
            {formatCurrency(netWorth)}
          </div>
          <div className={`flex items-center gap-2 mt-2 ${dailyPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
            {dailyPnL >= 0 ? <ICONS.Up className="w-5 h-5" /> : <ICONS.Down className="w-5 h-5" />}
            <span className="font-mono font-medium text-lg">
              {formatCurrency(Math.abs(dailyPnL))} ({Math.abs(dailyPnLPct).toFixed(2)}%)
            </span>
            <span className="text-brand-muted text-sm ml-1">Today</span>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-brand-card rounded-2xl p-6 shadow-2xl shadow-black/30 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-white">Trend</h3>
          <div className="flex bg-black/30 rounded-lg p-1">
            {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map(t => (
              <button key={t} className={`px-3 py-1 text-xs rounded-md transition-colors ${t === '1M' ? 'bg-brand-green text-black font-bold' : 'text-brand-muted hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C805" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00C805" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#8e9196', fontSize: 12}} 
                dy={10}
              />
              <YAxis 
                hide={true} 
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e2124', borderColor: '#333', color: '#fff' }}
                itemStyle={{ color: '#00C805' }}
                formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                labelFormatter={(label) => label}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#00C805" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorVal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Asset Cards */}
      {/* Changed to flex-wrap to accommodate 5th card nicely */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        
        {/* Securities / Stock Card */}
        <div 
          onClick={() => onNavigate('portfolio', 'stocks')}
          className="bg-brand-card rounded-2xl p-6 border border-white/5 hover:border-brand-green/30 transition-all cursor-pointer group h-full"
        >
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <ICONS.Portfolio className="w-5 h-5"/>
             </div>
             <div>
                <span className="text-brand-muted text-xs uppercase tracking-wider font-bold">Stock</span>
                <div className="font-mono text-white font-bold">{formatCurrency(totalBrokerageNetWorthCNY)}</div>
             </div>
          </div>
          <div className="space-y-2">
             {state.brokerageAccounts.length === 0 && <span className="text-xs text-brand-muted italic">No accounts</span>}
             {state.brokerageAccounts.map(account => {
                 // Calculate Account Total in CNY
                 const accountStocks = stockAssets.filter(a => a.brokerageAccountId === account.id);
                 const stockValCNY = accountStocks.reduce((sum, a) => sum + (a.currentValue || 0), 0);
                 
                 let cashValCNY = 0;
                 if (account.currency === Currency.CNY) cashValCNY = account.availableCash;
                 else if (account.currency === Currency.USD) cashValCNY = account.availableCash * exchangeRate;
                 else if (account.currency === Currency.HKD) cashValCNY = account.availableCash * 0.92;
                 
                 const totalCNY = stockValCNY + cashValCNY;

                 return (
                   <div key={account.id} className="flex justify-between items-center text-sm">
                      <span className="text-white truncate max-w-[100px]">{account.name}</span>
                      <span className="font-mono text-brand-muted">{formatCurrency(totalCNY)}</span>
                   </div>
                 );
             })}
          </div>
        </div>

        {/* Crypto Card */}
        <div 
          onClick={() => onNavigate('portfolio', 'crypto')}
          className="bg-brand-card rounded-2xl p-6 border border-white/5 hover:border-brand-green/30 transition-all cursor-pointer group h-full"
        >
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                <ICONS.Crypto className="w-5 h-5"/>
             </div>
             <div>
                <span className="text-brand-muted text-xs uppercase tracking-wider font-bold">Crypto</span>
                <div className="font-mono text-white font-bold">{formatCurrency(cryptoTotal)}</div>
             </div>
          </div>
          <div className="space-y-2">
             {cryptoAssets.length === 0 && <span className="text-xs text-brand-muted italic">No crypto</span>}
             {getTopItems(cryptoAssets).map(a => (
               <div key={a.id} className="flex justify-between items-center text-sm">
                  <span className="text-white">{a.symbol}</span>
                  <span className="font-mono text-brand-muted">{formatCurrency(a.currentValue || 0)}</span>
               </div>
             ))}
             {cryptoAssets.length > 3 && <div className="text-xs text-brand-muted text-center pt-1">...</div>}
          </div>
        </div>

        {/* Cash Card */}
        <div 
          onClick={() => onNavigate('portfolio', 'manual')}
          className="bg-brand-card rounded-2xl p-6 border border-white/5 hover:border-brand-green/30 transition-all cursor-pointer group h-full"
        >
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-brand-green/10 rounded-lg text-brand-green">
                <ICONS.Cash className="w-5 h-5"/>
             </div>
             <div>
                <span className="text-brand-muted text-xs uppercase tracking-wider font-bold">Cash & Other</span>
                <div className="font-mono text-white font-bold">{formatCurrency(manualTotal)}</div>
             </div>
          </div>
          <div className="space-y-2">
             {manualAssets.length === 0 && <span className="text-xs text-brand-muted italic">No assets</span>}
             {getTopItems(manualAssets).map(a => (
               <div key={a.id} className="flex justify-between items-center text-sm">
                  <span className="text-white">{a.name}</span>
                  <span className="font-mono text-brand-muted">{formatCurrency(a.currentValue || 0)}</span>
               </div>
             ))}
             {manualAssets.length > 3 && <div className="text-xs text-brand-muted text-center pt-1">...</div>}
          </div>
        </div>

        {/* Money Lent Card (New) */}
        <div 
          onClick={() => onNavigate('portfolio', 'lent')}
          className="bg-brand-card rounded-2xl p-6 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group h-full"
        >
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <ICONS.Lent className="w-5 h-5"/>
             </div>
             <div>
                <span className="text-brand-muted text-xs uppercase tracking-wider font-bold">Money Lent</span>
                <div className="font-mono text-white font-bold">{formatCurrency(lentTotal)}</div>
             </div>
          </div>
          <div className="space-y-2">
             {lentAssets.length === 0 && <span className="text-xs text-brand-muted italic">No receivables</span>}
             {getTopItems(lentAssets).map(a => (
               <div key={a.id} className="flex justify-between items-center text-sm">
                  <span className="text-white truncate">{a.debtorName || a.name}</span>
                  <span className="font-mono text-brand-muted">{formatCurrency(a.currentValue || 0)}</span>
               </div>
             ))}
             {lentAssets.length > 3 && <div className="text-xs text-brand-muted text-center pt-1">...</div>}
          </div>
        </div>

        {/* Liabilities Card */}
        <div 
          onClick={() => onNavigate('portfolio', 'liabilities')}
          className="bg-brand-card rounded-2xl p-6 border border-white/5 hover:border-red-500/30 transition-all cursor-pointer group h-full"
        >
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <ICONS.Debt className="w-5 h-5"/>
             </div>
             <div>
                <span className="text-brand-muted text-xs uppercase tracking-wider font-bold">Liabilities</span>
                <div className="font-mono text-white font-bold">{formatCurrency(totalLiabilities)}</div>
             </div>
          </div>
          <div className="space-y-2">
             {state.liabilities.length === 0 && <span className="text-xs text-brand-muted italic">Debt free</span>}
             {state.liabilities.slice(0, 3).map(l => (
               <div key={l.id} className="flex justify-between items-center text-sm">
                  <span className="text-white">{l.name}</span>
                  <span className="font-mono text-brand-muted">{formatCurrency(l.totalAmount)}</span>
               </div>
             ))}
             {state.liabilities.length > 3 && <div className="text-xs text-brand-muted text-center pt-1">...</div>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;