# 美化终端提示符 - Oh My Zsh 风格

## 目标效果

```
~ ls

Desktop cd Documents

Documents 
```

## 实现方案

### 方案 1：简洁版（推荐）

```tsx
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface OutputLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
            .replace(/\x1B\[[\?]?[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1B\][0-9];[^\x07]*\x07/g, '');
}

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([
    { type: 'output', text: 'Terminal MVP' },
    { type: 'output', text: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [previousDir, setPreviousDir] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initDir = async () => {
      try {
        const dir = await invoke<string>('execute_command', { 
          command: 'pwd' 
        });
        const cleanDir = stripAnsi(dir.trim());
        setCurrentDir(cleanDir);
        setPreviousDir(cleanDir);
      } catch (e) {
        console.error('Failed to get initial directory:', e);
      }
    };
    initDir();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const changeDirectory = async (targetDir: string) => {
    try {
      let testCmd = '';
      
      if (targetDir === '~' || targetDir === '') {
        testCmd = 'cd && pwd';
      } else if (targetDir.startsWith('~')) {
        const pathAfterTilde = targetDir.substring(1);
        testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;
      } else if (targetDir === '-') {
        if (previousDir) {
          testCmd = `cd "${previousDir}" && pwd`;
        } else {
          setOutput(prev => [...prev, { 
            type: 'error', 
            text: 'cd: no previous directory' 
          }]);
          return;
        }
      } else if (targetDir.startsWith('/')) {
        testCmd = `cd "${targetDir}" && pwd`;
      } else {
        testCmd = `cd "${currentDir}" && cd "${targetDir}" && pwd`;
      }

      const result = await invoke<string>('execute_command', { 
        command: testCmd 
      });
      
      const newDir = stripAnsi(result.trim());
      setPreviousDir(currentDir);
      setCurrentDir(newDir);
    } catch (error) {
      setOutput(prev => [...prev, { 
        type: 'error', 
        text: `cd: ${targetDir}: No such file or directory` 
      }]);
    }
  };

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

    if (shortcuts[trimmedCmd]) {
      trimmedCmd = shortcuts[trimmedCmd];
    }

    if (trimmedCmd.toLowerCase() === 'clear' || trimmedCmd.toLowerCase() === 'cls') {
      setOutput([]);
      setInput('');
      return;
    }

    if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
      // ✅ 显示命令
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
      setInput('');
      
      const targetDir = trimmedCmd.substring(3).trim();
      await changeDirectory(targetDir);
      
      // ✅ cd 后添加空行
      setOutput(prev => [...prev, { type: 'output', text: '' }]);
      return;
    }

    // ✅ 显示命令（不带 $ 符号）
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
      // ✅ 命令后添加空行
      setOutput(prev => [...prev, { type: 'output', text: '' }]);
    } catch (error) {
      setOutput(prev => [...prev, { type: 'error', text: String(error) }]);
      setOutput(prev => [...prev, { type: 'output', text: '' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      executeCommand(input);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([]);
      setInput('');
    }
  };

  // ✅ 获取显示名称（~ 或目录名）
  const getDisplayPath = (path: string) => {
    if (!path) return '';
    
    // 获取 HOME 目录（从环境变量或路径推断）
    const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                         path.match(/^\/home\/[^\/]+/) ||
                         path.match(/^C:\\Users\\[^\\]+/);
    const homeDir = homeDirMatch ? homeDirMatch[0] : '';
    
    // 如果是主目录，显示 ~
    if (homeDir && path === homeDir) {
      return '~';
    }
    
    // 如果在主目录下，显示相对于主目录的路径
    if (homeDir && path.startsWith(homeDir + '/')) {
      return '~' + path.substring(homeDir.length);
    }
    
    // 否则只显示目录名
    const parts = path.split('/').filter(p => p);
    return parts[parts.length - 1] || '/';
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
      >
        {output.map((line, i) => (
          <div key={i}>
            {line.type === 'input' && (
              // ✅ 显示目录 + 箭头 + 命令
              <div className="flex items-start gap-2">
                <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
                <span className="text-green-400">➜</span>
                <span className="text-gray-300">{line.text}</span>
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

      {/* ✅ 底部输入 - 显示目录 + 箭头 */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
          <span className="text-green-400">➜</span>
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
          {isLoading && (
            <span className="text-gray-500 text-sm">...</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 效果展示

```
Terminal MVP

