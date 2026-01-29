# 超简洁路径显示 - 只显示当前目录名

## 目标效果

```
~ ls
Desktop  Documents

Desktop cd my-terminal

my-terminal ls
src  package.json

my-terminal cd src-tauri

src-tauri cargo build
Compiling...

src-tauri 
```

## 修改方案

只需修改 `getDisplayPath` 函数：

```tsx
// ❌ 之前（显示多个部分）
const getDisplayPath = (path: string) => {
  if (!path) return '';
  
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/) ||
                       path.match(/^C:\\Users\\[^\\]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  if (homeDir && path.startsWith(homeDir + '/')) {
    return '~' + path.substring(homeDir.length);
  }
  
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || '/';
};

// ✅ 现在（只显示最后一个目录名）
const getDisplayPath = (path: string) => {
  if (!path) return '';
  
  // 检查是否是主目录
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/) ||
                       path.match(/^C:\\Users\\[^\\]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  // 如果正好是主目录，显示 ~
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  // 否则只显示最后一个目录名
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || '/';
};
```

## 快速修改

找到 `getDisplayPath` 函数，完全替换为：

```tsx
const getDisplayPath = (path: string) => {
  if (!path) return '';
  
  // 检查是否是主目录
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/) ||
                       path.match(/^C:\\Users\\[^\\]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  // 主目录显示 ~
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  // 其他情况只显示最后一个目录名
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || '/';
};
```

## 效果展示

### 之前
```
~/Desktop/Jack/i/loveone/my-terminal/src-tauri cargo build
```

### 现在
```
src-tauri cargo build
```

## 路径显示规则

| 完整路径 | 显示为 |
|---------|--------|
| `/Users/wztao` | `~` |
| `/Users/wztao/Desktop` | `Desktop` |
| `/Users/wztao/Desktop/Jack` | `Jack` |
| `/Users/wztao/Desktop/Jack/i` | `i` |
| `/Users/wztao/Desktop/Jack/i/loveone` | `loveone` |
| `/Users/wztao/Desktop/Jack/i/loveone/my-terminal` | `my-terminal` |
| `/Users/wztao/Desktop/Jack/i/loveone/my-terminal/src-tauri` | `src-tauri` ✅ |

## 完整使用示例

```
Terminal MVP

~ ls
Desktop  Documents  Downloads

~ cd Desktop

Desktop ls
Jack  project1  file.txt

Desktop cd Jack

Jack cd i

i cd loveone

loveone cd my-terminal

my-terminal ls
src  src-tauri  package.json  README.md

my-terminal cd src-tauri

src-tauri ls
src  Cargo.toml  tauri.conf.json

src-tauri cargo build
   Compiling tauri v2.0.0
   Compiling my-terminal v0.1.0
    Finished dev [unoptimized + debuginfo] target(s) in 30.2s

src-tauri 
```

## 优点

1. ✅ **超级简洁** - 只显示当前目录名
2. ✅ **清晰明了** - 一眼就知道在哪个目录
3. ✅ **节省空间** - 不占用太多横向空间
4. ✅ **主目录特殊** - `~` 保持不变

## 如果需要看完整路径

鼠标悬停在路径上（如果有 `title` 属性）：

```tsx
<span 
  className="text-cyan-400"
  title={currentDir}  // ✅ 悬停显示完整路径
>
  {getDisplayPath(currentDir)}
</span>
```

效果：
```
src-tauri                             ← 显示
  ↑ 悬停: /Users/wztao/Desktop/Jack/i/loveone/my-terminal/src-tauri
```

## 对比所有方案

| 方案 | 完整路径显示 | 效果 |
|------|------------|------|
| 方案 1 | `/Users/wztao/.../my-terminal/src-tauri` | `.../my-terminal/src-tauri` |
| 方案 2 | `/Users/wztao/.../loveone/my-terminal/src-tauri` | `i/loveone/my-terminal` |
| 方案 3 | `/Users/wztao/Desktop/Jack/i/loveone/my-terminal/src-tauri` | `src-tauri` ✅ 最简洁 |

## 完整代码（只显示 getDisplayPath 函数）

```tsx
const getDisplayPath = (path: string) => {
  if (!path) return '';
  
  // 检查是否是主目录
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/) ||
                       path.match(/^C:\\Users\\[^\\]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  // 主目录显示 ~
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  // 其他情况只显示最后一个目录名
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || '/';
};
```

## 特殊情况处理

### 根目录
```
/ ls
bin  usr  etc  home
```

### Windows
```
C:\Users\wztao → wztao
C:\Users\wztao\Desktop → Desktop
C:\Program Files → Files
```

Windows 路径会自动识别。

## 其他选项（如果你想要的话）

### 选项 A：主目录下显示相对路径
```tsx
const getDisplayPath = (path: string) => {
  if (!path) return '';
  
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  // ✅ 主目录下显示 ~/path
  if (homeDir && path.startsWith(homeDir + '/')) {
    return '~' + path.substring(homeDir.length);
  }
  
  // 其他只显示目录名
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || '/';
};
```

效果：
```
~ cd Desktop
~/Desktop cd project
~/Desktop/project cd src
~/Desktop/project/src 
```

### 选项 B：总是显示完整路径
```tsx
const getDisplayPath = (path: string) => path || '';
```

效果：
```
/Users/wztao/Desktop/Jack/i/loveone/my-terminal/src-tauri cargo build
```

## 推荐

**使用当前方案**（只显示最后一个目录名）最简洁清晰！

```
src-tauri cargo build
```

---

**现在路径显示超级简洁了！** ✨