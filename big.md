# 禁用输入框自动大写

## 问题

输入 `cd` 时自动变成 `Cd`，这是因为浏览器/系统的自动首字母大写功能。

## 解决方案

在 `<input>` 标签添加几个属性来禁用自动大写和自动更正：

```tsx
<input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={isLoading}
  className="flex-1 bg-transparent outline-none text-gray-100"
  placeholder=""
  autoFocus
  // ✅ 添加这些属性
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="off"
  spellCheck="false"
/>
```

## 完整的 input 标签

```tsx
<input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={isLoading}
  className="flex-1 bg-transparent outline-none text-gray-100"
  placeholder=""
  autoFocus
  autoComplete="off"      // 禁用自动完成
  autoCorrect="off"       // 禁用自动更正
  autoCapitalize="off"    // 禁用自动大写
  spellCheck="false"      // 禁用拼写检查
/>
```

## 各属性说明

| 属性 | 作用 | 效果 |
|------|------|------|
| `autoComplete="off"` | 禁用浏览器自动完成 | 不会弹出历史记录 |
| `autoCorrect="off"` | 禁用自动更正 | `cd` 不会被改成其他词 |
| `autoCapitalize="off"` | 禁用首字母自动大写 | `cd` 不会变成 `Cd` ✅ |
| `spellCheck="false"` | 禁用拼写检查 | 命令下面不会有红线 |

## 快速修改

找到你代码中的 `<input>` 标签（在底部输入区域），添加这 4 个属性：

```tsx
// 原来
<input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={isLoading}
  className="flex-1 bg-transparent outline-none text-gray-100"
  placeholder=""
  autoFocus
/>

// 修改为
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
```

## 完整的底部输入区域代码

```tsx
<div className="border-t border-gray-700 p-4">
  <div className="flex items-center gap-2">
    <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
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
    {isLoading && (
      <span className="text-gray-500 text-sm">...</span>
    )}
  </div>
</div>
```

## 测试

保存后，尝试输入：

```
cd       ✅ 不会变成 Cd
ls       ✅ 不会变成 Ls
pwd      ✅ 不会变成 Pwd
mkdir    ✅ 不会变成 Mkdir
```

## 额外优化：禁用浏览器默认行为

如果还有问题，可以在 CSS 中添加：

```css
/* 在你的 CSS 文件或 Tailwind 配置中 */
input {
  text-transform: none;
}
```

或者直接在 className 中添加：

```tsx
className="flex-1 bg-transparent outline-none text-gray-100 lowercase"
```

**注意**：`lowercase` 会强制所有输入为小写，这可能不是你想要的（比如创建文件名时）。

## 推荐方案

使用第一个方案（添加 4 个属性）就足够了，不需要 CSS 强制小写。

```tsx
autoComplete="off"
autoCorrect="off"
autoCapitalize="off"
spellCheck="false"
```

这样既禁用了自动大写，又保留了输入大写的能力（需要时）。

## macOS 特殊情况

如果是 macOS 用户且使用了系统级的文本替换功能，可能需要在系统设置中禁用：

1. 打开"系统设置"
2. 进入"键盘"
3. 找到"文本输入"
4. 取消勾选"自动大写字词的首字母"

但通常添加这 4 个属性就够了！

---

**现在输入 `cd` 不会变成 `Cd` 了！** ✅