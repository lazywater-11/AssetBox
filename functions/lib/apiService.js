"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchExchangeRates = exports.fetchCryptoPrices = exports.fetchStockPrices = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const types_js_1 = require("./types.js");
const DEFAULT_USD_CNY_RATE = 7.2;
const fetchStockPrices = async (assets) => {
    const stockAssets = assets.filter(a => a.type === types_js_1.AssetType.STOCK && a.symbol);
    if (stockAssets.length === 0)
        return {};
    const idToCodeMap = {};
    const codes = stockAssets.map(a => {
        var _a;
        let fullCode = '';
        const sym = ((_a = a.symbol) === null || _a === void 0 ? void 0 : _a.trim()) || '';
        if (a.market === types_js_1.Market.US) {
            fullCode = 'us' + sym.toUpperCase();
        }
        else if (a.market === types_js_1.Market.HK) {
            fullCode = 'hk' + sym.toLowerCase();
        }
        else if (a.market === types_js_1.Market.CN) {
            const lowerSym = sym.toLowerCase();
            if (lowerSym.startsWith('sh') || lowerSym.startsWith('sz') || lowerSym.startsWith('bj')) {
                fullCode = lowerSym;
            }
            else {
                if (sym.startsWith('6') || sym.startsWith('5') || sym.startsWith('9')) {
                    fullCode = 'sh' + sym;
                }
                else if (sym.startsWith('0') || sym.startsWith('3') || sym.startsWith('1') || sym.startsWith('2')) {
                    fullCode = 'sz' + sym;
                }
                else if (sym.startsWith('4') || sym.startsWith('8')) {
                    fullCode = 'bj' + sym;
                }
                else {
                    fullCode = 'sh' + sym;
                }
            }
        }
        else {
            fullCode = sym;
        }
        idToCodeMap[a.id] = fullCode;
        return fullCode;
    }).join(',');
    const url = `https://qt.gtimg.cn/q=${codes}&t=${Date.now()}`;
    try {
        const response = await (0, node_fetch_1.default)(url);
        // Read as buffer and decode from GBK if we need Chinese names, 
        // but for history we just need price and changePct, which are ascii numbers.
        const buffer = await response.arrayBuffer();
        // Actually TextDecoder might only support utf-8 in some environments. Let's just use utf-8, Japanese/Chinese text might be mangled but we only parse numbers
        const dataStr = Buffer.from(buffer).toString('utf-8');
        const results = {};
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
    }
    catch (error) {
        console.error("Failed to fetch stock prices", error);
        return {};
    }
};
exports.fetchStockPrices = fetchStockPrices;
const fetchCryptoPrices = async (assets) => {
    const cryptoAssets = assets.filter(a => a.type === types_js_1.AssetType.CRYPTO && a.symbol);
    if (cryptoAssets.length === 0)
        return {};
    const symbols = [...new Set(cryptoAssets.map(a => { var _a; return (_a = a.symbol) === null || _a === void 0 ? void 0 : _a.toUpperCase(); }))].join(',');
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols}&tsyms=USD`;
    try {
        const response = await (0, node_fetch_1.default)(url);
        const json = await response.json();
        const results = {};
        cryptoAssets.forEach(asset => {
            var _a, _b, _c;
            const sym = ((_a = asset.symbol) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || '';
            const raw = (_c = (_b = json.RAW) === null || _b === void 0 ? void 0 : _b[sym]) === null || _c === void 0 ? void 0 : _c.USD;
            if (raw) {
                results[asset.id] = {
                    price: raw.PRICE,
                    changePct: raw.CHANGEPCT24HOUR
                };
            }
        });
        return results;
    }
    catch (error) {
        console.error("Failed to fetch crypto prices", error);
        return {};
    }
};
exports.fetchCryptoPrices = fetchCryptoPrices;
const fetchExchangeRates = async () => {
    try {
        const response = await (0, node_fetch_1.default)('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates && data.rates.CNY) {
            return { USD: data.rates.CNY };
        }
        throw new Error("Invalid rate data");
    }
    catch (e) {
        console.warn("Using fallback exchange rate");
        return { USD: DEFAULT_USD_CNY_RATE };
    }
};
exports.fetchExchangeRates = fetchExchangeRates;
//# sourceMappingURL=apiService.js.map