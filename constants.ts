import { LayoutDashboard, PieChart, Wallet, BookOpen, Settings, TrendingUp, TrendingDown, DollarSign, Bitcoin, Landmark, CreditCard, Handshake } from 'lucide-react';

export const APP_NAME = "Asset Box";

export const MOCK_CHART_DATA = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4780 },
  { name: 'May', value: 5890 },
  { name: 'Jun', value: 6390 },
  { name: 'Jul', value: 7490 },
];

export const ICONS = {
  Dashboard: LayoutDashboard,
  Portfolio: PieChart,
  Cash: Wallet,
  Journal: BookOpen,
  Settings: Settings,
  Up: TrendingUp,
  Down: TrendingDown,
  Dollar: DollarSign,
  Crypto: Bitcoin,
  Bank: Landmark,
  Debt: CreditCard,
  Lent: Handshake
};

// Default exchange rate fallback strategy per PRD
export const DEFAULT_USD_CNY_RATE = 7.2;
export const DEFAULT_HKD_CNY_RATE = 0.92;