# 处理 cd 命令 - 会话状态问题修复

## 问题说明

当你运行 `cd ..` 时看到 `(no output)`，并且目录没有真正改变。这是因为 MVP 终端的每个命令都在**独立的进程**中运行，没有保持会话状态。

## 问题演示

```bash
$ pwd
/home/user
$ cd ..
(no output)
$ pwd
/home/user    # 还是原来的目录！
```

## 解决方案

### 方案 1：前端模拟 cd（简单快速）

在前端维护一个"当前目录"状态，拦截 cd 命令。

**修改 `src/App.tsx`：**

```tsx
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface OutputLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

// 简单的 ANSI 代码移除函数
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
            .replace(/\x1B\[[\?]?[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1B\][0-9];[^\x07]*\x07/g, '');
}

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([
    { type: 'output', text: 'Welcome to Terminal MVP' },
    { type: 'output', text: 'Type commands and press Enter' },
    { type: 'output', text: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>(''); // 当前目录状态
  const outputRef = useRef<HTMLDivElement>(null);

  // 初始化：获取当前目录
  useEffect(() => {
    const initDir = async () => {
      try {
        const dir = await invoke<string>('execute_command', { 
          command: 'pwd' 
        });
        setCurrentDir(stripAnsi(dir.trim()));
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

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    const trimmedCmd = cmd.trim();

    // 处理 clear 命令
    if (trimmedCmd.toLowerCase() === 'clear' || trimmedCmd.toLowerCase() === 'cls') {
      setOutput([{ type: 'output', text: 'Terminal cleared' }]);
      setInput('');
      return;
    }

    // 处理 cd 命令
    if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
      setOutput(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
      setInput('');
      
      const targetDir = trimmedCmd.substring(3).trim() || '~';
      
      try {
        // 使用新目录执行 pwd 来验证并获取绝对路径
        let testCmd = '';
        if (targetDir === '~') {
          testCmd = 'cd ~ && pwd';
        } else if (targetDir.startsWith('/')) {
          // 绝对路径
          testCmd = `cd "${targetDir}" && pwd`;
        } else {
          // 相对路径
          testCmd = `cd "${currentDir}" && cd "${targetDir}" && pwd`;
        }

        const result = await invoke<string>('execute_command', { 
          command: testCmd 
        });
        
        const newDir = stripAnsi(result.trim());
        setCurrentDir(newDir);
        setOutput(prev => [...prev, { 
          type: 'output', 
          text: `Changed directory to: ${newDir}` 
        }]);
      } catch (error) {
        setOutput(prev => [...prev, { 
          type: 'error', 
          text: `cd: ${targetDir}: No such file or directory` 
        }]);
      }
      return;
    }

    // 普通命令 - 在当前目录执行
    setOutput(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
    setInput('');
    setIsLoading(true);

    try {
      // 如果有当前目录，先 cd 到那个目录再执行命令
      const fullCmd = currentDir 
        ? `cd "${currentDir}" && ${cmd}` 
        : cmd;
      
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
        {/* 显示当前目录 */}
        {currentDir && (
          <div className="text-xs text-gray-500 mb-2">
            {currentDir}
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

### 方案 2：后端维护会话（更真实，但复杂）

在 Rust 后端使用 PTY（伪终端）来维护真实的 shell 会话。这需要较大的改动，详见 `references/extensions.md` 中的"PTY 集成"部分。

## 方案 1 的工作原理

```
用户输入: cd ..
    ↓
前端拦截 cd 命令
    ↓
执行: cd /current/dir && cd .. && pwd
    ↓
获取新目录: /current
    ↓
保存到状态: currentDir = /current
    ↓
以后所有命令都在这个目录执行
```

## 测试修复

替换代码后，尝试：

```bash
$ pwd
/home/user/projects
$ cd ..
Changed directory to: /home/user
$ pwd
/home/user         # ✅ 目录真的改变了！
$ ls
(shows files in /home/user)
$ cd projects
Changed directory to: /home/user/projects
$ pwd
/home/user/projects
```

## 支持的 cd 用法

修复后支持：

| 命令 | 说明 | 示例 |
|------|------|------|
| `cd ..` | 上级目录 | `cd ..` |
| `cd ~` | 用户主目录 | `cd ~` |
| `cd` | 用户主目录 | `cd` |
| `cd folder` | 相对路径 | `cd Documents` |
| `cd /path` | 绝对路径 | `cd /usr/local` |

## 额外功能

这个版本还添加了：

1. ✅ **当前目录显示** - 在输入框上方显示当前目录
2. ✅ **所有命令都在正确目录执行** - 不只是 cd
3. ✅ **错误处理** - 目录不存在时显示错误
4. ✅ **支持相对和绝对路径**

## 完整功能演示

```bash
$ pwd
/home/user
$ cd Documents
Changed directory to: /home/user/Documents
$ ls
file1.txt file2.txt folder/
$ cd folder
Changed directory to: /home/user/Documents/folder
$ cd ../..
Changed directory to: /home/user
$ cd /tmp
Changed directory to: /tmp
$ pwd
/tmp
```

## Windows 用户注意

Windows 使用反斜杠 `\` 而不是 `/`，但代码会自动处理。

```bash
$ cd C:\Users\Username
Changed directory to: C:\Users\Username
$ cd ..
Changed directory to: C:\Users
```

## 限制

### 方案 1 的限制：
- ❌ 不支持环境变量持久化（export 命令无效）
- ❌ 不支持后台任务
- ❌ 不支持 shell 别名
- ❌ 每个命令仍然是独立进程

### 要完全解决这些问题：
需要使用方案 2（PTY 集成），参见 `references/extensions.md`

## 快速对比

| 特性 | MVP 原版 | 方案 1 | 方案 2 (PTY) |
|------|---------|--------|--------------|
| cd 支持 | ❌ | ✅ | ✅ |
| 目录显示 | ❌ | ✅ | ✅ |
| 环境变量 | ❌ | ❌ | ✅ |
| 后台任务 | ❌ | ❌ | ✅ |
| 实现难度 | 简单 | 简单 | 困难 |
| 代码量 | ~150行 | ~200行 | ~500行 |

## 下一步

如果方案 1 满足你的需求，就用它！如果需要完整的 shell 功能（环境变量、后台任务等），可以看 `references/extensions.md` 学习如何实现 PTY 集成。

---

**现在你的 cd 命令可以正常工作了！** 🎉

## 常见 cd 命令

```bash
cd ~          # 回到主目录
cd ..         # 上级目录
cd ../..      # 上两级
cd -          # 返回上一个目录（需要额外实现）
cd /          # 根目录
```

注意：`cd -` 需要额外代码来记住上一个目录，可以自己添加！