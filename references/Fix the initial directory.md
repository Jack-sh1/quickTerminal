# 修复初始目录问题

## 问题

终端启动时在项目目录（src-tauri），而不是用户主目录（~）。

## 原因

`pwd` 命令返回的是当前工作目录（Tauri 应用启动的位置），而不是用户主目录。

## 解决方案

### 方案 1：强制切换到主目录（推荐）

修改初始化逻辑，启动后立即 cd 到主目录。

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      // ✅ 先切换到主目录，再获取路径
      const dir = await invoke<string>('execute_command', { 
        command: 'cd ~ && pwd' 
      });
      const cleanDir = stripAnsi(dir.trim());
      setCurrentDir(cleanDir);
      setPreviousDir(cleanDir);
      recordVisit(cleanDir);
    } catch (e) {
      console.error('Failed to get initial directory:', e);
      setCurrentDir('~');
      setPreviousDir('~');
    }
  };
  initDir();
}, []);
```

### 方案 2：使用环境变量（更可靠）

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      // ✅ 使用 $HOME 环境变量
      const dir = await invoke<string>('execute_command', { 
        command: 'echo $HOME' 
      });
      const cleanDir = stripAnsi(dir.trim());
      setCurrentDir(cleanDir);
      setPreviousDir(cleanDir);
      recordVisit(cleanDir);
    } catch (e) {
      console.error('Failed to get initial directory:', e);
      
      // ✅ 备用方案：再试一次 cd ~
      try {
        const fallback = await invoke<string>('execute_command', { 
          command: 'cd && pwd' 
        });
        const cleanFallback = stripAnsi(fallback.trim());
        setCurrentDir(cleanFallback);
        setPreviousDir(cleanFallback);
        recordVisit(cleanFallback);
      } catch (e2) {
        setCurrentDir('~');
        setPreviousDir('~');
      }
    }
  };
  initDir();
}, []);
```

### 方案 3：跨平台兼容（最完整）

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      let homeDir: string;
      
      // ✅ 根据操作系统选择命令
      if (navigator.platform.toLowerCase().includes('win')) {
        // Windows
        const result = await invoke<string>('execute_command', { 
          command: 'echo %USERPROFILE%' 
        });
        homeDir = stripAnsi(result.trim());
      } else {
        // macOS / Linux
        const result = await invoke<string>('execute_command', { 
          command: 'echo $HOME' 
        });
        homeDir = stripAnsi(result.trim());
      }
      
      setCurrentDir(homeDir);
      setPreviousDir(homeDir);
      recordVisit(homeDir);
    } catch (e) {
      console.error('Failed to get home directory:', e);
      
      // 备用方案
      try {
        const fallback = await invoke<string>('execute_command', { 
          command: 'cd ~ && pwd' 
        });
        const cleanFallback = stripAnsi(fallback.trim());
        setCurrentDir(cleanFallback);
        setPreviousDir(cleanFallback);
        recordVisit(cleanFallback);
      } catch (e2) {
        setCurrentDir('~');
        setPreviousDir('~');
      }
    }
  };
  initDir();
}, []);
```

## 推荐代码（方案 1 - 最简单）

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      // ✅ 使用 cd ~ && pwd 确保在主目录
      const dir = await invoke<string>('execute_command', { 
        command: 'cd ~ && pwd' 
      });
      const cleanDir = stripAnsi(dir.trim());
      setCurrentDir(cleanDir);
      setPreviousDir(cleanDir);
      recordVisit(cleanDir);
    } catch (e) {
      console.error('Failed to get initial directory:', e);
      setCurrentDir('~');
      setPreviousDir('~');
    }
  };
  initDir();
}, []);
```

## 对比

| 方法 | 命令 | 优点 | 缺点 |
|------|------|------|------|
| **原来** | `pwd` | 简单 | 返回当前工作目录 |
| **方案1** | `cd ~ && pwd` | 简单可靠 | - |
| **方案2** | `echo $HOME` | 直接获取 | 不切换目录 |
| **方案3** | 跨平台 | 完整支持 | 代码较多 |

