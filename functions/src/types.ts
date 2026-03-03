export enum AssetType {
    CASH = 'CASH',
    STOCK = 'STOCK',
    CRYPTO = 'CRYPTO',
    REAL_ESTATE = 'REAL_ESTATE',
    LENT_MONEY = 'LENT_MONEY',
    OTHER = 'OTHER'
}

export enum LiabilityType {
    MORTGAGE = 'MORTGAGE',
    LOAN = 'LOAN',
    CREDIT_CARD = 'CREDIT_CARD',
    OTHER = 'OTHER'
}

export enum Currency {
    CNY = 'CNY',
    USD = 'USD',
    HKD = 'HKD'
}

export enum Market {
    US = 'us',
    HK = 'hk',
    CN = 'cn'
}

export interface BrokerageAccount {
    id: string;
    name: string;
    currency: Currency;
    availableCash: number;
    totalValue: number;
}

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    manualValue?: number;
    currency: Currency;
    debtorName?: string;
    dateLent?: string;
    symbol?: string;
    market?: Market;
    quantity?: number;
    costBasis?: number;
    brokerageAccountId?: string;
    currentPrice?: number;
    currentValue?: number;
    dailyChangePct?: number;
    totalReturnPct?: number;
    dailyChangeVal?: number;
}

export interface Liability {
    id: string;
    name: string;
    type: LiabilityType;
    totalAmount: number;
    currency: Currency;
    interestRate?: number;
    monthlyInterest?: number;
    dueDate?: string;
    monthlyPayment?: number;
}

export interface HistoryPoint {
    date: string;
    value: number;
}

export interface PriceData {
    price: number;
    changePct: number;
    name?: string;
}
