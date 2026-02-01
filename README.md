# 🚀 QuickTerm - Minimalist Tauri Cross-Platform Terminal (Open Source)

QuickTerm is a lightweight terminal emulator built with **Tauri v2** + **React** + **TypeScript**. Designed for developers who pursue extreme simplicity and responsiveness, it strips away the redundancy of traditional terminals while retaining the core command-line experience with a modern UI.

This project is now officially open-sourced. Contributions and optimizations from the community are more than welcome! ✨

---

## ✨ Key Features

### 1. 📂 Smart Navigation
- **Smart Path Detection**: Jump to a directory by simply typing its name—no `cd` required.
- **Deeply Optimized `cd`**:
  - **Tilde Expansion**: Supports `cd ~` and subpaths, automatically resolving to the system home directory.
  - **Fast Backtrack (Old PWD)**: Supports `cd -` to switch seamlessly between the last two working directories.
- **Path Aliases**: Built-in shortcuts like `..` (back 1 level), `...` (back 2 levels), `....` (back 3 levels).

### 2. ⚡ Power Aliases
Pre-configured aliases to boost your productivity:
- **File Management**: `ll`, `la`, `l`, `ls` (with auto-color).
- **Git Efficiency**: `gs` (status), `ga` (add), `gc` (commit), `gp` (push), `gl` (log).
- **System Tools**: `c`/`cls` (clear screen), `md` (mkdir), `rd` (rmdir).

### 3. 🎨 Modern UI
- **Oh My Zsh Style**: Classic Cyan, Green, and Purple color scheme for better readability.
- **Directory Icons**: Automatically displays relevant Emoji icons based on the current directory (e.g., 🖥️ for Desktop, 📂 for src).
- **Real-time Git Status**: Detects Git repositories and displays the current branch name (e.g., `(main)`).
- **Compact Path Mode**: Shows only the current directory name to avoid long path clutter.

### 4. ⌨️ Seamless Interaction
- **Command History**: Navigate through previous commands using `↑` `↓` arrow keys with `localStorage` persistence.
- **Selectable Output**: Terminal output supports mouse selection, double-click for words, and triple-click for lines, with easy copy-paste.
- **Cross-Platform**: Powered by Rust, supporting native shells on macOS, Linux, and Windows.
- **Auto-Focus & Clear**: Quick clear with `Ctrl + L` and automatic input focus on window activation.

---

## 🛠 Tech Stack

| Module | Solution |
| :--- | :--- |
| **Core Framework** | [Tauri v2](https://v2.tauri.app/) (Rust) |
| **Frontend UI** | [React 18](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/) |
| **Type Safety** | [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Persistence** | LocalStorage |

---

## 🚀 Roadmap

### 🟢 Phase 1: Core Experience (Completed)
- [x] **Command History**: Use `↑` `↓` to navigate through history.
- [x] **Selectable Output**: Support for text selection and copying.
- [x] **Smart Path Jump**: Jump to folders without typing `cd`.
- [x] **Launch Path Optimization**: Default startup in user home directory `~`.

### 🟡 Phase 2: Customization (In Progress)
- [ ] **Basic Autocomplete**: Tab completion for file and folder names.
- [ ] **Theme Engine**: Support for custom colors, transparency, and mica/blur effects.
- [ ] **Multi-Session Management**: Tab system for multiple terminal sessions.

### 🔴 Phase 3: Advanced Features (Long-term)
- [ ] **Config System**: Customize aliases and env variables via `.quicktermrc`.
- [ ] **Remote Sessions (SSH)**: Built-in basic SSH connection management.

---

## 📦 Developer Guide

### Prerequisites
Ensure you have the following installed:
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)

### Development
```bash
# Install dependencies
npm install

# Start dev server with HMR
npm run tauri dev
```

### Build
```bash
npm run tauri build
```

---

## Screenshot
<img width="1112" height="812" alt="QuickTerm UI" src="https://github.com/user-attachments/assets/18e7481a-9862-4b62-b127-6f1567d2c5e6" />

---

## 📜 License
This project is licensed under the [MIT License](./LICENSE).

---
**QuickTerm - Redefining minimalism for the command line.** ✨