## 完整修复代码

找到 `useEffect` 中的初始化部分：

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      // ❌ 修改前
      // const dir = await invoke<string>('execute_command', { 
      //   command: 'pwd' 
      // });
      
      // ✅ 修改后
      const dir = await invoke<string>('execute_command', { 
        command: 'cd ~ && pwd' 
      });
      
      const cleanDir = stripAnsi(dir.trim());
      setCurrentDir(cleanDir);
      setPreviousDir(cleanDir);
      recordVisit(cleanDir);
    } catch (e) {
      console.error('Failed to get initial directory:', e);
      setCurrentDir('~');
      setPreviousDir('~');
    }
  };
  initDir();
}, []);
```

## 验证修复

重启终端后，应该看到：

```
🏠 ~ 
```

而不是：

```
📁 src-tauri 
```

可以运行 `pwd` 验证：

```bash
🏠 ~ pwd
/Users/wztao

🏠 ~ 
```

## Windows 兼容性

如果在 Windows 上，可能需要：

```tsx
// Windows
command: 'cd %USERPROFILE% && cd'

// 或使用 PowerShell
command: 'cd ~ ; pwd'
```

但通常 `cd ~ && pwd` 在 Git Bash / WSL 中也能工作。

## 调试

如果还是不对，可以添加日志：

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      console.log('Getting home directory...');
      
      const dir = await invoke<string>('execute_command', { 
        command: 'cd ~ && pwd' 
      });
      
      console.log('Raw result:', dir);
      
      const cleanDir = stripAnsi(dir.trim());
      
      console.log('Clean dir:', cleanDir);
      
      setCurrentDir(cleanDir);
      setPreviousDir(cleanDir);
      recordVisit(cleanDir);
    } catch (e) {
      console.error('Failed to get initial directory:', e);
      setCurrentDir('~');
      setPreviousDir('~');
    }
  };
  initDir();
}, []);
```

然后按 F12 查看控制台输出。

## 其他初始目录选项

### 1. 从桌面开始

```tsx
command: 'cd ~/Desktop && pwd'
```

### 2. 从文档开始

```tsx
command: 'cd ~/Documents && pwd'
```

### 3. 从特定项目开始

```tsx
command: 'cd ~/projects && pwd'
```

### 4. 记住上次的目录

```tsx
useEffect(() => {
  const initDir = async () => {
    try {
      // 尝试从 localStorage 加载上次的目录
      const lastDir = localStorage.getItem('lastDirectory');
      
      if (lastDir) {
        // 验证目录是否仍然存在
        const result = await invoke<string>('execute_command', { 
          command: `cd "${lastDir}" && pwd` 
        });
        const cleanDir = stripAnsi(result.trim());
        setCurrentDir(cleanDir);
        setPreviousDir(cleanDir);
        recordVisit(cleanDir);
      } else {
        // 默认到主目录
        const dir = await invoke<string>('execute_command', { 
          command: 'cd ~ && pwd' 
        });
        const cleanDir = stripAnsi(dir.trim());
        setCurrentDir(cleanDir);
        setPreviousDir(cleanDir);
        recordVisit(cleanDir);
      }
    } catch (e) {
      // 备用：主目录
      const dir = await invoke<string>('execute_command', { 
        command: 'cd ~ && pwd' 
      });
      const cleanDir = stripAnsi(dir.trim());
      setCurrentDir(cleanDir);
      setPreviousDir(cleanDir);
      recordVisit(cleanDir);
    }
  };
  initDir();
}, []);

// 在关闭前保存当前目录
useEffect(() => {
  return () => {
    if (currentDir) {
      localStorage.setItem('lastDirectory', currentDir);
    }
  };
}, [currentDir]);
```

## 快速修复（复制粘贴）

只需要改一行：

```tsx
// 找到这行（约在第 120 行）
command: 'pwd'

// 改为
command: 'cd ~ && pwd'
```

保存，重启终端，完成！

---

**现在终端启动时会在主目录了！** 🏠