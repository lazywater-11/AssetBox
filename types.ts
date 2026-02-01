// Enums
export enum AssetType {
  CASH = 'CASH',
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  REAL_ESTATE = 'REAL_ESTATE',
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
  CN = 'cn' // sh/sz usually
}

// Interfaces
export interface BrokerageAccount {
  id: string;
  name: string;
  currency: Currency;
  availableCash: number; // User inputs this manually
  totalValue: number; // Calculated: availableCash + sum(stock values)
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  // For Manual Assets
  manualValue?: number;
  currency: Currency;
  // For API Assets
  symbol?: string; // e.g., AAPL, BTC, 00700
  market?: Market; // For stocks
  quantity?: number;
  costBasis?: number; // Optional, for P/L calculation
  brokerageAccountId?: string; // Link to a brokerage account
  // Calculated at runtime
  currentPrice?: number;
  currentValue?: number; // In Base Currency
  dailyChangePct?: number; // From API (Daily)
  totalReturnPct?: number; // Calculated (Total P/L)
  dailyChangeVal?: number;
}

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  totalAmount: number;
  currency: Currency;
  interestRate?: number;
  monthlyPayment?: number;
  dueDate?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string; // Markdown supported
  // Removed relatedAssetId and tags from UI requirements, keeping optional in type for data compatibility if needed, 
  // but logically we can ignore them or keep them.
  relatedAssetId?: string;
  tags?: string[]; 
}

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface AppState {
  baseCurrency: Currency;
  brokerageAccounts: BrokerageAccount[];
  assets: Asset[];
  liabilities: Liability[];
  journal: JournalEntry[];
  history: HistoryPoint[];
}

export interface PriceData {
  price: number;
  changePct: number;
  name?: string;
}