# 修复浅色背景显示问题

## 问题

终端显示为浅色背景，但文字和输入框也是浅色，导致看不见内容。

## 原因

代码中硬编码了深色主题的颜色：
- 背景：`bg-gray-900`（深色）
- 文字：`text-gray-100`（浅色）
- 但 Tauri 窗口可能使用了系统默认的浅色背景

## 解决方案

### 方法 1：强制深色背景（推荐）

修改 `App.tsx`，确保整个应用使用深色背景：

```tsx
export default function App() {
  // ... 其他代码

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
      {/* ... */}
    </div>
  );
}
```

同时在 `index.css` 中添加：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #111827; /* 强制深色背景 */
}

#root {
  background-color: #111827; /* 强制深色背景 */
  min-height: 100vh;
}
```

### 方法 2：修改 Tauri 窗口配置

在 `src-tauri/tauri.conf.json` 中设置窗口背景色：

```json
{
  "tauri": {
    "windows": [
      {
        "title": "QuickTerm",
        "width": 800,
        "height": 600,
        "resizable": true,
        "fullscreen": false,
        "transparent": false,
        "decorations": true,
        "theme": "dark",
        "backgroundColor": "#111827"
      }
    ]
  }
}
```

关键字段：
- `"theme": "dark"` - 使用深色主题
- `"backgroundColor": "#111827"` - 设置背景色为深灰色

### 方法 3：改用浅色主题

如果你想要浅色主题，修改所有颜色：

```tsx
// App.tsx
export default function App() {
  return (
    <div className="h-screen bg-white text-gray-900 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
      >
        {output.map((line, i) => (
          <div key={i} className={`
            ${line.type === 'input' ? 'text-blue-600' : ''}
            ${line.type === 'error' ? 'text-red-600' : ''}
            ${line.type === 'output' ? 'text-gray-700' : ''}
            whitespace-pre-wrap
          `}>
            {line.text}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-300 p-4 flex items-center gap-2">
        <span className="text-blue-600">{getDisplayPath(currentDir)}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
          placeholder=""
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
```

### 方法 4：自适应系统主题（高级）

检测系统主题并自动适配：

```tsx
import { useState, useEffect } from 'react';

export default function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // 检测系统主题
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    // 监听主题变化
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const theme = isDark ? {
    bg: 'bg-gray-900',
    text: 'text-gray-100',
    prompt: 'text-cyan-400',
    output: 'text-gray-300',
    error: 'text-red-400',
    border: 'border-gray-700',
  } : {
    bg: 'bg-white',
    text: 'text-gray-900',
    prompt: 'text-blue-600',
    output: 'text-gray-700',
    error: 'text-red-600',
    border: 'border-gray-300',
  };

  return (
    <div className={`h-screen ${theme.bg} ${theme.text} flex flex-col font-mono`}>
      {/* 使用 theme.* 变量 */}
    </div>
  );
}
```

## 快速修复（最简单）

### 1. 修改 `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 强制深色背景 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body, html, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #111827 !important;
  color: #f3f4f6 !important;
}
```

### 2. 修改 `src-tauri/tauri.conf.json`

找到 `windows` 部分，添加或修改：

```json
{
  "tauri": {
    "windows": [
      {
        "title": "我的终端",
        "width": 800,
        "height": 600,
        "theme": "dark",
        "backgroundColor": "#111827"
      }
    ]
  }
}
```

### 3. 重新构建

```bash
# 停止当前运行（Ctrl+C）
# 清理
rm -rf src-tauri/target
# 重新运行
pnpm tauri:dev
```

## 完整的深色主题配置

### `src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    @apply bg-gray-900 text-gray-100;
    overflow: hidden;
  }

  #root {
    @apply bg-gray-900;
    min-height: 100vh;
  }
}
```

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
    "productName": "我的终端",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "execute": true,
        "sidecar": false,
        "open": false
      }
    },
    "bundle": {
      "active": true,
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.quickterm.app",
      "targets": "all"
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "title": "我的终端",
        "width": 800,
        "height": 600,
        "minWidth": 600,
        "minHeight": 400,
        "resizable": true,
        "fullscreen": false,
        "transparent": false,
        "decorations": true,
        "alwaysOnTop": false,
        "theme": "dark",
        "backgroundColor": "#111827"
      }
    ]
  }
}
```

## 验证修复

重启后，你应该看到：
- ✅ 深色背景（#111827）
- ✅ 浅色文字（#f3f4f6）
- ✅ 青色提示符
- ✅ 清晰可见的输入框

## 调试

如果还是看不见，按 F12 打开开发者工具，检查：

1. **Elements 标签**：查看实际应用的 CSS
2. **Console 标签**：查看是否有错误
3. **检查背景色**：
   ```javascript
   // 在 Console 中运行
   console.log(window.getComputedStyle(document.body).backgroundColor);
   ```

应该输出：`rgb(17, 24, 39)`（即 #111827）

---

**最快的解决方法：修改 `index.css` 和 `tauri.conf.json`，然后重启应用！** ✅