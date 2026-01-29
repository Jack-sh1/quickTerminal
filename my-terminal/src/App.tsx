import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TerminalLine {
  type: 'output' | 'error' | 'command';
  text: string;
}

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<TerminalLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    
    let trimmedCmd = cmd.trim();

    // 别名映射 (Solution 1 from alias.md)
    const aliases: { [key: string]: string } = {
      'll': 'ls -la',
      'la': 'ls -la',
      'l': 'ls -lh',
      'ls': 'ls --color=auto',
      '..': 'cd ..',
      '...': 'cd ../..',
      '~': 'cd ~',
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
    
    setIsLoading(true);
    setOutput((prev: TerminalLine[]) => [...prev, { type: 'command', text: `$ ${cmd}` }]);
    
    try {
      const result = await invoke<string>('execute_command', { command: trimmedCmd });
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: result }]);
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
      
      <div className="flex items-center border-t border-gray-700 pt-2">
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
  );
}

export default App;
