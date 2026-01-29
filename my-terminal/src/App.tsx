import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TerminalLine {
  type: 'output' | 'error' | 'command';
  text: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);

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
      } catch (e) {
        console.error('Failed to get initial directory:', e);
      }
    };
    initDir();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

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
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'command', text: `$ ${cmd}` }]);
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
          // ✅ 修复：使用不带参数的 cd，这是最可靠的进入主目录方式
          testCmd = 'cd && pwd';
        } else if (targetDir.startsWith('~')) {
          // ✅ 修复：处理 ~/path 格式
          const pathAfterTilde = targetDir.substring(1);
          testCmd = `cd "$HOME${pathAfterTilde}" && pwd`;
        } else if (targetDir.startsWith('/') || /^[a-zA-Z]:\\/.test(targetDir)) {
          // 绝对路径 (支持 Unix 和 Windows)
          testCmd = `cd "${targetDir}" && pwd`;
        } else {
          // 相对路径
          testCmd = currentDir ? `cd "${currentDir}" && cd "${targetDir}" && pwd` : `cd "${targetDir}" && pwd`;
        }

        const result = await invoke<string>('execute_command', { 
          command: testCmd 
        });
        
        const newDir = stripAnsi(result.trim());
        setPreviousDir(currentDir);
        setCurrentDir(newDir);
        setOutput((prev: TerminalLine[]) => [...prev, { 
          type: 'output', 
          text: `Changed directory to: ${newDir}` 
        }]);
      } catch (error) {
        setOutput((prev: TerminalLine[]) => [...prev, { 
          type: 'error', 
          text: `cd: ${targetDir}: No such file or directory` 
        }]);
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
    setOutput((prev: TerminalLine[]) => [...prev, { type: 'command', text: `$ ${cmd}` }]);
    
    try {
      // 在当前目录下执行命令
      const fullCmd = currentDir ? `cd "${currentDir}" && ${trimmedCmd}` : trimmedCmd;
      const result = await invoke<string>('execute_command', { command: fullCmd });
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: stripAnsi(result || '(no output)') }]);
    } catch (e) {
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'error', text: String(e) }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    }
  };

  // ✅ 新的路径显示函数 - 只显示最后 N 个部分
  const getShortPath = (path: string, depth: number = 3) => {
    if (!path) return '';
    const normalizedPath = path.replace(/\\/g, '/'); // 统一处理 Windows 路径
    const parts = normalizedPath.split('/').filter(p => p);
    if (parts.length <= depth) {
      return parts.join('/');
    }
    return parts.slice(-depth).join('/');
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto space-y-1 mb-2">
        {output.map((line: TerminalLine, i: number) => (
          <div key={i} className={`${line.type === 'error' ? 'text-red-400' : line.type === 'command' ? 'text-green-400 font-bold' : 'text-gray-300'} whitespace-pre-wrap break-all`}>
            {line.text}
          </div>
        ))}
        {isLoading && <div className="text-gray-500">Processing...</div>}
        <div ref={bottomRef} />
      </div>
      
      <div className="flex flex-col border-t border-gray-700 pt-2">
        {currentDir && (
          <div className="text-xs text-blue-400 mb-1 px-1 flex items-center gap-2" title={currentDir}>
            <span className="text-gray-500">📁</span>
            <span className="truncate">{getShortPath(currentDir)}</span>
          </div>
        )}
        <div className="flex items-center">
          <span className="text-green-400 mr-2">$</span>
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-600"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder="Enter command..."
          />
        </div>
      </div>
    </div>
  );
}

export default App;
