# 智能路径导航 - 直接输入目录名跳转

## 目标效果

```
~ Desktop
Desktop ls
file1 file2

Desktop my-project
my-project pwd
/Users/wztao/Desktop/my-project

my-project 
```

不需要输入 `cd Desktop`，直接输入 `Desktop` 就能跳转。

## 实现方案

在执行命令前，检查输入是否是一个存在的目录。

### 完整实现代码

```tsx
const executeCommand = async (cmd: string) => {
  if (!cmd.trim()) return;

  let trimmedCmd = cmd.trim();

  const shortcuts: { [key: string]: string } = {
    '..': 'cd ..',
    '...': 'cd ../..',
    '....': 'cd ../../..',
    '~': 'cd ~',
    '-': 'cd -',
  };

  const isShortcut = !!shortcuts[trimmedCmd];
  
  if (shortcuts[trimmedCmd]) {
    trimmedCmd = shortcuts[trimmedCmd];
  }

  if (trimmedCmd.toLowerCase() === 'clear' || trimmedCmd.toLowerCase() === 'cls') {
    setOutput([]);
    setInput('');
    return;
  }

  if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
    if (!isShortcut) {
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
    }
    
    setInput('');
    
    const targetDir = trimmedCmd.substring(3).trim();
    await changeDirectory(targetDir);
    
    return;
  }

  // ✅ 智能路径检测 - 检查是否是目录
  // 如果输入不包含空格、特殊字符，可能是目录名
  const couldBeDirectory = !trimmedCmd.includes(' ') && 
                           !trimmedCmd.includes('|') && 
                           !trimmedCmd.includes('>') &&
                           !trimmedCmd.includes('<') &&
                           !trimmedCmd.includes('&') &&
                           !trimmedCmd.includes(';');

  if (couldBeDirectory) {
    try {
      // 尝试检查是否是目录
      const checkCmd = currentDir 
        ? `cd "${currentDir}" && [ -d "${trimmedCmd}" ] && echo "DIR_EXISTS" || echo "NOT_DIR"`
        : `[ -d "${trimmedCmd}" ] && echo "DIR_EXISTS" || echo "NOT_DIR"`;
      
      const result = await invoke<string>('execute_command', { 
        command: checkCmd 
      });
      
      const cleanResult = stripAnsi(result.trim());
      
      // ✅ 如果是目录，自动跳转
      if (cleanResult === 'DIR_EXISTS') {
        setInput('');
        await changeDirectory(trimmedCmd);
        return;
      }
    } catch (e) {
      // 检查失败，继续作为普通命令执行
    }
  }

  // 普通命令执行
  setOutput(prev => [...prev, { type: 'input', text: cmd }]);
  setInput('');
  setIsLoading(true);

  try {
    const fullCmd = currentDir 
      ? `cd "${currentDir}" && ${trimmedCmd}` 
      : trimmedCmd;
    
    const result = await invoke<string>('execute_command', { 
      command: fullCmd 
    });
    
    const cleanResult = stripAnsi(result || '');
    if (cleanResult) {
      setOutput(prev => [...prev, { type: 'output', text: cleanResult }]);
    }
    setOutput(prev => [...prev, { type: 'output', text: '' }]);
  } catch (error) {
    setOutput(prev => [...prev, { type: 'error', text: String(error) }]);
    setOutput(prev => [...prev, { type: 'output', text: '' }]);
  } finally {
    setIsLoading(false);
  }
};
```

## 方案 2：更激进的版本（先尝试跳转）

直接尝试跳转，失败了再执行命令：

