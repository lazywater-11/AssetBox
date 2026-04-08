<div align="center">

<img width="1200" height="475" alt="AssetBox Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

<h1>💰 AssetBox</h1>

<p>个人多资产追踪与净值管理工具，支持 A股 / 美股 / 港股 / 加密货币，实时汇率换算，一站式掌握你的财富全貌。</p>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-asset--box--six.vercel.app-blue?style=flat-square&logo=vercel)](https://asset-box-six.vercel.app)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[在线体验 →](https://asset-box-six.vercel.app) · [报告问题](https://github.com/lazywater-11/AssetBox/issues) · [提交建议](https://github.com/lazywater-11/AssetBox/issues)

</div>

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 📈 **多市场实时报价** | A股、美股、港股、加密货币，每 5 分钟自动刷新价格 |
| 💱 **多币种净值计算** | 人民币 / 美元实时汇率换算，总资产一键切换货币单位 |
| 📊 **可视化资产图表** | 持仓分布饼图、净值变化曲线，财富一目了然 |
| 📓 **投资决策日志** | 记录每笔买卖的决策逻辑，复盘自己的交易思路 |
| 💸 **已实现盈亏追踪** | 清仓记录与累计收益统计，算清真实投资回报 |
| ☁️ **多端云同步** | Firebase 实时同步，手机 / 电脑数据随时一致 |
| 🔐 **Google 一键登录** | OAuth 鉴权，也支持 Guest 模式免登录体验 |

---

## 🖥️ 在线体验

无需安装，直接访问 → **[asset-box-six.vercel.app](https://asset-box-six.vercel.app)**

> 使用 Guest 模式可免登录查看完整功能演示，数据不会被保存。

---

## 🛠️ 技术栈

```
前端       React 18 + TypeScript 5 + Vite 6
UI 组件    Lucide React（图标）· Recharts（图表）
后端服务   Firebase Authentication · Firestore · Cloud Storage
部署       Vercel（自动 CI/CD）
```

---

## 🚀 本地运行

**环境要求：** Node.js 18+

```bash
# 1. 克隆项目
git clone https://github.com/lazywater-11/AssetBox.git
cd AssetBox

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 Firebase 配置和 Gemini API Key

# 4. 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173` 即可。

---

## ⚙️ 环境变量

在 `.env.local` 中配置以下变量：

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
GEMINI_API_KEY=your_gemini_api_key
```

Firebase 配置可在 [Firebase Console](https://console.firebase.google.com) 获取。

---

## 📁 项目结构

```
AssetBox/
├── src/
│   ├── components/     # UI 组件（资产卡片、图表、表单等）
│   ├── hooks/          # 自定义 React Hooks
│   ├── lib/            # Firebase 初始化 · 工具函数
│   ├── types/          # TypeScript 类型定义
│   └── App.tsx         # 应用入口
├── public/
└── vite.config.ts
```

---

## 🗺️ Roadmap

- [ ] 支持更多资产类型（REITs、债券、期权）
- [ ] 资产历史净值曲线回测
- [ ] 微信 / 企业微信推送每日资产播报
- [ ] 与 stock-analysis · buffett-analysis 联动分析

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 `git checkout -b feature/your-feature`
3. 提交代码 `git commit -m 'feat: add your feature'`
4. 推送分支并创建 PR

---

## 📄 License

[MIT](LICENSE) © [lazywater-11](https://github.com/lazywater-11)
