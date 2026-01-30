# 实现命令历史功能（上下箭头）

## 功能说明

- ⬆️ 上箭头：浏览上一条历史命令
- ⬇️ 下箭头：浏览下一条历史命令
- 按 Enter 执行后，自动保存到历史
- 历史持久化到 localStorage

## 完整实现代码

### 修改 `App.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface OutputLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

interface DirHistory {
  path: string;
  count: number;
  lastVisited: number;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
            .replace(/\x1B\[[\?]?[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1B\][0-9];[^\x07]*\x07/g, '');
}

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [previousDir, setPreviousDir] = useState<string>('');
  const [dirHistory, setDirHistory] = useState<DirHistory[]>([]);
  
  // ✅ 新增：命令历史状态
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState(''); // 暂存当前输入
  
  const outputRef = useRef<HTMLDivElement>(null);

  // ✅ 加载命令历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('commandHistory');
    if (savedHistory) {
      try {
        setCommandHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load command history:', e);
      }
    }
  }, []);

  // ✅ 保存命令历史
  useEffect(() => {
    if (commandHistory.length > 0) {
      localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
    }
  }, [commandHistory]);

  // 加载目录历史
  useEffect(() => {
    const saved = localStorage.getItem('dirHistory');
    if (saved) {
      try {
        setDirHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (dirHistory.length > 0) {
      localStorage.setItem('dirHistory', JSON.stringify(dirHistory));
    }
  }, [dirHistory]);

  const recordVisit = (path: string) => {
    setDirHistory(prev => {
      const existing = prev.find(d => d.path === path);
      
      if (existing) {
        return prev.map(d => 
          d.path === path 
            ? { ...d, count: d.count + 1, lastVisited: Date.now() }
            : d
        ).sort((a, b) => b.lastVisited - a.lastVisited);
      } else {
        const newHistory = [...prev, {
          path,
          count: 1,
          lastVisited: Date.now()
        }];
        
        return newHistory
          .sort((a, b) => b.lastVisited - a.lastVisited)
          .slice(0, 50);
      }
    });
  };

  const findBestMatch = (query: string): string | null => {
    if (!query) return null;
    
    const lowerQuery = query.toLowerCase();
    
    const scored = dirHistory.map(d => {
      const dirName = d.path.split('/').filter(p => p).pop() || '';
      const lowerPath = d.path.toLowerCase();
      const lowerName = dirName.toLowerCase();
      
      let score = 0;
      
      if (lowerName === lowerQuery) {
        score = 1000;
      } else if (lowerName.startsWith(lowerQuery)) {
        score = 500;
      } else if (lowerName.includes(lowerQuery)) {
        score = 300;
      } else if (lowerPath.includes(lowerQuery)) {
        score = 100;
      }
      
      score += d.count * 10;
      
      const ageHours = (Date.now() - d.lastVisited) / (1000 * 60 * 60);
      score += Math.max(0, 100 - ageHours);
      
      return { ...d, score };
    });
    
    const best = scored
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)[0];
    
    return best ? best.path : null;
  };

  const getDirectoryIcon = (path: string): string => {
    if (!path) return '🏠';
    
    const dirName = path.split('/').filter(Boolean).pop()?.toLowerCase() || '';
    
    const iconMap: { [key: string]: string } = {
      'desktop': '🖥️',
      'documents': '📄',
      'downloads': '⬇️',
      'pictures': '🖼️',
      'photos': '📷',
      'music': '🎵',
      'movies': '🎬',
      'videos': '🎥',
      'applications': '📱',
      'library': '📚',
      'public': '🌐',
      'projects': '💼',
      'project': '💼',
      'code': '💻',
      'src': '📂',
      'source': '📂',
      'node_modules': '📦',
      'dist': '📤',
      'build': '🔨',
      '.git': '🌿',
      'config': '⚙️',
      'bin': '🔧',
      'trash': '🗑️',
      'archive': '📦',
      'temp': '⏳',
      'backup': '💾',
    };
    
    return iconMap[dirName] || '📁';
  };

  useEffect(() => {
    const initDir = async () => {
      try {
        const dir = await invoke<string>('execute_command', { 
          command: 'pwd' 
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
      recordVisit(newDir);
    } catch (error) {
      setOutput(prev => [...prev, { 
        type: 'error', 
        text: `cd: ${targetDir}: No such file or directory` 
      }]);
    }
  };

  // ✅ 添加命令到历史
  const addToHistory = (cmd: string) => {
    if (!cmd.trim()) return;
    
    setCommandHistory(prev => {
      // 移除重复的命令
      const filtered = prev.filter(c => c !== cmd);
      // 添加到末尾（最新的）
      const newHistory = [...filtered, cmd];
      // 只保留最近 100 条
      return newHistory.slice(-100);
    });
    
    // 重置历史索引
    setHistoryIndex(-1);
    setTempInput('');
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    let trimmedCmd = cmd.trim();

    // ✅ 添加到历史（在执行前）
    addToHistory(trimmedCmd);

    const aliases: { [key: string]: string } = {
      'll': 'ls -la',
      'la': 'ls -la',
      'l': 'ls -lh',
    };

    const cmdParts = trimmedCmd.split(' ');
    const baseCmd = cmdParts[0];
    
    if (aliases[baseCmd]) {
      cmdParts[0] = aliases[baseCmd];
      trimmedCmd = cmdParts.join(' ');
    }

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

    // ✅ history 命令 - 显示历史
    if (trimmedCmd === 'history') {
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
      setOutput(prev => [...prev, {
        type: 'output',
        text: commandHistory.map((c, i) => `${i + 1}  ${c}`).join('\n')
      }]);
      setOutput(prev => [...prev, { type: 'output', text: '' }]);
      setInput('');
      return;
    }

    if (trimmedCmd.startsWith('z ')) {
      const query = trimmedCmd.substring(2).trim();
      
      if (query === 'history' || query === '--history') {
        setOutput(prev => [...prev, { type: 'input', text: cmd }]);
        setOutput(prev => [...prev, { 
          type: 'output', 
          text: 'Recently visited directories:\n' + 
                dirHistory
                  .slice(0, 20)
                  .map((d, i) => `${i + 1}. ${d.path} (${d.count} visits)`)
                  .join('\n')
        }]);
        setOutput(prev => [...prev, { type: 'output', text: '' }]);
        setInput('');
        return;
      }
      
      const bestMatch = findBestMatch(query);
      
      if (bestMatch) {
        setInput('');
        
        try {
          const result = await invoke<string>('execute_command', { 
            command: `cd "${bestMatch}" && pwd` 
          });
          
          const newDir = stripAnsi(result.trim());
          setPreviousDir(currentDir);
          setCurrentDir(newDir);
          recordVisit(newDir);
        } catch (error) {
          setOutput(prev => [...prev, { 
            type: 'error', 
            text: `z: cannot access ${bestMatch}` 
          }]);
        }
        return;
      } else {
        setOutput(prev => [...prev, { type: 'input', text: cmd }]);
        setOutput(prev => [...prev, { 
          type: 'error', 
          text: `z: no match found for "${query}"` 
        }]);
        setOutput(prev => [...prev, { type: 'output', text: '' }]);
        setInput('');
        return;
      }
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
        recordVisit(newDir);
        setInput('');
        return;
      } catch (e) {
        // 不是目录
      }
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

  // ✅ 处理键盘事件（包括历史导航）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter - 执行命令
    if (e.key === 'Enter' && !isLoading) {
      executeCommand(input);
      return;
    }
    
    // Ctrl+L - 清屏
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([]);
      setInput('');
      return;
    }

    // ✅ 上箭头 - 上一条历史
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      if (commandHistory.length === 0) return;
      
      // 第一次按上箭头，保存当前输入
      if (historyIndex === -1) {
        setTempInput(input);
      }
      
      // 计算新索引
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      
      // 从历史末尾往前数
      const historyCmd = commandHistory[commandHistory.length - 1 - newIndex];
      setInput(historyCmd);
      return;
    }

    // ✅ 下箭头 - 下一条历史
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex - 1;
      
      if (newIndex === -1) {
        // 回到当前输入
        setHistoryIndex(-1);
        setInput(tempInput);
      } else {
        // 显示历史命令
        setHistoryIndex(newIndex);
        const historyCmd = commandHistory[commandHistory.length - 1 - newIndex];
        setInput(historyCmd);
      }
      return;
    }

    // ✅ 任何其他按键都重置历史导航
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      if (historyIndex !== -1) {
        setHistoryIndex(-1);
        setTempInput('');
      }
    }
  };

  const getDisplayPath = (path: string) => {
    if (!path) return '🏠 ~';
    
    const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                         path.match(/^\/home\/[^\/]+/) ||
                         path.match(/^C:\\Users\\[^\\]+/);
    const homeDir = homeDirMatch ? homeDirMatch[0] : '';
    
    if (homeDir && path === homeDir) {
      return '🏠 ~';
    }
    
    const parts = path.split('/').filter(p => p);
    const dirName = parts[parts.length - 1] || '/';
    
    const icon = getDirectoryIcon(path);
    return `${icon} ${dirName}`;
  };

  return (
    <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-sm"
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
}
```

## 功能说明

### 新增状态

```tsx
const [commandHistory, setCommandHistory] = useState<string[]>([]);  // 历史命令列表
const [historyIndex, setHistoryIndex] = useState(-1);                // 当前浏览的历史索引
const [tempInput, setTempInput] = useState('');                      // 暂存当前输入
```

### 历史导航逻辑

1. **上箭头**（⬆️）：
   - 第一次按：保存当前输入，显示最后一条历史
   - 继续按：往前翻历史
   - 到达最早的历史就停止

2. **下箭头**（⬇️）：
   - 往后翻历史
   - 到达末尾：恢复之前保存的输入

3. **输入任何字符**：
   - 重置历史导航
   - 回到正常输入模式

### 历史持久化

```tsx
// 保存到 localStorage
localStorage.setItem('commandHistory', JSON.stringify(commandHistory));

// 加载
const savedHistory = localStorage.getItem('commandHistory');
setCommandHistory(JSON.parse(savedHistory));
```

### 历史限制

- 只保留最近 100 条命令
- 自动去重（相同命令只保留一次）

## 使用示例

```bash
# 执行一些命令
~ ls
~ cd Desktop
🖥️ Desktop pwd
🖥️ Desktop echo hello

# 按上箭头
🖥️ Desktop echo hello  ← 显示上一条

# 再按上箭头
🖥️ Desktop pwd         ← 再上一条

# 再按上箭头
🖥️ Desktop cd Desktop  ← 继续往前

# 按下箭头
🖥️ Desktop pwd         ← 往后

# 按 Enter 执行
/Users/you/Desktop
```

## 额外功能

### history 命令

查看所有历史：

```bash
~ history
1  ls
2  cd Desktop
3  pwd
4  echo hello
```

## 快捷键总结

| 按键 | 功能 |
|------|------|
| ⬆️ 上箭头 | 上一条历史命令 |
| ⬇️ 下箭头 | 下一条历史命令 |
| Enter | 执行当前命令 |
| Ctrl+L | 清屏 |
| 任意字符 | 退出历史浏览，正常输入 |

## 注意事项

1. 历史索引从 -1 开始（表示当前输入）
2. 历史数组从末尾往前数（最新的在最后）
3. 空命令不会添加到历史
4. 重复命令会去重并移到最新

---

**现在你可以用上下箭头浏览历史命令了！** ⬆️⬇️