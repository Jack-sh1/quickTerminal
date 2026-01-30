# 实现透明背景和毛玻璃效果

## 目标效果

背景半透明，可以看到后面的桌面/窗口，带有毛玻璃模糊效果。

## 实现方案

### 方案 1：Tauri 原生透明窗口（推荐）

#### 1. 修改 `src-tauri/tauri.conf.json`

```json
{
  "tauri": {
    "windows": [
      {
        "title": "my-terminal",
        "width": 1200,
        "height": 300,
        "resizable": true,
        "transparent": true,
        "decorations": true,
        "theme": "dark",
        "backgroundColor": "transparent"
      }
    ]
  }
}
```

关键设置：
- `"transparent": true` - 启用透明窗口
- `"backgroundColor": "transparent"` - 背景透明

#### 2. 修改 `src/App.tsx`

```tsx
export default function App() {
  return (
    // ✅ 使用 backdrop-blur 和半透明背景
    <div className="h-screen bg-gray-900/80 backdrop-blur-xl text-gray-100 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
      >
        {/* 输出内容 */}
      </div>

      {/* ✅ 底部也要半透明 */}
      <div className="border-t border-gray-700/50 p-4 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-green-400">{getDisplayPath(currentDir)}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none text-gray-100"
            placeholder=""
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}
```

关键类名：
- `bg-gray-900/80` - 深色背景 80% 不透明度
- `backdrop-blur-xl` - 毛玻璃模糊效果
- `border-gray-700/50` - 半透明边框
- `bg-gray-800/50` - 半透明底部背景

#### 3. 修改 `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body, html, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
  /* ✅ 透明背景 */
  background: transparent !important;
}
```

### 方案 2：不同透明度级别

#### 超透明（90% 透明）

```tsx
<div className="h-screen bg-gray-900/10 backdrop-blur-md text-gray-100">
```

#### 半透明（50% 透明）

```tsx
<div className="h-screen bg-gray-900/50 backdrop-blur-lg text-gray-100">
```

#### 轻微透明（20% 透明）

```tsx
<div className="h-screen bg-gray-900/80 backdrop-blur-xl text-gray-100">
```

### 方案 3：深蓝色透明（类似你的截图）

```tsx
<div className="h-screen bg-[#1e2a3a]/85 backdrop-blur-xl text-gray-100">
```

## 完整配置

### `src-tauri/tauri.conf.json`

```json
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "my-terminal",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "execute": true
      }
    },
    "bundle": {
      "active": true,
      "identifier": "com.myterminal.app",
      "targets": "all"
    },
    "windows": [
      {
        "title": "my-terminal",
        "width": 1200,
        "height": 300,
        "minWidth": 800,
        "minHeight": 200,
        "resizable": true,
        "fullscreen": false,
        "transparent": true,
        "decorations": true,
        "alwaysOnTop": false,
        "theme": "dark"
      }
    ]
  }
}
```

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body, html, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent !important;
}

/* ✅ 优化透明窗口的文字渲染 */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### `src/App.tsx` 完整版

```tsx
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface OutputLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [previousDir, setPreviousDir] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);

  // ... 其他函数保持不变 ...

  return (
    // ✅ 透明毛玻璃效果
    <div className="h-screen bg-[#1e2a3a]/85 backdrop-blur-xl text-gray-100 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
      >
        {output.map((line, i) => (
          <div key={i}>
            {line.type === 'input' && (
              <div className="flex items-start gap-2">
                <span className="text-green-400">{getDisplayPath(currentDir)}</span>
                <span className="text-green-400">{line.text}</span>
              </div>
            )}
            {line.type === 'output' && (
              <div className="text-gray-100 whitespace-pre-wrap">{line.text}</div>
            )}
            {line.type === 'error' && (
              <div className="text-red-400 whitespace-pre-wrap">{line.text}</div>
            )}
          </div>
        ))}
      </div>

      {/* ✅ 半透明底部 */}
      <div className="border-t border-gray-600/40 p-4 bg-gray-800/30">
        <div className="flex items-center gap-2">
          <span className="text-green-400">{getDisplayPath(currentDir)}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-400"
            placeholder=""
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}
```

## 透明度对照表

| Tailwind 类 | 透明度 | 效果 |
|------------|--------|------|
| `bg-gray-900/10` | 90% 透明 | 几乎完全透明 |
| `bg-gray-900/30` | 70% 透明 | 很透明 |
| `bg-gray-900/50` | 50% 透明 | 半透明 |
| `bg-gray-900/70` | 30% 透明 | 轻微透明 |
| `bg-gray-900/85` | 15% 透明 | 微透明（推荐） |
| `bg-gray-900/95` | 5% 透明 | 几乎不透明 |

## 模糊效果对照表

| Tailwind 类 | 效果 |
|------------|------|
| `backdrop-blur-sm` | 轻微模糊 |
| `backdrop-blur-md` | 中等模糊 |
| `backdrop-blur-lg` | 明显模糊 |
| `backdrop-blur-xl` | 强烈模糊（推荐） |
| `backdrop-blur-2xl` | 超强模糊 |

## 调整透明度

### 更透明
```tsx
bg-[#1e2a3a]/60 backdrop-blur-2xl
```

### 更不透明
```tsx
bg-[#1e2a3a]/95 backdrop-blur-lg
```

## 窗口尺寸（120x30）

你提到 120x30，这可能是指字符行列数。在 Tauri 中设置像素尺寸：

```json
{
  "windows": [{
    "width": 1200,   // 宽度 1200 像素
    "height": 300    // 高度 300 像素
  }]
}
```

如果想要更小的窗口：

```json
{
  "windows": [{
    "width": 800,    // 更窄
    "height": 250    // 更矮
  }]
}
```

## 常见问题

### 问题 1：透明不生效

**检查清单：**
1. ✅ `tauri.conf.json` 中 `transparent: true`
2. ✅ `index.css` 中 `background: transparent`
3. ✅ App.tsx 中使用 `/80` 等透明度后缀
4. ✅ 重启应用

### 问题 2：毛玻璃效果不明显

**解决方案：**
```tsx
// 增强模糊效果
backdrop-blur-2xl backdrop-saturate-150
```

### 问题 3：文字看不清

**解决方案：**
```tsx
// 增加背景不透明度
bg-[#1e2a3a]/90
// 或者增加文字阴影
text-shadow-lg
```

添加文字阴影 CSS：

```css
/* index.css */
.text-shadow-lg {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}
```

## macOS 特殊优化

如果在 macOS 上，可以启用原生毛玻璃：

```json
{
  "windows": [{
    "transparent": true,
    "decorations": true,
    "titleBarStyle": "Overlay"
  }]
}
```

## 完整效果

修改后，你的终端会：
- ✅ 背景半透明
- ✅ 毛玻璃模糊效果
- ✅ 可以看到后面的桌面
- ✅ 文字清晰可读
- ✅ 深蓝色调（#1e2a3a）

## 重启应用

```bash
# Ctrl+C 停止
pnpm tauri:dev
```

---

**现在你的终端有漂亮的透明毛玻璃效果了！** ✨

关键是设置：
1. `tauri.conf.json`: `"transparent": true`
2. `App.tsx`: `bg-[#1e2a3a]/85 backdrop-blur-xl`
3. `index.css`: `background: transparent`