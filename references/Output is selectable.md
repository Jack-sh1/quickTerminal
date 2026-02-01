# 实现输出可选择功能

## 功能说明

让终端输出的文本可以：
- 鼠标选择
- 复制到剪贴板
- 双击选择单词
- 三击选择整行

## 实现方法

### 方法 1：添加 Tailwind 类（最简单）⭐

只需在输出容器添加 `select-text` 类。

#### 修改 `App.tsx`

```tsx
return (
  <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
    {/* ✅ 添加 select-text 类 */}
    <div 
      ref={outputRef}
      className="flex-1 overflow-y-auto p-4 text-sm select-text"
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

    {/* 输入区域不需要可选择 */}
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

### 方法 2：CSS 自定义（更灵活）

如果需要自定义选择样式，在 `index.css` 中添加：

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body, html, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #1e2a3a !important;
  color: #f3f4f6 !important;
}

/* ✅ 自定义文本选择样式 */
.select-text::selection {
  background-color: rgba(59, 130, 246, 0.5); /* 蓝色半透明 */
  color: #ffffff;
}

.select-text::-moz-selection {
  background-color: rgba(59, 130, 246, 0.5);
  color: #ffffff;
}
```

### 方法 3：添加复制快捷键（可选增强）

让用户可以用 Cmd/Ctrl+C 复制选中文本。

```tsx
// 在输出容器添加复制处理
<div 
  ref={outputRef}
  className="flex-1 overflow-y-auto p-4 text-sm select-text"
  onCopy={(e) => {
    // 可选：添加复制成功提示
    console.log('Text copied!');
  }}
>
```

### 方法 4：禁止提示符被选择（可选）

如果不想让绿色提示符被选中，可以添加：

```tsx
{line.type === 'input' && (
  <div className="flex items-start gap-2">
    {/* ✅ 提示符不可选 */}
    <span className="text-green-400 select-none">
      {getDisplayPath(currentDir)}
    </span>
    {/* ✅ 命令可选 */}
    <span className="text-green-400 select-text">
      {line.text}
    </span>
  </div>
)}
```

## 完整代码（推荐配置）

```tsx
return (
  <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
    {/* ✅ 输出区域：可选择 */}
    <div 
      ref={outputRef}
      className="flex-1 overflow-y-auto p-4 text-sm select-text"
    >
      {output.map((line, i) => (
        <div key={i}>
          {line.type === 'input' && (
            <div className="flex items-start gap-2">
              {/* 提示符不可选 */}
              <span className="text-green-400 select-none">
                {getDisplayPath(currentDir)}
              </span>
              {/* 命令可选 */}
              <span className="text-green-400">
                {line.text}
              </span>
            </div>
          )}
          {line.type === 'output' && (
            <div className="text-gray-100 whitespace-pre-wrap">
              {line.text}
            </div>
          )}
          {line.type === 'error' && (
            <div className="text-red-400 whitespace-pre-wrap">
              {line.text}
            </div>
          )}
        </div>
      ))}
    </div>

    {/* 输入区域：不可选择（避免干扰） */}
    <div className="border-t border-gray-600 p-4 select-none">
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

## Tailwind 选择类说明

| 类名 | 效果 |
|------|------|
| `select-none` | 不可选择 |
| `select-text` | 可选择文本 |
| `select-all` | 点击选择全部 |
| `select-auto` | 默认行为 |

## 自定义选择颜色

### 蓝色选择（默认）

```css
.select-text::selection {
  background-color: rgba(59, 130, 246, 0.5);
  color: #ffffff;
}
```

### 绿色选择（匹配提示符）

```css
.select-text::selection {
  background-color: rgba(74, 222, 128, 0.3);
  color: #ffffff;
}
```

### 青色选择

```css
.select-text::selection {
  background-color: rgba(34, 211, 238, 0.4);
  color: #ffffff;
}
```

### 完全透明（系统默认）

```css
.select-text::selection {
  background-color: inherit;
  color: inherit;
}
```

## 使用效果

### 选择单行

```
~ ls
Applications  ← 可以选中
Desktop       ← 可以选中
Documents     ← 可以选中
```

### 选择多行

```
~ cat file.txt
line 1        ← 可以从这里
line 2        ← 一直选到
line 3        ← 这里
```

### 双击选择单词

双击 "Applications" → 只选中这个单词

### 三击选择整行

三击任意位置 → 选中整行

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 全选 | Cmd/Ctrl+A |
| 复制 | Cmd/Ctrl+C |
| 取消选择 | 点击任意位置 |

## 优化：避免误选

如果不想让提示符和输入框被选中：

```tsx
// 输出区域
<div className="select-text">  {/* 可选 */}

// 提示符
<span className="select-none">  {/* 不可选 */}

// 输入框区域
<div className="select-none">  {/* 不可选 */}
```

## 测试

1. **选择文本**：
   ```bash
   ~ echo hello world
   hello world  ← 用鼠标拖动选择
   ```

2. **复制**：
   - 选中文本
   - Cmd/Ctrl+C 复制
   - 粘贴到其他应用验证

3. **双击选择单词**：
   ```bash
   ~ echo one two three
   one two three  ← 双击 "two"，只选中 "two"
   ```

## 完整改动总结

只需改一行：

```tsx
// ❌ 修改前
<div 
  ref={outputRef}
  className="flex-1 overflow-y-auto p-4 text-sm"
>

// ✅ 修改后
<div 
  ref={outputRef}
  className="flex-1 overflow-y-auto p-4 text-sm select-text"
>
```

## 可选增强

### 1. 添加"复制成功"提示

```tsx
const [showCopyNotice, setShowCopyNotice] = useState(false);

<div 
  className="flex-1 overflow-y-auto p-4 text-sm select-text"
  onCopy={() => {
    setShowCopyNotice(true);
    setTimeout(() => setShowCopyNotice(false), 1000);
  }}
>
  {/* 输出内容 */}
  
  {showCopyNotice && (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow">
      ✓ Copied!
    </div>
  )}
</div>
```

### 2. 右键复制菜单

浏览器原生支持，不需要额外代码。

### 3. 选择计数

```tsx
const [selectedText, setSelectedText] = useState('');

<div 
  className="select-text"
  onMouseUp={() => {
    const selection = window.getSelection();
    setSelectedText(selection?.toString() || '');
  }}
>
```

---

**现在输出文本可以选择和复制了！** ✨

只需添加 `select-text` 类即可。