import { Asset, AssetType, Market, PriceData } from '../types';
import { DEFAULT_USD_CNY_RATE } from '../constants';

// Helper for JSONP requests (Tencent Finance)
const jsonp = (url: string, callbackName: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.charset = "gbk"; // Important for Tencent data
    
    script.onload = () => {
      resolve(true);
      document.body.removeChild(script);
    };
    script.onerror = () => {
      reject(new Error(`JSONP request failed for ${url}`));
      document.body.removeChild(script);
    };
    document.body.appendChild(script);
  });
};

export const fetchStockPrices = async (assets: Asset[]): Promise<Record<string, PriceData>> => {
  const stockAssets = assets.filter(a => a.type === AssetType.STOCK && a.symbol);
  if (stockAssets.length === 0) return {};

  // Map asset ID to the actual code sent to Tencent
  const idToCodeMap: Record<string, string> = {};

  const codes = stockAssets.map(a => {
    let fullCode = '';
    const sym = a.symbol?.trim() || '';

    if (a.market === Market.US) {
       // Tencent usually expects 'us' + Uppercase Symbol
       fullCode = 'us' + sym.toUpperCase();
    } else if (a.market === Market.HK) {
       // HK often needs 5 digits for Tencent? Usually hk00700 works.
       fullCode = 'hk' + sym.toLowerCase();
    } else if (a.market === Market.CN) {
       // Intelligent prefix logic for A-shares
       const lowerSym = sym.toLowerCase();
       if (lowerSym.startsWith('sh') || lowerSym.startsWith('sz') || lowerSym.startsWith('bj')) {
          fullCode = lowerSym;
       } else {
          // Auto-guess based on standard Chinese market rules
          // SH: 6 (Main/STAR), 5 (ETF/Fund), 9 (B-Share)
          if (sym.startsWith('6') || sym.startsWith('5') || sym.startsWith('9')) {
             fullCode = 'sh' + sym;
          } 
          // SZ: 0 (Main), 3 (ChiNext), 1 (ETF/Fund), 2 (B-Share)
          else if (sym.startsWith('0') || sym.startsWith('3') || sym.startsWith('1') || sym.startsWith('2')) {
             fullCode = 'sz' + sym;
          } 
          // BJ: 4, 8
          else if (sym.startsWith('4') || sym.startsWith('8')) {
             fullCode = 'bj' + sym; 
          } else {
             // Fallback default to sh if unknown
             fullCode = 'sh' + sym; 
          }
       }
    } else {
       fullCode = sym;
    }
    
    idToCodeMap[a.id] = fullCode;
    return fullCode;
  }).join(',');

  // Add random timestamp to prevent caching
  const url = `https://qt.gtimg.cn/q=${codes}&t=${Date.now()}`;

  try {
    await jsonp(url, '');
    const results: Record<string, PriceData> = {};

    stockAssets.forEach(asset => {
      const codeSent = idToCodeMap[asset.id];
      // Tencent creates variable `v_code`
      // For US stocks, sometimes it returns v_usAAPL, sometimes v_usaapl depending on input
      // We check both
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataStr = (window as any)[`v_${codeSent}`] || (window as any)[`v_${codeSent.toLowerCase()}`];

      if (dataStr) {
        const parts = dataStr.split('~');
        // Tencent data structure varies slightly by market, but usually:
        // 1: Name (e.g. "腾讯控股")
        // 3: Current Price
        // 32: Change Percent (for CN/HK)
        // 32: Change Percent (for US as well usually)
        if (parts.length > 30) {
            const name = parts[1];
            const price = parseFloat(parts[3]);
            const changePct = parseFloat(parts[32]);
            
            if (!isNaN(price)) {
                results[asset.id] = { price, changePct, name };
            }
        }
      }
    });

    return results;
  } catch (error) {
    console.error("Failed to fetch stock prices", error);
    return {};
  }
};

export const fetchCryptoPrices = async (assets: Asset[]): Promise<Record<string, PriceData>> => {
  const cryptoAssets = assets.filter(a => a.type === AssetType.CRYPTO && a.symbol);
  if (cryptoAssets.length === 0) return {};

  const symbols = [...new Set(cryptoAssets.map(a => a.symbol?.toUpperCase()))].join(',');
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols}&tsyms=USD`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    const results: Record<string, PriceData> = {};

    cryptoAssets.forEach(asset => {
      const sym = asset.symbol?.toUpperCase() || '';
      const raw = json.RAW?.[sym]?.USD;
      if (raw) {
        results[asset.id] = {
          price: raw.PRICE,
          changePct: raw.CHANGEPCT24HOUR
        };
      }
    });
    return results;
  } catch (error) {
    console.error("Failed to fetch crypto prices", error);
    return {};
  }
};

export const fetchExchangeRates = async (): Promise<{ USD: number }> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.rates && data.rates.CNY) {
      return { USD: data.rates.CNY };
    }
    throw new Error("Invalid rate data");
  } catch (e) {
    console.warn("Using fallback exchange rate");
    return { USD: DEFAULT_USD_CNY_RATE };
  }
};