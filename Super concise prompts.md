# 超简洁提示符 - 无箭头版本

## 效果

```
~ ls
Desktop  Documents  Downloads

Desktop cd project1

project1 pwd
/Users/wztao/Desktop/project1

project1 
```

## 完整代码

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
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
      setInput('');
      
      const targetDir = trimmedCmd.substring(3).trim();
      await changeDirectory(targetDir);
      
      setOutput(prev => [...prev, { type: 'output', text: '' }]);
      return;
    }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      executeCommand(input);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([]);
      setInput('');
    }
  };

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

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
      >
        {output.map((line, i) => (
          <div key={i}>
            {line.type === 'input' && (
              <div className="flex items-start gap-2">
                <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
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

## 主要改动

只需删除箭头相关的代码：

### 修改 1：输入显示部分

```tsx
// ❌ 之前（有箭头）
<div className="flex items-start gap-2">
  <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
  <span className="text-green-400">➜</span>
  <span className="text-gray-300">{line.text}</span>
</div>

// ✅ 现在（无箭头）
<div className="flex items-start gap-2">
  <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
  <span className="text-gray-300">{line.text}</span>
</div>
```

### 修改 2：底部输入区域

```tsx
// ❌ 之前（有箭头）
<div className="flex items-center gap-2">
  <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
  <span className="text-green-400">➜</span>
  <input ... />
</div>

// ✅ 现在（无箭头）
<div className="flex items-center gap-2">
  <span className="text-cyan-400">{getDisplayPath(currentDir)}</span>
  <input ... />
</div>
```

## 快速修改方式

如果你已经有之前的代码，只需：

1. 找到两处 `<span className="text-green-400">➜</span>`
2. 删除这两行
3. 保存

就完成了！

## 效果展示

```
Terminal MVP

~ ls
Desktop  Documents  Downloads

~ cd Desktop

Desktop ls
project1  project2  file.txt

Desktop cd project1

project1 pwd
/Users/wztao/Desktop/project1

project1 
```

## 对比

| 样式 | 效果 |
|------|------|
| 有箭头 | `Desktop ➜ ls` |
| 无箭头 | `Desktop ls` |

更简洁，更像传统终端！

## 其他简洁方案

### 方案 1：只显示 `~`（当前）
```
~ ls
Desktop cd project
project 
```

### 方案 2：显示相对路径
```
~/Desktop ls
~/Desktop/project cd ..
~/Desktop 
```

如果要方案 2，修改 `getDisplayPath`：

```tsx
const getDisplayPath = (path: string) => {
  if (!path) return '';
  
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  // ✅ 返回完整的 ~/path 格式
  if (homeDir && path.startsWith(homeDir + '/')) {
    return '~' + path.substring(homeDir.length);
  }
  
  return path;
};
```

效果：
```
~/Desktop ls
~/Desktop/project1 pwd
/Users/wztao/Desktop/project1

~/Desktop/project1 
```

---

**现在更简洁了！** ✨

```
~ ls
Desktop cd Documents
Documents 
```