```tsx
const executeCommand = async (cmd: string) => {
  if (!cmd.trim()) return;

  let trimmedCmd = cmd.trim();

  const shortcuts: { [key: string]: string } = {
    '..': 'cd ..',
    '...': 'cd ../..',
    '....': 'cd ../../..',
    '~': 'cd ~',
    '-': 'cd -',
  };

  const isShortcut = !!shortcuts[trimmedCmd];
  
  if (shortcuts[trimmedCmd]) {
    trimmedCmd = shortcuts[trimmedCmd];
  }

  if (trimmedCmd.toLowerCase() === 'clear' || trimmedCmd.toLowerCase() === 'cls') {
    setOutput([]);
    setInput('');
    return;
  }

  if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
    if (!isShortcut) {
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
    }
    
    setInput('');
    
    const targetDir = trimmedCmd.substring(3).trim();
    await changeDirectory(targetDir);
    
    return;
  }

  // ✅ 方案 2：先尝试作为目录跳转
  const couldBeDirectory = !trimmedCmd.includes(' ') && 
                           !trimmedCmd.includes('|') && 
                           !trimmedCmd.includes('>') &&
                           !trimmedCmd.includes('<') &&
                           !trimmedCmd.includes('&') &&
                           !trimmedCmd.includes(';') &&
                           !trimmedCmd.startsWith('-');  // 排除命令选项

  if (couldBeDirectory) {
    // 尝试跳转
    const originalDir = currentDir;
    
    try {
      setInput('');
      await changeDirectory(trimmedCmd);
      
      // 成功跳转，直接返回
      return;
    } catch (e) {
      // 跳转失败，继续作为普通命令执行
      // 恢复目录
      setCurrentDir(originalDir);
    }
  }

  // 普通命令执行
  setOutput(prev => [...prev, { type: 'input', text: cmd }]);
  setInput('');
  setIsLoading(true);

  try {
    const fullCmd = currentDir 
      ? `cd "${currentDir}" && ${trimmedCmd}` 
      : trimmedCmd;
    
    const result = await invoke<string>('execute_command', { 
      command: fullCmd 
    });
    
    const cleanResult = stripAnsi(result || '');
    if (cleanResult) {
      setOutput(prev => [...prev, { type: 'output', text: cleanResult }]);
    }
    setOutput(prev => [...prev, { type: 'output', text: '' }]);
  } catch (error) {
    setOutput(prev => [...prev, { type: 'error', text: String(error) }]);
    setOutput(prev => [...prev, { type: 'output', text: '' }]);
  } finally {
    setIsLoading(false);
  }
};
```

## 方案 3：简化版（推荐）

只检测常见的目录输入模式，避免误判：

```tsx
const executeCommand = async (cmd: string) => {
  if (!cmd.trim()) return;

  let trimmedCmd = cmd.trim();

  const shortcuts: { [key: string]: string } = {
    '..': 'cd ..',
    '...': 'cd ../..',
    '....': 'cd ../../..',
    '~': 'cd ~',
    '-': 'cd -',
  };

  const isShortcut = !!shortcuts[trimmedCmd];
  
  if (shortcuts[trimmedCmd]) {
    trimmedCmd = shortcuts[trimmedCmd];
  }

  if (trimmedCmd.toLowerCase() === 'clear' || trimmedCmd.toLowerCase() === 'cls') {
    setOutput([]);
    setInput('');
    return;
  }

  if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
    if (!isShortcut) {
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
    }
    
    setInput('');
    
    const targetDir = trimmedCmd.substring(3).trim();
    await changeDirectory(targetDir);
    
    return;
  }

  // ✅ 智能路径检测（简化版）
  // 只检测简单的目录名（字母、数字、-、_、.）
  const isDirPattern = /^[a-zA-Z0-9_.-]+$/.test(trimmedCmd);
  
  if (isDirPattern) {
    try {
      // 尝试作为目录跳转
      const testCmd = currentDir 
        ? `cd "${currentDir}" && cd "${trimmedCmd}" && pwd`
        : `cd "${trimmedCmd}" && pwd`;
      
      const result = await invoke<string>('execute_command', { 
        command: testCmd 
      });
      
      // 成功！是一个目录
      const newDir = stripAnsi(result.trim());
      setPreviousDir(currentDir);
      setCurrentDir(newDir);
      setInput('');
      return;
    } catch (e) {
      // 不是目录或跳转失败，继续作为普通命令执行
    }
  }

  // 普通命令执行
  setOutput(prev => [...prev, { type: 'input', text: cmd }]);
  setInput('');
  setIsLoading(true);

  try {
    const fullCmd = currentDir 
      ? `cd "${currentDir}" && ${trimmedCmd}` 
      : trimmedCmd;
    
    const result = await invoke<string>('execute_command', { 
      command: fullCmd 
    });
    
    const cleanResult = stripAnsi(result || '');
    if (cleanResult) {
      setOutput(prev => [...prev, { type: 'output', text: cleanResult }]);
    }
    setOutput(prev => [...prev, { type: 'output', text: '' }]);
  } catch (error) {
    setOutput(prev => [...prev, { type: 'error', text: String(error) }]);
    setOutput(prev => [...prev, { type: 'output', text: '' }]);
  } finally {
    setIsLoading(false);
  }
};
```

