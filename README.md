# 🚀 QuickTerm - 极简 Tauri 跨平台终端

QuickTerm 是一款基于 **Tauri v2** + **React** + **TypeScript** 构建的轻量级终端模拟器。它专为追求极致简洁和响应速度的开发者设计，去除了传统终端的冗余，保留了最核心的命令行体验，并注入了现代化的 UI 设计。

---

## ✨ 核心特性

### 1. 📂 增强的目录导航 (Smart Navigation)
- **cd 命令深度优化**：
  - **波浪号自动展开**：支持 `cd ~` 及其子路径（如 `cd ~/Desktop`），自动解析为系统主目录。
  - **快速回退 (Old PWD)**：支持 `cd -` 在最近两个工作目录间无缝切换。
  - **直达主目录**：直接输入 `~` 或 `cd` 即可快速回航。
- **路径简写别名**：
  - `..` (一级回退), `...` (两级回退), `....` (三级回退)。

### 2. ⚡ 预置高效别名 (Power Aliases)
内置了一系列生产力工具快捷键，减少重复敲击：
- **文件管理**：`ll`, `la`, `l`, `ls` (自动着色)。
- **Git 提效**：`gs` (status), `ga` (add), `gc` (commit), `gp` (push), `gl` (log)。
- **系统工具**：`c`/`cls` (清屏), `md` (创建目录), `rd` (删除目录)。

### 3. 🎨 现代化的提示符 (Modern Prompt)
- **Oh My Zsh 视觉风格**：采用经典的青色、绿色、紫色配色方案，清晰区分路径、指令与状态。
- **极致路径模式 (Compact Path)**：
  - 在深层目录工作时，仅显示当前目录名，告别冗长的全路径干扰。
  - **完整路径悬停预览**：将鼠标悬停在目录名上即可看到完整的绝对路径。
- **Git 状态实时感知**：自动检测当前目录是否为 Git 仓库，并实时显示当前分支名，如 `(main)` 或 `(feature/ui)`。

### 4. ⌨️ 极致交互体验
- **全平台兼容**：后端由 Rust 驱动，完美支持 macOS, Linux 和 Windows 系统原生 Shell。
- **智能清屏**：支持标准 `clear` 指令及 `Ctrl + L` 全局快捷键。
- **自动聚焦**：应用窗口激活时，输入框自动获得焦点，确保“开即即用”。
- **ANSI 过滤**：自动处理并过滤系统命令产生的控制字符，确保输出整洁。

---

## 🛠 技术栈

| 模块 | 技术方案 |
| :--- | :--- |
| **核心框架** | [Tauri v2](https://v2.tauri.app/) (Rust) |
| **前端 UI** | [React 18](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/) |
| **类型安全** | [TypeScript](https://www.typescriptlang.org/) |
| **构建工具** | [Vite](https://vitejs.dev/) |
| **通信机制** | Tauri IPC (Inter-Process Communication) |

---

## 🚀 迭代路线图 (Roadmap)

### 🟢 第一阶段：基础体验完善 (短期)
- [ ] **命令历史回溯**：支持使用键盘 `↑` `↓` 方向键浏览并快速填充历史命令。
- [ ] **基础自动补全**：实现针对当前目录下文件名和文件夹名的 `Tab` 键补全。
- [ ] **多会话管理**：引入 Tab 页签系统，支持同时开启多个终端会话。

### 🟡 第二阶段：个性化与深度定制 (中期)
- [ ] **配置文件系统**：支持通过 `.quicktermrc` 自定义用户别名、环境变量和配色方案。
- [ ] **主题引擎**：内置多种经典配色主题（Monokai, Solarized, Nord 等）。
- [ ] **字体自定义**：支持用户选择系统安装的等宽字体。

### 🔴 第三阶段：高级功能与生态 (长期)
- [ ] **轻量级插件系统**：支持通过 JavaScript/Rust 编写简单的扩展插件。
- [ ] **远程会话 (SSH)**：内置基础的 SSH 连接管理功能。
- [ ] **性能调优**：针对万级行数的大规模日志输出进行渲染性能优化。

---

## � 开发者指南

### 准备工作
确保你的机器上已安装：
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)

### 启动开发模式
```bash
# 安装依赖
npm install

# 启动开发服务器（支持 HMR）
npm run tauri dev
```

### 构建正式版本
```bash
npm run tauri build
```

---

## 📜 许可证

本项目采用 [MIT License](LICENSE) 开源。

---
**QuickTerm - 重新定义极简主义命令行工具。** ✨
