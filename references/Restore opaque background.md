# 恢复不透明深蓝色背景

## 目标

回到之前的样式：深蓝色不透明背景，不要透明效果。

## 快速修复

### 1. 修改 `src-tauri/tauri.conf.json`

```json
{
  "tauri": {
    "windows": [
      {
        "title": "my-terminal",
        "width": 1200,
        "height": 600,
        "minWidth": 800,
        "minHeight": 400,
        "resizable": true,
        "fullscreen": false,
        "transparent": false,
        "decorations": true,
        "alwaysOnTop": false,
        "theme": "dark"
      }
    ]
  }
}
```

关键改动：
- `"transparent": false` - 关闭透明
- 删除任何 `backgroundColor` 字段

### 2. 修改 `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body, html, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #1e2a3a !important;  /* 深蓝色不透明 */
}
```

### 3. 修改 `src/App.tsx`

```tsx
export default function App() {
  return (
    // ✅ 不透明背景，去掉 /85 和 backdrop-blur
    <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
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

      {/* ✅ 不透明边框和背景 */}
      <div className="border-t border-gray-600 p-4">
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

关键改动：
- `bg-[#1e2a3a]/85` → `bg-[#1e2a3a]` （去掉透明度）
- 删除 `backdrop-blur-xl`
- `border-gray-600/40` → `border-gray-600` （去掉透明度）
- `bg-gray-800/30` → 删除（不需要额外背景）

## 改动对比

| 配置 | 透明版本 | 不透明版本 |
|------|---------|-----------|
| tauri.conf.json | `transparent: true` | `transparent: false` |
| index.css | `transparent` | `#1e2a3a` |
| App.tsx 背景 | `bg-[#1e2a3a]/85 backdrop-blur-xl` | `bg-[#1e2a3a]` |
| 边框 | `border-gray-600/40` | `border-gray-600` |

## 完整的 tauri.conf.json

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
      "identifier": "com.myterminal.app",
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
        "title": "my-terminal",
        "width": 1200,
        "height": 600,
        "minWidth": 800,
        "minHeight": 400,
        "resizable": true,
        "fullscreen": false,
        "transparent": false,
        "decorations": true,
        "alwaysOnTop": false,
        "theme": "dark"
      }
    ]
  }
}
```

## 完整的 index.css

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
  background-color: #1e2a3a !important;
  color: #f3f4f6 !important;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## 完整的 App.tsx 主容器

```tsx
return (
  <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
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

    <div className="border-t border-gray-600 p-4">
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
```

## 快速检查清单

修改这 3 个文件：

### ✅ 1. src-tauri/tauri.conf.json
```json
"transparent": false  // 关闭透明
```

### ✅ 2. src/index.css
```css
background-color: #1e2a3a !important;  // 深蓝色
```

### ✅ 3. src/App.tsx
```tsx
<div className="h-screen bg-[#1e2a3a] text-gray-100">
                            ^^^^^^^^^^^^^
                            去掉 /85 和 backdrop-blur-xl
```

## 重启应用

```bash
# Ctrl+C 停止
pnpm tauri:dev
```

## 效果

现在应该看到：
- ✅ 深蓝色不透明背景 (#1e2a3a)
- ✅ 绿色提示符
- ✅ 白色文字
- ✅ 没有透明效果
- ✅ 像截图一样的效果

## 颜色方案

```
背景: #1e2a3a (深蓝色)
提示符: green-400 (#4ade80)
文字: gray-100 (#f3f4f6)
错误: red-400 (#f87171)
边框: gray-600 (#4b5563)
```

---

**现在回到深蓝色不透明背景了！** ✅

与你的截图一致：深蓝色背景 + 绿色提示符 + 白色文字。