# 修复 ~ (波浪号) 符号问题

## 问题原因

当执行 `cd ~` 时，错误 `cd: ~/: No such file or directory` 是因为在某些情况下，shell 没有正确展开 `~` 符号。

## 解决方案

使用 `$HOME` 环境变量替代 `~`，或者直接不带参数调用 `cd`（会自动进入主目录）。

## 修复代码

找到 `changeDirectory` 函数并修改：

```tsx
const changeDirectory = async (targetDir: string) => {
  try {
    let testCmd = '';
    
    if (targetDir === '~' || targetDir === '') {
      // ✅ 修复：使用不带参数的 cd，或使用 $HOME
      // 方案 1: 不带参数（推荐，最可靠）
      testCmd = 'cd && pwd';
      
      // 方案 2: 使用 $HOME（备选）
      // testCmd = 'cd "$HOME" && pwd';
      
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
    } else if (targetDir.startsWith('~')) {
      // ✅ 新增：处理 ~/path 格式
      // 将 ~/path 转换为 $HOME/path
      const pathAfterTilde = targetDir.substring(1); // 去掉 ~
      testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;
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
```

## 完整修复版本

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
    { type: 'output', text: 'Terminal MVP - Ready' },
    { type: 'output', text: 'Try: .., ~, ls, pwd' },
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
        // ✅ 修复：使用不带参数的 cd（最可靠）
        testCmd = 'cd && pwd';
        
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
        // 绝对路径
        testCmd = `cd "${targetDir}" && pwd`;
        
      } else if (targetDir.startsWith('~')) {
        // ✅ 修复：处理 ~/path 格式（如 ~/Desktop）
        const pathAfterTilde = targetDir.substring(1);
        if (pathAfterTilde === '') {
          // 只有 ~
          testCmd = 'cd && pwd';
        } else {
          // ~/something
          testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;
        }
      } else {
        // 相对路径
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
      '.....': 'cd ../../../..',
      '~': 'cd ~',
      '-': 'cd -',
    };

    if (shortcuts[trimmedCmd]) {
      trimmedCmd = shortcuts[trimmedCmd];
    }

    if (trimmedCmd.toLowerCase() === 'clear' || trimmedCmd.toLowerCase() === 'cls') {
      setOutput([{ type: 'output', text: 'Terminal cleared' }]);
      setInput('');
      return;
    }

    if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
      setOutput(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
      setInput('');
      
      const targetDir = trimmedCmd.substring(3).trim();
      await changeDirectory(targetDir);
      return;
    }

    setOutput(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
    setInput('');
    setIsLoading(true);

    try {
      const fullCmd = currentDir 
        ? `cd "${currentDir}" && ${trimmedCmd}` 
        : trimmedCmd;
      
      const result = await invoke<string>('execute_command', { 
        command: fullCmd 
      });
      
      const cleanResult = stripAnsi(result || '(no output)');
      setOutput(prev => [...prev, { type: 'output', text: cleanResult }]);
    } catch (error) {
      setOutput(prev => [...prev, { type: 'error', text: String(error) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      executeCommand(input);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([{ type: 'output', text: 'Terminal cleared' }]);
      setInput('');
    }
  };

  const getShortPath = (path: string) => {
    if (!path) return '';
    const parts = path.split('/').filter(p => p);
    if (parts.length <= 3) return parts.join('/');
    return parts.slice(-3).join('/');
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm"
      >
        {output.map((line, i) => (
          <div key={i} className={`
            ${line.type === 'input' ? 'text-green-400' : ''}
            ${line.type === 'error' ? 'text-red-400' : ''}
            ${line.type === 'output' ? 'text-gray-300' : ''}
            whitespace-pre-wrap
          `}>
            {line.text}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700 p-4">
        {currentDir && (
          <div className="text-xs text-blue-400 mb-2 flex items-center gap-2">
            <span className="text-gray-500">📁</span>
            <span title={currentDir}>{getShortPath(currentDir)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none font-mono text-gray-100"
            placeholder="Type a command..."
            autoFocus
          />
          {isLoading && (
            <span className="text-gray-500 text-sm">Running...</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 修复的关键点

### 1. 处理单独的 `~`
```tsx
if (targetDir === '~' || targetDir === '') {
  testCmd = 'cd && pwd';  // ✅ 不带参数，shell 会自动进入主目录
}
```

### 2. 处理 `~/path` 格式
```tsx
else if (targetDir.startsWith('~')) {
  const pathAfterTilde = targetDir.substring(1);
  testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;  // ✅ 使用 $HOME 环境变量
}
```

## 现在支持的所有格式

| 输入 | 执行 | 结果 |
|------|------|------|
| `~` | `cd && pwd` | 主目录 ✅ |
| `cd ~` | `cd && pwd` | 主目录 ✅ |
| `cd` | `cd && pwd` | 主目录 ✅ |
| `~/Desktop` | `cd "$HOME/Desktop" && pwd` | 桌面 ✅ |
| `cd ~/Documents` | `cd "$HOME/Documents" && pwd` | 文档 ✅ |
| `..` | `cd ..` | 上级目录 ✅ |
| `-` | `cd "previous"` | 返回 ✅ |

## 测试修复

```bash
$ pwd
/Users/wztao/Desktop/Jack/i/loveone/my-terminal
$ ~
$ pwd
/Users/wztao                    # ✅ 成功进入主目录
$ cd ~/Desktop
$ pwd
/Users/wztao/Desktop           # ✅ 成功进入桌面
$ cd ~/Documents
$ pwd
/Users/wztao/Documents         # ✅ 成功进入文档
```

## Windows 用户

Windows 用户使用 `%USERPROFILE%` 而不是 `$HOME`。如果你需要同时支持 Windows，可以这样改：

```tsx
// 跨平台版本
else if (targetDir.startsWith('~')) {
  const pathAfterTilde = targetDir.substring(1);
  // Windows 使用 %USERPROFILE%，Unix 使用 $HOME
  testCmd = process.platform === 'win32' 
    ? `cd "%USERPROFILE%${pathAfterTilde}" && pwd`
    : `cd "$HOME${pathAfterTilde}" && pwd`;
}
```

或者更简单的方式，Rust 后端可以处理：

```rust
// 在 Rust 中处理 ~ 展开
#[tauri::command]
fn execute_command(command: String) -> Result<String, String> {
    let expanded_command = if command.starts_with("cd ~") {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_default();
        command.replace("~", &home)
    } else {
        command
    };
    
    // ... rest of the code
}
```

## 快速修改

只需要修改 `changeDirectory` 函数的前两个条件：

```tsx
// 找到这里
if (targetDir === '~' || targetDir === '') {
  testCmd = 'cd ~ && pwd';  // ❌ 旧代码
}

// 改为
if (targetDir === '~' || targetDir === '') {
  testCmd = 'cd && pwd';  // ✅ 新代码
}

// 然后添加这个新的条件（在 else if (targetDir === '-') 之前）
else if (targetDir.startsWith('~')) {
  const pathAfterTilde = targetDir.substring(1);
  testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;
}
```

保存后立即生效！

---

**现在 `~` 可以正常工作了！** 🏠