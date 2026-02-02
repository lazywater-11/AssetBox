// Enums
export enum AssetType {
  CASH = 'CASH',
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  REAL_ESTATE = 'REAL_ESTATE',
  LENT_MONEY = 'LENT_MONEY', // New Type
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
  name: string; // Used for Stock Name, Cash Name, or Debtor Name (Lent Money)
  type: AssetType;
  
  // For Manual Assets (Cash, Real Estate, Lent Money)
  manualValue?: number;
  currency: Currency;

  // For Lent Money
  debtorName?: string; // Explicit field, though we can map to name
  dateLent?: string;

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

export interface ClearedAsset {
  id: string; // Original Asset ID
  symbol: string;
  name: string;
  quantity: number;
  market: Market;
  currency: Currency;
  buyCostBasis: number; // Original avg cost
  exitPrice: number; // Price at liquidation
  exitDate: string;
  exitReason: string;
  exitTotalValue: number; // quantity * exitPrice (Native Currency)
  exitTotalValueBase: number; // Converted to Base Currency at time of clearing (simplified)
  realizedPnL: number; // (exitPrice - buyCostBasis) * quantity
  clearedAt: string; // Timestamp
}

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  totalAmount: number;
  currency: Currency;
  interestRate?: number; // Annual Rate maybe?
  monthlyInterest?: number; // Manual input as requested
  dueDate?: string; // Manual input as requested
  monthlyPayment?: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string; // Markdown supported
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
  clearedAssets: ClearedAsset[]; // New List for History
  liabilities: Liability[];
  journal: JournalEntry[];
  history: HistoryPoint[];
}

export interface PriceData {
  price: number;
  changePct: number;
  name?: string;
}