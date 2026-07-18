# 吃点啥 (Eat What)

> 今天吃什么？让 AI 帮你决定！

一个基于 React + TypeScript + Vite 的「今天吃什么」推荐应用，帮助你解决每日的世纪难题。

## ✨ 功能特性

- 🎲 **随机推荐** - 一键随机选择今天吃什么
- 🍜 **分类筛选** - 按菜系、口味、场景筛选
- ❤️ **收藏功能** - 收藏你喜欢的餐厅/菜品
- 📝 **自定义列表** - 添加你自己的选择列表
- 🌐 **多语言支持** - 中英文界面切换
- 📱 **响应式设计** - 完美适配移动端和桌面端

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **样式方案**: Tailwind CSS + PostCSS
- **UI 组件**: shadcn/ui + Radix UI
- **图标库**: Lucide React

## 📦 项目结构

```
eat-what/
├── src/
│   ├── components/     # React 组件
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript 类型定义
│   └── App.tsx         # 主应用组件
├── public/             # 静态资源
├── index.html          # HTML 入口
├── vite.config.ts      # Vite 配置
├── tailwind.config.js  # Tailwind 配置
└── tsconfig.json       # TypeScript 配置
```

## 🌍 部署

### GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

拖拽 `dist` 文件夹到 Netlify 即可。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**今天吃什么？打开应用，让 AI 帮你决定！** 🍽️
