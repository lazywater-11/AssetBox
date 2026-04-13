import { Asset, AssetType, LLMConfig, Market, ParsedStockItem, PriceData } from '../types';
import { DEFAULT_USD_CNY_RATE } from '../constants';
import { callLLMVision } from './llmService';

// Search stock code by name via Tencent SmartBox API (sequential to avoid JSONP var collision)
export const searchStockCodeByName = (name: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const varName = 'v_s_v2';
    delete (window as any)[varName];

    const script = document.createElement('script');
    script.src = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(name)}&type=N&from=S&t=${Date.now()}`;

    const cleanup = () => { try { document.body.removeChild(script); } catch {} };

    script.onload = () => {
      const raw = (window as any)[varName] as string | undefined;
      cleanup();
      if (!raw) { resolve(null); return; }

      // First result (multiple results separated by '^'), fields separated by '~'
      // Format: type~name~code~price~...  e.g. "11~比亚迪~sz002594~..."
      const parts = raw.split('^')[0].split('~');
      const rawCode = parts[2];
      if (!rawCode) { resolve(null); return; }

      // Strip exchange prefix: sh/sz/bj/hk → digits, us → uppercase
      const m = rawCode.match(/^(sh|sz|bj|hk|us)(.+)$/i);
      if (m) {
        resolve(m[1].toLowerCase() === 'us' ? m[2].toUpperCase() : m[2]);
      } else {
        resolve(rawCode);
      }
    };

    script.onerror = () => { cleanup(); resolve(null); };
    document.body.appendChild(script);
  });
};

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

export const parseStockScreenshot = async (
  imageBase64: string,
  mimeType: string,
  llmConfig: LLMConfig,
): Promise<ParsedStockItem[]> => {
  const prompt = `你是一个金融数据提取工具。请从这张券商持仓截图中提取所有持仓股票，返回严格的 JSON 数组，不要包含任何其他文字或 markdown 格式。

JSON 格式：
[
  {
    "name": "股票名称（从截图读取）",
    "symbol": "股票代码（仅从截图中直接读取，如截图未显示代码则填 null，绝对不要推断或猜测）",
    "symbolConfirmed": true或false（截图中有明确显示代码填true，没有显示代码填false）,
    "quantity": 持仓数量（整数，从"持仓/可用"列读取，找不到填null）,
    "costPrice": 成本价（数字，从"成本/现价"的成本列读取，找不到填null）,
    "currentPrice": 现价（数字，从"成本/现价"的现价列读取，找不到填null）,
    "market": "cn或hk或us（A股=cn，港股=hk，美股=us，ETF跟随其挂牌市场）"
  }
]

重要规则：symbol 字段只填截图中肉眼可见的代码，绝对不能根据股票名称推断代码。只返回 JSON 数组，无其他任何内容。如果图片不是券商持仓截图，返回空数组 []。`;

  const text = (await callLLMVision(llmConfig, prompt, imageBase64, mimeType)).trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  const items = JSON.parse(text) as Omit<ParsedStockItem, 'selected'>[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('未识别到持仓信息，请重新上传清晰的券商截图');
  }
  return items.map(item => ({ ...item, selected: true }));
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