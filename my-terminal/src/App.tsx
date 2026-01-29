import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TerminalLine {
  type: 'output' | 'error' | 'command';
  text: string;
  meta?: {
    dir: string;
    branch?: string;
  };
}

// 简单的 ANSI 代码移除函数
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
            .replace(/\x1B\[[\?]?[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1B\][0-9];[^\x07]*\x07/g, '');
}

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<TerminalLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>(''); // 当前目录状态
  const [previousDir, setPreviousDir] = useState<string>(''); // 上一个目录状态 (用于 cd -)
  const [gitBranch, setGitBranch] = useState<string>(''); // Git 分支状态
  const bottomRef = useRef<HTMLDivElement>(null);

  // 获取 Git 分支
  const updateGitBranch = async (dir: string) => {
    try {
      const result = await invoke<string>('execute_command', { 
        command: `cd "${dir}" && git branch --show-current 2>/dev/null` 
      });
      setGitBranch(stripAnsi(result.trim()));
    } catch {
      setGitBranch('');
    }
  };

  // 初始化：获取当前目录
  useEffect(() => {
    const initDir = async () => {
      try {
        const dir = await invoke<string>('execute_command', { 
          command: 'pwd' 
        });
        const cleanDir = stripAnsi(dir.trim());
        setCurrentDir(cleanDir);
        setPreviousDir(cleanDir);
        await updateGitBranch(cleanDir);
      } catch (e) {
        console.error('Failed to get initial directory:', e);
      }
    };
    initDir();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  // ✅ 路径美化函数：显示 ~ 或目录名
  const getDisplayPath = (path: string) => {
    if (!path) return '';
    
    // 统一路径格式
    const normalizedPath = path.replace(/\\/g, '/');
    
    // 获取 HOME 目录 (简单推断)
    const homeMatch = normalizedPath.match(/^(\/Users\/[^\/]+|\/home\/[^\/]+|C:\/Users\/[^\/]+)/);
    const homeDir = homeMatch ? homeMatch[0] : '';
    
    if (homeDir && normalizedPath === homeDir) {
      return '~';
    }
    
    if (homeDir && normalizedPath.startsWith(homeDir + '/')) {
      return '~' + normalizedPath.substring(homeDir.length);
    }
    
    // 否则显示最后一段目录名
    const parts = normalizedPath.split('/').filter(p => p);
    return parts[parts.length - 1] || '/';
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    
    let trimmedCmd = cmd.trim();

    // 别名映射
    const aliases: { [key: string]: string } = {
      'll': 'ls -la',
      'la': 'ls -la',
      'l': 'ls -lh',
      'ls': 'ls --color=auto',
      '..': 'cd ..',
      '...': 'cd ../..',
      '....': 'cd ../../..',
      '~': 'cd ~',
      '-': 'cd -',
      'md': 'mkdir',
      'rd': 'rmdir',
      'cls': 'clear',
      'c': 'clear',
      'gs': 'git status',
      'ga': 'git add',
      'gc': 'git commit',
      'gp': 'git push',
      'gl': 'git log',
    };

    // 展开别名
    const cmdParts = trimmedCmd.split(' ');
    const baseCmd = cmdParts[0];
    
    if (aliases[baseCmd]) {
      cmdParts[0] = aliases[baseCmd];
      trimmedCmd = cmdParts.join(' ');
    }

    // 处理 cd 命令
    if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
      // 记录输入的命令
      setOutput((prev: TerminalLine[]) => [...prev, { 
        type: 'command', 
        text: cmd,
        // 存储当前环境信息用于显示
        meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
      } as any]);
      setInput('');
      
      let targetDir = trimmedCmd === 'cd' ? '~' : trimmedCmd.substring(3).trim() || '~';
      
      try {
        let testCmd = '';
        if (targetDir === '-') {
          if (previousDir) {
            targetDir = previousDir;
            testCmd = `cd "${targetDir}" && pwd`;
          } else {
            setOutput((prev: TerminalLine[]) => [...prev, { type: 'error', text: 'cd: OLDPWD not set' }]);
            return;
          }
        } else if (targetDir === '~' || targetDir === '') {
          testCmd = 'cd && pwd';
        } else if (targetDir.startsWith('~')) {
          const pathAfterTilde = targetDir.substring(1);
          testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;
        } else if (targetDir.startsWith('/') || /^[a-zA-Z]:\\/.test(targetDir)) {
          testCmd = `cd "${targetDir}" && pwd`;
        } else {
          testCmd = currentDir ? `cd "${currentDir}" && cd "${targetDir}" && pwd` : `cd "${targetDir}" && pwd`;
        }

        const result = await invoke<string>('execute_command', { 
          command: testCmd 
        });
        
        const newDir = stripAnsi(result.trim());
        setPreviousDir(currentDir);
        setCurrentDir(newDir);
        await updateGitBranch(newDir);
        
        // cd 成功后通常不显示输出，但添加一个空行
        setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      } catch (error) {
        setOutput((prev: TerminalLine[]) => [...prev, { 
          type: 'error', 
          text: `cd: ${targetDir}: No such file or directory` 
        }]);
        setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      }
      return;
    }

    // 处理 clear 命令
    if (trimmedCmd === 'clear') {
      setOutput([]);
      setInput('');
      return;
    }
    
    setIsLoading(true);
    setOutput((prev: TerminalLine[]) => [...prev, { 
      type: 'command', 
      text: cmd,
      meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
    } as any]);
    
    try {
      const fullCmd = currentDir ? `cd "${currentDir}" && ${trimmedCmd}` : trimmedCmd;
      const result = await invoke<string>('execute_command', { command: fullCmd });
      if (result) {
        setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: stripAnsi(result) }]);
      }
      // 每个命令后添加空行
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
    } catch (e) {
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'error', text: String(e) }]);
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([]);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto mb-2 pr-2">
        {output.map((line: TerminalLine, i: number) => (
          <div key={i} className="mb-1">
            {line.type === 'command' && (
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">{line.meta?.dir}</span>
                {line.meta?.branch && (
                  <span className="text-purple-400">({line.meta.branch})</span>
                )}
                <span className="text-green-400 font-bold">➜</span>
                <span className="text-gray-100">{line.text}</span>
              </div>
            )}
            {line.type === 'output' && (
              <div className="text-gray-300 whitespace-pre-wrap break-all">
                {line.text}
              </div>
            )}
            {line.type === 'error' && (
              <div className="text-red-400 whitespace-pre-wrap break-all font-semibold">
                {line.text}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="text-gray-500 animate-pulse">...</div>}
        <div ref={bottomRef} />
      </div>
      
      <div className="flex flex-col border-t border-gray-700 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">{getDisplayPath(currentDir)}</span>
          {gitBranch && (
            <span className="text-purple-400">({gitBranch})</span>
          )}
          <span className="text-green-400 font-bold">➜</span>
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-700"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder=""
          />
        </div>
      </div>
    </div>
  );
}

export default App;
