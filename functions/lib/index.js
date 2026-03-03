"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDailyNetWorth = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const apiService_1 = require("./apiService");
const types_1 = require("./types");
admin.initializeApp();
const db = admin.firestore();
const DEFAULT_HKD_CNY_RATE = 0.92;
exports.recordDailyNetWorth = functions.pubsub.schedule("0 17 * * *")
    .timeZone("Asia/Shanghai")
    .onRun(async (context) => {
    functions.logger.info("Starting daily net worth snapshot...", { structuredData: true });
    try {
        const ratesData = await (0, apiService_1.fetchExchangeRates)();
        const usdToCny = ratesData.USD;
        const hkdToCny = DEFAULT_HKD_CNY_RATE;
        const usersSnapshot = await db.collection("users").get();
        const today = new Date();
        // Format to YYYY-MM-DD based on Asia/Shanghai time
        const timeFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
        // en-CA formats to YYYY-MM-DD
        const todayStr = timeFormatter.format(today);
        let updatedCount = 0;
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            if (!userData || !userData.appState)
                continue;
            const state = userData.appState;
            const assets = state.assets || [];
            const brokerages = state.brokerageAccounts || [];
            const liabilities = state.liabilities || [];
            const baseCurrency = state.baseCurrency || types_1.Currency.CNY;
            if (assets.length === 0 && brokerages.length === 0)
                continue;
            // Fetch prices
            const stockPrices = await (0, apiService_1.fetchStockPrices)(assets);
            const cryptoPrices = await (0, apiService_1.fetchCryptoPrices)(assets);
            let totalAssetsVal = 0;
            for (const asset of assets) {
                let price = asset.currentPrice;
                if (asset.type === types_1.AssetType.STOCK && stockPrices[asset.id]) {
                    price = stockPrices[asset.id].price;
                }
                else if (asset.type === types_1.AssetType.CRYPTO && cryptoPrices[asset.id]) {
                    price = cryptoPrices[asset.id].price;
                }
                let currentValue = 0;
                if ((asset.type === types_1.AssetType.STOCK || asset.type === types_1.AssetType.CRYPTO) && price && asset.quantity) {
                    let exchangeMult = 1;
                    if (baseCurrency === types_1.Currency.CNY) {
                        if (asset.type === types_1.AssetType.CRYPTO)
                            exchangeMult = usdToCny;
                        else if (asset.market === types_1.Market.US)
                            exchangeMult = usdToCny;
                        else if (asset.market === types_1.Market.HK)
                            exchangeMult = hkdToCny;
                        else if (asset.market === types_1.Market.CN)
                            exchangeMult = 1;
                    }
                    else {
                        if (asset.market === types_1.Market.CN)
                            exchangeMult = 1 / usdToCny;
                        else if (asset.market === types_1.Market.HK)
                            exchangeMult = hkdToCny / usdToCny;
                    }
                    currentValue = price * asset.quantity * exchangeMult;
                }
                else {
                    currentValue = asset.manualValue || 0;
                    if (asset.currency !== baseCurrency) {
                        if (baseCurrency === types_1.Currency.CNY && asset.currency === types_1.Currency.USD)
                            currentValue *= usdToCny;
                        if (baseCurrency === types_1.Currency.CNY && asset.currency === types_1.Currency.HKD)
                            currentValue *= hkdToCny;
                        if (baseCurrency === types_1.Currency.USD && asset.currency === types_1.Currency.CNY)
                            currentValue /= usdToCny;
                    }
                }
                totalAssetsVal += currentValue;
            }
            let totalBrokerageCashBase = 0;
            for (const b of brokerages) {
                let cashVal = 0;
                if (baseCurrency === types_1.Currency.CNY) {
                    if (b.currency === types_1.Currency.CNY)
                        cashVal = b.availableCash || 0;
                    else if (b.currency === types_1.Currency.USD)
                        cashVal = (b.availableCash || 0) * usdToCny;
                    else if (b.currency === types_1.Currency.HKD)
                        cashVal = (b.availableCash || 0) * hkdToCny;
                }
                else {
                    if (b.currency === types_1.Currency.USD)
                        cashVal = b.availableCash || 0;
                    else if (b.currency === types_1.Currency.CNY)
                        cashVal = (b.availableCash || 0) / usdToCny;
                    else if (b.currency === types_1.Currency.HKD)
                        cashVal = (b.availableCash || 0) / 7.8;
                }
                totalBrokerageCashBase += cashVal;
            }
            let totalLiabilitiesVal = 0;
            for (const l of liabilities) {
                let liabVal = l.totalAmount || 0;
                if (baseCurrency === types_1.Currency.CNY && l.currency === types_1.Currency.USD) {
                    liabVal *= usdToCny;
                }
                totalLiabilitiesVal += liabVal;
            }
            const currentNetWorth = totalAssetsVal + totalBrokerageCashBase - totalLiabilitiesVal;
            // Update history
            const history = state.history ? [...state.history] : [];
            const existingIndex = history.findIndex((h) => h.date === todayStr);
            if (existingIndex >= 0) {
                history[existingIndex] = { date: todayStr, value: currentNetWorth };
            }
            else {
                history.push({ date: todayStr, value: currentNetWorth });
            }
            // Ensure sorted
            history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            await doc.ref.update({
                "appState.history": history
            });
            updatedCount++;
        }
        functions.logger.info(`Successfully updated net worth for ${updatedCount} users.`);
    }
    catch (e) {
        functions.logger.error("Error running daily job:", e);
    }
});
//# sourceMappingURL=index.js.map