# 优化路径显示 - 只显示关键部分

## 修改方案

将路径显示从完整路径改为只显示最后 N 个部分。

## 修改代码

找到 `getShortPath` 函数并替换：

```tsx
// 原来的函数（显示 .../ 前缀）
const getShortPath = (path: string) => {
  if (!path) return '';
  const parts = path.split('/').filter(p => p);
  if (parts.length <= 3) return path;
  return '.../' + parts.slice(-3).join('/');
};

// 改为新函数（只显示最后 N 个部分）
const getShortPath = (path: string, depth: number = 3) => {
  if (!path) return '';
  const parts = path.split('/').filter(p => p);
  if (parts.length <= depth) return path;
  return parts.slice(-depth).join('/');
};
```

## 效果对比

| 完整路径 | 之前显示 | 现在显示 |
|---------|---------|---------|
| `/Users/wztao/Desktop/Jack/i/loveone/my-terminal` | `.../i/loveone/my-terminal` | `i/loveone/my-terminal` ✅ |
| `/Users/wztao/Desktop/Jack` | `Users/wztao/Desktop/Jack` | `Desktop/Jack` |
| `/Users/wztao` | `/Users/wztao` | `Users/wztao` |

## 完整的优化代码

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
    { type: 'output', text: 'Terminal MVP - Type a command' },
    { type: 'output', text: 'Shortcuts: .. (up), ... (up 2x), ~ (home), - (back)' },
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
        testCmd = 'cd ~ && pwd';
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

  // ✅ 新的路径显示函数 - 只显示最后 N 个部分
  const getShortPath = (path: string, depth: number = 3) => {
    if (!path) return '';
    const parts = path.split('/').filter(p => p);
    if (parts.length <= depth) {
      // 如果部分数量少于等于 depth，返回完整路径（但去掉开头的 /）
      return parts.join('/');
    }
    // 只返回最后 depth 个部分
    return parts.slice(-depth).join('/');
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

## 关键改动

只改了一个函数：

```tsx
// ✅ 只显示最后 3 个部分，没有 .../ 前缀
const getShortPath = (path: string, depth: number = 3) => {
  if (!path) return '';
  const parts = path.split('/').filter(p => p);
  if (parts.length <= depth) {
    return parts.join('/');
  }
  return parts.slice(-depth).join('/');
};
```

## 显示效果

```
📁 i/loveone/my-terminal
$ ..
$ pwd
/Users/wztao/Desktop/Jack/i/loveone
```

```
📁 i/loveone
$ ..
$ pwd
/Users/wztao/Desktop/Jack/i
```

```
📁 Desktop/Jack/i
$ cd my-terminal
$ pwd
/Users/wztao/Desktop/Jack/i/my-terminal
```

## 自定义显示深度

如果你想显示更多或更少的部分，修改 `depth` 参数：

```tsx
// 只显示 2 个部分
<span title={currentDir}>{getShortPath(currentDir, 2)}</span>

// 显示 4 个部分
<span title={currentDir}>{getShortPath(currentDir, 4)}</span>
```

### 不同深度的效果

| 完整路径 | depth=2 | depth=3 | depth=4 |
|---------|---------|---------|---------|
| `/Users/wztao/Desktop/Jack/i/loveone/my-terminal` | `loveone/my-terminal` | `i/loveone/my-terminal` | `Jack/i/loveone/my-terminal` |

## 悬停显示完整路径

鼠标放在路径上会显示完整路径（因为有 `title={currentDir}` 属性）：

```
📁 i/loveone/my-terminal
   ↑ 悬停显示: /Users/wztao/Desktop/Jack/i/loveone/my-terminal
```

## 快速修改

如果你只想改这一个函数，找到这行：

```tsx
const getShortPath = (path: string) => {
  if (!path) return '';
  const parts = path.split('/').filter(p => p);
  if (parts.length <= 3) return path;
  return '.../' + parts.slice(-3).join('/');
};
```

替换为：

```tsx
const getShortPath = (path: string) => {
  if (!path) return '';
  const parts = path.split('/').filter(p => p);
  if (parts.length <= 3) return parts.join('/');
  return parts.slice(-3).join('/');
};
```

保存后立即生效！

---

**现在路径显示更简洁了！** ✨

`📁 i/loveone/my-terminal` 而不是 `📁 .../i/loveone/my-terminal`