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

export interface LLMProviderDef {
  id: string;
  name: string;
  baseUrl: string;
  visionModels: string[];
  textModels: string[];
}

export const LLM_PROVIDERS: LLMProviderDef[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    visionModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o4-mini'],
    textModels: ['o3-mini'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    visionModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    textModels: [],
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    visionModels: ['glm-5v-turbo', 'glm-4.6v', 'glm-4v'],
    textModels: ['glm-4.7', 'glm-4.7-flash', 'glm-4'],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    visionModels: ['MiniMax-VL-01'],
    textModels: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-Text-01'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    visionModels: [],
    textModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3.1'],
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    visionModels: ['qwen3-vl-plus', 'qwen3-vl-flash', 'qwen-vl-max', 'qwen-vl-plus', 'qwen3.5-plus'],
    textModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  },
];