# 修改为深蓝色主题

## 目标效果

从第二张图（浅蓝黑背景）改为第一张图（深蓝色背景 + 绿色提示符）。

## 配色对比

### 第一张图（目标）
- 背景：深蓝色 `#1e2a3a` 或 `#1a2332`
- 提示符：绿色 `#4ade80`
- 文字：浅灰白 `#e5e7eb`
- 输入框 placeholder：灰色

### 第二张图（当前）
- 背景：深灰黑 `#111827`
- 提示符：青色 `#22d3ee`
- 文字：灰白 `#f3f4f6`

## 修改方案

### 1. 修改 `src/App.tsx`

```tsx
export default function App() {
  // ... 其他代码

  return (
    // ✅ 修改主容器背景色
    <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
      >
        {output.map((line, i) => (
          <div key={i}>
            {line.type === 'input' && (
              <div className="flex items-start gap-2">
                {/* ✅ 提示符改为绿色 */}
                <span className="text-green-400">{getDisplayPath(currentDir)}</span>
                <span className="text-green-400">{line.text}</span>
              </div>
            )}
            {line.type === 'output' && (
              <div className="text-gray-300 whitespace-pre-wrap">{line.text}</div>
            )}
            {line.type === 'error' && (
              <div className="text-red-400 whitespace-pre-wrap">{line.text}</div>
            )}
          </div>
        ))}
      </div>

      {/* ✅ 底部边框颜色调整 */}
      <div className="border-t border-gray-600 p-4">
        <div className="flex items-center gap-2">
          {/* ✅ 提示符绿色 */}
          <span className="text-green-400">{getDisplayPath(currentDir)}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500"
            placeholder="Type a command..."
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {isLoading && (
            <div className="flex items-center gap-2 text-yellow-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" cy="12" r="10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. 修改 `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body, html, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
  /* ✅ 深蓝色背景 */
  background-color: #1e2a3a !important;
  color: #e5e7eb !important;
}
```

### 3. 修改 `src-tauri/tauri.conf.json`

```json
{
  "tauri": {
    "windows": [
      {
        "title": "my-terminal",
        "width": 800,
        "height": 600,
        "theme": "dark",
        "backgroundColor": "#1e2a3a"
      }
    ]
  }
}
```

## 完整配色方案

### 深蓝主题配色

```tsx
// 可以定义一个主题对象
const deepBlueTheme = {
  bg: 'bg-[#1e2a3a]',           // 深蓝色背景
  text: 'text-gray-100',         // 浅色文字
  prompt: 'text-green-400',      // 绿色提示符
  output: 'text-gray-300',       // 灰白输出
  error: 'text-red-400',         // 红色错误
  border: 'border-gray-600',     // 灰色边框
  placeholder: 'placeholder-gray-500', // 灰色占位符
};
```

## 精确颜色值

根据第一张图，精确的颜色应该是：

```css
/* 背景色 */
background: #1e2a3a;  /* 或 #1a2332 */

/* 提示符 */
color: #4ade80;  /* green-400 */

/* 文字 */
color: #e5e7eb;  /* gray-200 */

/* 边框 */
border-color: #4b5563;  /* gray-600 */
```

## Tailwind 类名对照

```tsx
// 背景
bg-[#1e2a3a]      // 深蓝色

// 提示符和输入命令
text-green-400    // #4ade80 绿色

// 输出文字
text-gray-300     // #d1d5db

// 边框
border-gray-600   // #4b5563
```

## 快速修改清单

### ✅ 需要修改的地方

1. **主容器**：`bg-gray-900` → `bg-[#1e2a3a]`
2. **提示符**：`text-cyan-400` → `text-green-400`
3. **输入命令显示**：`text-cyan-400` → `text-green-400`
4. **边框**：`border-gray-700` → `border-gray-600`
5. **index.css**：`#111827` → `#1e2a3a`
6. **tauri.conf.json**：`#111827` → `#1e2a3a`

## 完整的 App.tsx 关键部分

```tsx
return (
  <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
    <div ref={outputRef} className="flex-1 overflow-y-auto p-4 text-sm">
      {output.map((line, i) => (
        <div key={i}>
          {line.type === 'input' && (
            <div className="flex items-start gap-2">
              <span className="text-green-400">{getDisplayPath(currentDir)}</span>
              <span className="text-green-400">{line.text}</span>
            </div>
          )}
          {line.type === 'output' && (
            <div className="text-gray-300 whitespace-pre-wrap">{line.text}</div>
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
          className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500"
          placeholder="Type a command..."
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

## 对比

| 元素 | 之前 | 现在 |
|------|------|------|
| 背景 | `#111827` (深灰黑) | `#1e2a3a` (深蓝) |
| 提示符 | `cyan-400` (青色) | `green-400` (绿色) |
| 边框 | `gray-700` | `gray-600` |

## 重启应用

修改后需要重启：

```bash
# 停止当前应用（Ctrl+C）
pnpm tauri:dev
```

## 效果预览

修改后应该看到：

```
~ ls                          ← 绿色提示符
Applications                   ← 白色输出
Desktop
Documents
...

~ |                           ← 绿色提示符 + 光标
```

背景为深蓝色 (#1e2a3a)，提示符为绿色 (#4ade80)，与第一张图一致！

---

**修改这 3 个文件，重启应用就能看到深蓝色主题了！** 🎨