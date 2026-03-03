import fetch from 'node-fetch';

import { Asset, AssetType, Market, PriceData } from './types.js';

const DEFAULT_USD_CNY_RATE = 7.2;

export const fetchStockPrices = async (assets: Asset[]): Promise<Record<string, PriceData>> => {
    const stockAssets = assets.filter(a => a.type === AssetType.STOCK && a.symbol);
    if (stockAssets.length === 0) return {};

    const idToCodeMap: Record<string, string> = {};

    const codes = stockAssets.map(a => {
        let fullCode = '';
        const sym = a.symbol?.trim() || '';

        if (a.market === Market.US) {
            fullCode = 'us' + sym.toUpperCase();
        } else if (a.market === Market.HK) {
            fullCode = 'hk' + sym.toLowerCase();
        } else if (a.market === Market.CN) {
            const lowerSym = sym.toLowerCase();
            if (lowerSym.startsWith('sh') || lowerSym.startsWith('sz') || lowerSym.startsWith('bj')) {
                fullCode = lowerSym;
            } else {
                if (sym.startsWith('6') || sym.startsWith('5') || sym.startsWith('9')) {
                    fullCode = 'sh' + sym;
                } else if (sym.startsWith('0') || sym.startsWith('3') || sym.startsWith('1') || sym.startsWith('2')) {
                    fullCode = 'sz' + sym;
                } else if (sym.startsWith('4') || sym.startsWith('8')) {
                    fullCode = 'bj' + sym;
                } else {
                    fullCode = 'sh' + sym;
                }
            }
        } else {
            fullCode = sym;
        }

        idToCodeMap[a.id] = fullCode;
        return fullCode;
    }).join(',');

    const url = `https://qt.gtimg.cn/q=${codes}&t=${Date.now()}`;

    try {
        const response = await fetch(url);
        // Read as buffer and decode from GBK if we need Chinese names, 
        // but for history we just need price and changePct, which are ascii numbers.
        const buffer = await response.arrayBuffer();
        // Actually TextDecoder might only support utf-8 in some environments. Let's just use utf-8, Japanese/Chinese text might be mangled but we only parse numbers
        const dataStr = Buffer.from(buffer).toString('utf-8');

        const results: Record<string, PriceData> = {};

        stockAssets.forEach(asset => {
            const codeSent = idToCodeMap[asset.id];
            const matchPattern = new RegExp(`v_${codeSent}="([^"]*)"`, 'i');
            const match = dataStr.match(matchPattern);

            if (match && match[1]) {
                const parts = match[1].split('~');
                if (parts.length > 30) {
                    const price = parseFloat(parts[3]);
                    const changePct = parseFloat(parts[32]);
                    if (!isNaN(price)) {
                        results[asset.id] = { price, changePct };
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
        const json = await response.json() as any;
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
        const data = await response.json() as any;
        if (data && data.rates && data.rates.CNY) {
            return { USD: data.rates.CNY };
        }
        throw new Error("Invalid rate data");
    } catch (e) {
        console.warn("Using fallback exchange rate");
        return { USD: DEFAULT_USD_CNY_RATE };
    }
};