## 使用示例

### 方案 3（推荐）

```
~ Desktop
Desktop Documents
Documents project-2024
project-2024 src
src ls
main.rs  lib.rs

src 
```

### 支持的输入

✅ **会自动跳转的**：
- `Desktop`
- `Documents`
- `my-project`
- `src-tauri`
- `node_modules`
- `.vscode`
- `..` (已有快捷方式)

❌ **不会误判的**：
- `ls -la`（有空格和选项）
- `echo hello`（有空格）
- `git status`（有空格）
- `npm install`（有空格）

## 对比三个方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| 方案 1 | 最安全，先检查是否存在 | 稍慢（多一次检查） |
| 方案 2 | 最激进，直接尝试 | 可能显示错误信息 |
| 方案 3 | 平衡，使用正则匹配 | 推荐 ✅ |

## 测试效果

```
~ ls
Desktop  Documents  Downloads

~ Desktop
Desktop ls
project1  file.txt

Desktop project1
project1 ls
src  package.json

project1 src
src pwd
/Users/wztao/Desktop/project1/src

src 
```

## 额外优化：大小写不敏感（可选）

如果想支持大小写不敏感：

```tsx
// 在尝试跳转前
const lowerInput = trimmedCmd.toLowerCase();

// 先列出当前目录的内容
const lsResult = await invoke<string>('execute_command', { 
  command: `cd "${currentDir}" && ls` 
});

const dirs = lsResult.split('\n').filter(d => d.trim());

// 查找匹配的目录（不区分大小写）
const matchedDir = dirs.find(d => d.toLowerCase() === lowerInput);

if (matchedDir) {
  await changeDirectory(matchedDir);
  return;
}
```

效果：
```
~ desktop      (小写)
Desktop        (跳转到 Desktop)
```

## 推荐配置

使用**方案 3**（简化版），因为：
1. ✅ 速度快（直接尝试跳转）
2. ✅ 不会误判（正则过滤）
3. ✅ 代码简洁
4. ✅ 用户体验好

## 修改要点

只需在 `cd` 处理之后、普通命令执行之前，添加这段代码：

```tsx
// ✅ 智能路径检测
const isDirPattern = /^[a-zA-Z0-9_.-]+$/.test(trimmedCmd);

if (isDirPattern) {
  try {
    const testCmd = currentDir 
      ? `cd "${currentDir}" && cd "${trimmedCmd}" && pwd`
      : `cd "${trimmedCmd}" && pwd`;
    
    const result = await invoke<string>('execute_command', { 
      command: testCmd 
    });
    
    const newDir = stripAnsi(result.trim());
    setPreviousDir(currentDir);
    setCurrentDir(newDir);
    setInput('');
    return;
  } catch (e) {
    // 不是目录，继续作为普通命令
  }
}
```

---

**现在可以直接输入目录名跳转了！** 🚀

```
~ Desktop
Desktop 
```