import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { fetchCryptoPrices, fetchExchangeRates, fetchStockPrices } from "./apiService";
import { AssetType, Currency, Market, HistoryPoint } from "./types";

admin.initializeApp();
const db = admin.firestore();

const DEFAULT_HKD_CNY_RATE = 0.92;

export const recordDailyNetWorth = functions.pubsub.schedule("0 17 * * *")
    .timeZone("Asia/Shanghai")
    .onRun(async (context) => {
        functions.logger.info("Starting daily net worth snapshot...", { structuredData: true });

        try {
            const ratesData = await fetchExchangeRates();
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
                if (!userData || !userData.appState) continue;

                const state = userData.appState;
                const assets = state.assets || [];
                const brokerages = state.brokerageAccounts || [];
                const liabilities = state.liabilities || [];
                const baseCurrency = state.baseCurrency || Currency.CNY;

                if (assets.length === 0 && brokerages.length === 0) continue;

                // Fetch prices
                const stockPrices = await fetchStockPrices(assets);
                const cryptoPrices = await fetchCryptoPrices(assets);

                let totalAssetsVal = 0;

                for (const asset of assets) {
                    let price = asset.currentPrice;

                    if (asset.type === AssetType.STOCK && stockPrices[asset.id]) {
                        price = stockPrices[asset.id].price;
                    } else if (asset.type === AssetType.CRYPTO && cryptoPrices[asset.id]) {
                        price = cryptoPrices[asset.id].price;
                    }

                    let currentValue = 0;

                    if ((asset.type === AssetType.STOCK || asset.type === AssetType.CRYPTO) && price && asset.quantity) {
                        let exchangeMult = 1;

                        if (baseCurrency === Currency.CNY) {
                            if (asset.type === AssetType.CRYPTO) exchangeMult = usdToCny;
                            else if (asset.market === Market.US) exchangeMult = usdToCny;
                            else if (asset.market === Market.HK) exchangeMult = hkdToCny;
                            else if (asset.market === Market.CN) exchangeMult = 1;
                        } else {
                            if (asset.market === Market.CN) exchangeMult = 1 / usdToCny;
                            else if (asset.market === Market.HK) exchangeMult = hkdToCny / usdToCny;
                        }

                        currentValue = price * asset.quantity * exchangeMult;
                    } else {
                        currentValue = asset.manualValue || 0;
                        if (asset.currency !== baseCurrency) {
                            if (baseCurrency === Currency.CNY && asset.currency === Currency.USD) currentValue *= usdToCny;
                            if (baseCurrency === Currency.CNY && asset.currency === Currency.HKD) currentValue *= hkdToCny;
                            if (baseCurrency === Currency.USD && asset.currency === Currency.CNY) currentValue /= usdToCny;
                        }
                    }
                    totalAssetsVal += currentValue;
                }

                let totalBrokerageCashBase = 0;
                for (const b of brokerages) {
                    let cashVal = 0;
                    if (baseCurrency === Currency.CNY) {
                        if (b.currency === Currency.CNY) cashVal = b.availableCash || 0;
                        else if (b.currency === Currency.USD) cashVal = (b.availableCash || 0) * usdToCny;
                        else if (b.currency === Currency.HKD) cashVal = (b.availableCash || 0) * hkdToCny;
                    } else {
                        if (b.currency === Currency.USD) cashVal = b.availableCash || 0;
                        else if (b.currency === Currency.CNY) cashVal = (b.availableCash || 0) / usdToCny;
                        else if (b.currency === Currency.HKD) cashVal = (b.availableCash || 0) / 7.8;
                    }
                    totalBrokerageCashBase += cashVal;
                }

                let totalLiabilitiesVal = 0;
                for (const l of liabilities) {
                    let liabVal = l.totalAmount || 0;
                    if (baseCurrency === Currency.CNY && l.currency === Currency.USD) {
                        liabVal *= usdToCny;
                    }
                    totalLiabilitiesVal += liabVal;
                }

                const currentNetWorth = totalAssetsVal + totalBrokerageCashBase - totalLiabilitiesVal;

                // Update history
                const history: HistoryPoint[] = state.history ? [...state.history] : [];
                const existingIndex = history.findIndex((h) => h.date === todayStr);

                if (existingIndex >= 0) {
                    history[existingIndex] = { date: todayStr, value: currentNetWorth };
                } else {
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

        } catch (e) {
            functions.logger.error("Error running daily job:", e);
        }
    });
