"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Market = exports.Currency = exports.LiabilityType = exports.AssetType = void 0;
var AssetType;
(function (AssetType) {
    AssetType["CASH"] = "CASH";
    AssetType["STOCK"] = "STOCK";
    AssetType["CRYPTO"] = "CRYPTO";
    AssetType["REAL_ESTATE"] = "REAL_ESTATE";
    AssetType["LENT_MONEY"] = "LENT_MONEY";
    AssetType["OTHER"] = "OTHER";
})(AssetType = exports.AssetType || (exports.AssetType = {}));
var LiabilityType;
(function (LiabilityType) {
    LiabilityType["MORTGAGE"] = "MORTGAGE";
    LiabilityType["LOAN"] = "LOAN";
    LiabilityType["CREDIT_CARD"] = "CREDIT_CARD";
    LiabilityType["OTHER"] = "OTHER";
})(LiabilityType = exports.LiabilityType || (exports.LiabilityType = {}));
var Currency;
(function (Currency) {
    Currency["CNY"] = "CNY";
    Currency["USD"] = "USD";
    Currency["HKD"] = "HKD";
})(Currency = exports.Currency || (exports.Currency = {}));
var Market;
(function (Market) {
    Market["US"] = "us";
    Market["HK"] = "hk";
    Market["CN"] = "cn";
})(Market = exports.Market || (exports.Market = {}));
//# sourceMappingURL=types.js.map