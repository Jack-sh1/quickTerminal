import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PerformanceMonitor } from './PerformanceMonitor';

interface CommandLog {
  timestamp: number;
  command: string;
  directory: string;
  duration: number; // 毫秒
  success: boolean;
  outputLines: number;
}

interface PerformanceMetrics {
  totalCommands: number;
  totalTime: number;
  averageTime: number;
  slowestCommand: string;
  fastestCommand: string;
  commandFrequency: { [key: string]: number };
}

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
  
  // ✅ 新增：命令历史状态
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState(''); // 暂存当前输入

  // ✅ 新增：日志状态
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [commandStartTime, setCommandStartTime] = useState<number>(0);
  const [showPerfMonitor, setShowPerfMonitor] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ✅ 加载命令历史和日志
  useEffect(() => {
    const savedHistory = localStorage.getItem('commandHistory');
    if (savedHistory) {
      try {
        setCommandHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load command history:', e);
      }
    }

    const savedLogs = localStorage.getItem('commandLogs');
    if (savedLogs) {
      try {
        setCommandLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Failed to load logs:', e);
      }
    }
  }, []);

  // ✅ 保存命令历史
  useEffect(() => {
    if (commandHistory.length > 0) {
      localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
    }
  }, [commandHistory]);

  // ✅ 保存日志
  useEffect(() => {
    if (commandLogs.length > 0) {
      // 只保留最近 1000 条
      const recentLogs = commandLogs.slice(-1000);
      localStorage.setItem('commandLogs', JSON.stringify(recentLogs));
    }
  }, [commandLogs]);

  // ✅ 记录命令日志
  const logCommand = (
    command: string,
    success: boolean,
    outputLines: number
  ) => {
    const duration = Date.now() - commandStartTime;
    
    const log: CommandLog = {
      timestamp: Date.now(),
      command,
      directory: currentDir,
      duration,
      success,
      outputLines,
    };

    setCommandLogs(prev => [...prev, log]);
  };

  // ✅ 计算统计数据
  const calculateStats = (logs: CommandLog[]): PerformanceMetrics => {
    if (logs.length === 0) {
      return {
        totalCommands: 0,
        totalTime: 0,
        averageTime: 0,
        slowestCommand: 'N/A',
        fastestCommand: 'N/A',
        commandFrequency: {},
      };
    }

    const totalCommands = logs.length;
    const totalTime = logs.reduce((sum, log) => sum + log.duration, 0);
    const averageTime = totalTime / totalCommands;

    const sortedByDuration = [...logs].sort((a, b) => b.duration - a.duration);
    const slowest = sortedByDuration[0];
    const fastest = sortedByDuration[sortedByDuration.length - 1];
    
    const slowestCommand = `${slowest.command} (${slowest.duration}ms)`;
    const fastestCommand = `${fastest.command} (${fastest.duration}ms)`;

    const commandFrequency: { [key: string]: number } = {};
    logs.forEach(log => {
      const baseCmd = log.command.split(' ')[0];
      commandFrequency[baseCmd] = (commandFrequency[baseCmd] || 0) + 1;
    });

    return {
      totalCommands,
      totalTime,
      averageTime,
      slowestCommand,
      fastestCommand,
      commandFrequency,
    };
  };

  // ✅ 格式化统计输出
  const formatStats = (stats: PerformanceMetrics): string => {
    const topCommands = Object.entries(stats.commandFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cmd, count]) => `  ${cmd}: ${count} times`)
      .join('\n');

    return `
Performance Statistics
━━━━━━━━━━━━━━━━━━━━━━

Total Commands: ${stats.totalCommands}
Total Time: ${(stats.totalTime / 1000).toFixed(2)}s
Average Time: ${stats.averageTime.toFixed(2)}ms

Slowest Command: ${stats.slowestCommand}
Fastest Command: ${stats.fastestCommand}

Top Commands:
${topCommands}
    `.trim();
  };

  // ✅ 格式化日志输出
  const formatLogs = (logs: CommandLog[]): string => {
    return logs.map(log => {
      const date = new Date(log.timestamp);
      const timeStr = date.toLocaleTimeString();
      const status = log.success ? '✓' : '✗';
      const duration = `${log.duration}ms`;
      
      return `${status} [${timeStr}] ${log.command} (${duration})`;
    }).join('\n');
  };

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
          command: 'cd ~ && pwd' 
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

  // ✅ 获取目录图标的函数
  const getDirectoryIcon = (path: string): string => {
    if (!path) return '🏠';
    
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    const dirName = parts.pop()?.toLowerCase() || '';
    
    // 目录图标映射
    const iconMap: { [key: string]: string } = {
      // 主要系统目录
      'desktop': '🖥️',
      'documents': '📄',
      'downloads': '⬇️',
      'pictures': '🖼️',
      'photos': '📷',
      'music': '🎵',
      'movies': '🎬',
      'videos': '🎥',
      'applications': '📦',
      'library': '📚',
      'public': '🌐',
      
      // 开发相关
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
      
      // 其他
      'trash': '🗑️',
      'archive': '📦',
      'temp': '⏳',
      'backup': '💾',
    };
    
    // 检查是否是主目录
    const homeMatch = normalizedPath.match(/^(\/Users\/[^\/]+|\/home\/[^\/]+|C:\/Users\/[^\/]+)/);
    if (homeMatch && normalizedPath === homeMatch[0]) {
      return '🏠';
    }
    
    return iconMap[dirName] || '📁';
  };

  // ✅ 路径美化函数：显示图标 + 最后一个目录名或 ~
  const getDisplayPath = (path: string) => {
    if (!path) return '🏠 ~';
    
    // 统一路径格式
    const normalizedPath = path.replace(/\\/g, '/');
    
    // 检查是否是主目录
    const homeMatch = normalizedPath.match(/^(\/Users\/[^\/]+|\/home\/[^\/]+|C:\/Users\/[^\/]+)/);
    const homeDir = homeMatch ? homeMatch[0] : '';
    
    const icon = getDirectoryIcon(normalizedPath);
    
    // 如果正好是主目录，显示图标 + ~
    if (homeDir && normalizedPath === homeDir) {
      return `${icon} ~`;
    }
    
    // 其他情况显示图标 + 最后一个目录名
    const parts = normalizedPath.split('/').filter(p => p);
    const dirName = parts[parts.length - 1] || '/';
    
    return `${icon} ${dirName}`;
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

    // ✅ 记录开始时间
    setCommandStartTime(Date.now());

    // ✅ 添加到历史（在执行前）
    addToHistory(trimmedCmd);

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
      const outputBeforeCount = output.length;
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
            logCommand(trimmedCmd, false, 1);
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
        
        // ✅ 记录性能
        logCommand(trimmedCmd, true, 1);
      } catch (error) {
        setOutput((prev: TerminalLine[]) => [...prev, { 
          type: 'error', 
          text: `cd: ${targetDir}: No such file or directory` 
        }]);
        setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
        
        // ✅ 记录性能 (失败)
        logCommand(trimmedCmd, false, 1);
      }
      return;
    }

    // 处理 clear 命令
    if (trimmedCmd === 'clear') {
      setOutput([]);
      setInput('');
      logCommand(trimmedCmd, true, 0);
      return;
    }

    // ✅ stats 命令 - 显示统计
    if (trimmedCmd === 'stats' || trimmedCmd === 'performance') {
      setOutput((prev: TerminalLine[]) => [...prev, { 
        type: 'command', 
        text: cmd,
        meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
      } as any]);
      
      const stats = calculateStats(commandLogs);
      
      setOutput((prev: TerminalLine[]) => [...prev, {
        type: 'output',
        text: formatStats(stats)
      }]);
      
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      setInput('');
      logCommand(trimmedCmd, true, 1);
      return;
    }

    // ✅ logs 命令 - 显示最近日志
    if (trimmedCmd.startsWith('logs')) {
      const parts = trimmedCmd.split(' ');
      const count = parts[1] ? parseInt(parts[1]) : 20;
      
      setOutput((prev: TerminalLine[]) => [...prev, { 
        type: 'command', 
        text: cmd,
        meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
      } as any]);
      
      const recentLogs = commandLogs.slice(-count);
      
      setOutput((prev: TerminalLine[]) => [...prev, {
        type: 'output',
        text: formatLogs(recentLogs)
      }]);
      
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      setInput('');
      logCommand(trimmedCmd, true, 1);
      return;
    }

    // ✅ export 命令 - 导出日志
    if (trimmedCmd === 'export logs' || trimmedCmd === 'export-logs') {
      setOutput((prev: TerminalLine[]) => [...prev, { 
        type: 'command', 
        text: cmd,
        meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
      } as any]);
      
      try {
        const logData = JSON.stringify(commandLogs, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-logs-${Date.now()}.json`;
        a.click();
        
        setOutput((prev: TerminalLine[]) => [...prev, {
          type: 'output',
          text: `Exported ${commandLogs.length} logs`
        }]);
      } catch (e) {
        setOutput((prev: TerminalLine[]) => [...prev, {
          type: 'error',
          text: 'Failed to export logs'
        }]);
      }
      
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      setInput('');
      logCommand(trimmedCmd, true, 1);
      return;
    }

    // ✅ history 命令 - 显示历史
    if (trimmedCmd === 'history') {
      setOutput((prev: TerminalLine[]) => [...prev, { 
        type: 'command', 
        text: cmd,
        meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
      } as any]);
      
      setOutput((prev: TerminalLine[]) => [...prev, {
        type: 'output',
        text: commandHistory.map((c, i) => `${String(i + 1).padStart(3, ' ')}  ${c}`).join('\n')
      }]);
      
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      setInput('');
      logCommand(trimmedCmd, true, 1);
      return;
    }

    // ✅ 智能路径检测 (方案 3)
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
        await updateGitBranch(newDir);
        
        // 记录输入的跳转命令并添加空行
        setOutput((prev: TerminalLine[]) => [...prev, { 
          type: 'command', 
          text: cmd,
          meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
        } as any, { type: 'output', text: '' }]);
        
        setInput('');
        logCommand(trimmedCmd, true, 1);
        return;
      } catch (e) {
        // 不是目录或跳转失败，继续作为普通命令执行
      }
    }
    
    setIsLoading(true);
    setOutput((prev: TerminalLine[]) => [...prev, { 
      type: 'command', 
      text: cmd,
      meta: { dir: getDisplayPath(currentDir), branch: gitBranch }
    } as any]);
    
    const outputBeforeCount = output.length;
    try {
      const fullCmd = currentDir ? `cd "${currentDir}" && ${trimmedCmd}` : trimmedCmd;
      const result = await invoke<string>('execute_command', { command: fullCmd });
      if (result) {
        setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: stripAnsi(result) }]);
      }
      // 每个命令后添加空行
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      
      const outputAfterCount = output.length;
      logCommand(trimmedCmd, true, outputAfterCount - outputBeforeCount);
    } catch (e) {
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'error', text: String(e) }]);
      setOutput((prev: TerminalLine[]) => [...prev, { type: 'output', text: '' }]);
      logCommand(trimmedCmd, false, 0);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter - 执行命令
    if (e.key === 'Enter') {
      executeCommand(input);
      return;
    }
    
    // Ctrl+L - 清屏
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([]);
      return;
    }

    // Ctrl+P - 切换性能监控
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      setShowPerfMonitor(prev => !prev);
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

    // ✅ 任何其他按键（除了上下箭头）如果是在浏览历史中，则视为修改命令
    // 这里不需要显式重置 historyIndex，因为 onChange 会触发 setInput，
    // 而用户通常是在浏览到某个历史命令后直接修改它。
    // 但如果用户按了其他功能键，我们可以重置。
  };

  return (
    <div className="h-screen bg-[#1e2a3a] text-gray-100 p-4 font-mono text-sm overflow-hidden flex flex-col relative">
      {/* 性能监控面板 */}
      <PerformanceMonitor logs={commandLogs} show={showPerfMonitor} />

      <div className="flex-1 overflow-auto mb-2 pr-2 select-text">
        {output.map((line: TerminalLine, i: number) => (
          <div key={i} className="mb-1">
            {line.type === 'command' && (
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold select-none">{line.meta?.dir}</span>
                {line.meta?.branch && (
                  <span className="text-purple-400 select-none">({line.meta.branch})</span>
                )}
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
        {isLoading && <div className="text-gray-500 animate-pulse select-none">...</div>}
        <div ref={bottomRef} />
      </div>
      
      <div className="flex flex-col border-t border-gray-600 pt-3 select-none">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">{getDisplayPath(currentDir)}</span>
          {gitBranch && (
            <span className="text-purple-400">({gitBranch})</span>
          )}
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setInput(e.target.value);
              if (historyIndex !== -1) {
                setHistoryIndex(-1);
              }
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder="Type a command..."
          />
        </div>
      </div>
    </div>
  );
}

export default App;