~
➜ ls
Desktop  Documents  Downloads

~
➜ cd Desktop

Desktop
➜ ls
project1  project2

Desktop
➜ cd project1

project1
➜ pwd
/Users/wztao/Desktop/project1

project1
➜ cd ~

~
➜ 
```

## 方案 2：更多颜色（Oh My Zsh Robbyrussell 主题）

如果你想要更丰富的颜色：

```tsx
// 修改显示部分
{line.type === 'input' && (
  <div className="flex items-start gap-2">
    <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
    <span className="text-green-500 font-bold">➜</span>
    <span className="text-white">{line.text}</span>
  </div>
)}

// 底部输入
<div className="flex items-center gap-2">
  <span className="text-cyan-400 font-semibold">{getDisplayPath(currentDir)}</span>
  <span className="text-green-500 font-bold">➜</span>
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    disabled={isLoading}
    className="flex-1 bg-transparent outline-none text-white"
    placeholder=""
    autoFocus
  />
</div>
```

## 方案 3：添加 Git 分支（高级）

如果在 Git 仓库中，显示分支：

```tsx
const [gitBranch, setGitBranch] = useState<string>('');

// 获取 Git 分支
const updateGitBranch = async () => {
  try {
    const result = await invoke<string>('execute_command', { 
      command: 'git branch --show-current 2>/dev/null' 
    });
    setGitBranch(stripAnsi(result.trim()));
  } catch {
    setGitBranch('');
  }
};

// 在 changeDirectory 后调用
await changeDirectory(targetDir);
await updateGitBranch();

// 显示
<div className="flex items-center gap-2">
  <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
  {gitBranch && (
    <span className="text-purple-400">({gitBranch})</span>
  )}
  <span className="text-green-500">➜</span>
  <input ... />
</div>
```

效果：
```
my-project (main)
➜ 
```

## 主要改动说明

### 1. 移除 `$` 符号
```tsx
// 之前
<span className="text-green-400 font-mono">$</span>

// 现在
<span className="text-green-400">➜</span>
```

### 2. 显示目录名而不是路径
```tsx
const getDisplayPath = (path: string) => {
  // 主目录显示 ~
  if (path === homeDir) return '~';
  
  // 主目录下显示 ~/path
  if (path.startsWith(homeDir + '/')) {
    return '~' + path.substring(homeDir.length);
  }
  
  // 其他显示目录名
  return dirName;
};
```

### 3. 输出格式
```tsx
// 输入显示为： 目录名 ➜ 命令
// 输出直接显示内容
// 命令之间自动添加空行
```

## 自定义颜色

你可以轻松修改颜色：

| 元素 | 当前颜色 | 类名 |
|------|---------|------|
| 目录名 | 青色 | `text-cyan-400` |
| 箭头 | 绿色 | `text-green-400` |
| 命令 | 灰白 | `text-gray-300` |
| 输出 | 灰白 | `text-gray-300` |
| 错误 | 红色 | `text-red-400` |

改成你喜欢的颜色：
```tsx
text-cyan-400 → text-blue-400    (蓝色目录)
text-green-400 → text-yellow-400 (黄色箭头)
```

## 完整颜色选项

```tsx
// 青色调
text-cyan-300, text-cyan-400, text-cyan-500

// 绿色调
text-green-300, text-green-400, text-green-500

// 蓝色调
text-blue-300, text-blue-400, text-blue-500

// 紫色调
text-purple-300, text-purple-400, text-purple-500

// 粉色调
text-pink-300, text-pink-400, text-pink-500
```

---

**现在你的终端看起来像 Oh My Zsh 了！** ✨

```
~
➜ cd Desktop

Desktop
➜ ls
project1  project2

Desktop
➜ 
```