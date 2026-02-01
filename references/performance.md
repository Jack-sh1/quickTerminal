# 终端日志和性能监控系统

## 目标

1. 记录命令执行时间
2. 记录用户使用情况
3. 性能分析
4. 日志查看

## 实现方案

### 方案 1：基础日志系统（推荐）⭐

#### 1. 添加日志状态和工具函数

```tsx
// App.tsx

interface CommandLog {
  timestamp: number;
  command: string;
  directory: string;
  duration: number;  // 毫秒
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

export default function App() {
  // ... 现有状态
  
  // ✅ 新增：日志状态
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [commandStartTime, setCommandStartTime] = useState<number>(0);

  // ✅ 加载历史日志
  useEffect(() => {
    const savedLogs = localStorage.getItem('commandLogs');
    if (savedLogs) {
      try {
        setCommandLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Failed to load logs:', e);
      }
    }
  }, []);

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

    // ✅ 发送到后端（可选）
    // sendLogToServer(log);
  };

  // ... 现有代码
}
```

#### 2. 修改 executeCommand 记录性能

```tsx
const executeCommand = async (cmd: string) => {
  if (!cmd.trim()) return;

  let trimmedCmd = cmd.trim();
  
  // ✅ 记录开始时间
  setCommandStartTime(Date.now());

  // ... 别名、快捷命令等处理

  setOutput(prev => [...prev, { type: 'input', text: cmd }]);
  setInput('');
  setIsLoading(true);

  const outputBeforeCount = output.length;

  try {
    const fullCmd = currentDir 
      ? `cd "${currentDir}" && ${trimmedCmd}` 
      : trimmedCmd;
    
    if (needsStreaming(trimmedCmd)) {
      await invoke('execute_command_stream', { command: fullCmd });
    } else {
      const result = await invoke<string>('execute_command', { 
        command: fullCmd 
      });
      
      const cleanResult = stripAnsi(result || '');
      if (cleanResult) {
        setOutput(prev => [...prev, { type: 'output', text: cleanResult }]);
      }
      setIsLoading(false);
    }
    
    // ✅ 记录成功
    const outputAfterCount = output.length;
    logCommand(trimmedCmd, true, outputAfterCount - outputBeforeCount);
    
  } catch (error) {
    setOutput(prev => [...prev, { type: 'error', text: String(error) }]);
    setIsLoading(false);
    
    // ✅ 记录失败
    logCommand(trimmedCmd, false, 0);
  }
};
```

#### 3. 添加统计分析命令

```tsx
const executeCommand = async (cmd: string) => {
  // ... 现有代码

  // ✅ stats 命令 - 显示统计
  if (trimmedCmd === 'stats' || trimmedCmd === 'performance') {
    setOutput(prev => [...prev, { type: 'input', text: cmd }]);
    
    const stats = calculateStats(commandLogs);
    
    setOutput(prev => [...prev, {
      type: 'output',
      text: formatStats(stats)
    }]);
    
    setInput('');
    return;
  }

  // ✅ logs 命令 - 显示最近日志
  if (trimmedCmd.startsWith('logs')) {
    const parts = trimmedCmd.split(' ');
    const count = parts[1] ? parseInt(parts[1]) : 20;
    
    setOutput(prev => [...prev, { type: 'input', text: cmd }]);
    
    const recentLogs = commandLogs.slice(-count);
    
    setOutput(prev => [...prev, {
      type: 'output',
      text: formatLogs(recentLogs)
    }]);
    
    setInput('');
    return;
  }

  // ... 其他命令处理
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
  const slowestCommand = `${sortedByDuration[0].command} (${sortedByDuration[0].duration}ms)`;
  const fastestCommand = `${sortedByDuration[sortedByDuration.length - 1].command} (${sortedByDuration[sortedByDuration.length - 1].duration}ms)`;

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
```

### 方案 2：详细性能监控面板

#### 创建性能监控组件

```tsx
// PerformanceMonitor.tsx

import { useState, useEffect } from 'react';

interface PerformanceData {
  cpuUsage: number;
  memoryUsage: number;
  commandsPerMinute: number;
  averageResponseTime: number;
}

export const PerformanceMonitor: React.FC<{
  logs: CommandLog[];
  show: boolean;
}> = ({ logs, show }) => {
  const [perfData, setPerfData] = useState<PerformanceData>({
    cpuUsage: 0,
    memoryUsage: 0,
    commandsPerMinute: 0,
    averageResponseTime: 0,
  });

  useEffect(() => {
    // 计算最近一分钟的命令数
    const oneMinuteAgo = Date.now() - 60000;
    const recentLogs = logs.filter(log => log.timestamp > oneMinuteAgo);
    const commandsPerMinute = recentLogs.length;

    // 计算平均响应时间
    const avgTime = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length
      : 0;

    setPerfData({
      cpuUsage: 0, // 需要后端支持
      memoryUsage: (performance as any).memory?.usedJSHeapSize / 1048576 || 0,
      commandsPerMinute,
      averageResponseTime: avgTime,
    });
  }, [logs]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-gray-800 border border-gray-600 rounded p-4 text-xs font-mono">
      <div className="text-green-400 font-bold mb-2">Performance Monitor</div>
      
      <div className="space-y-1">
        <div>Memory: {perfData.memoryUsage.toFixed(2)} MB</div>
        <div>Cmd/min: {perfData.commandsPerMinute}</div>
        <div>Avg Time: {perfData.averageResponseTime.toFixed(0)}ms</div>
        <div>Total Logs: {logs.length}</div>
      </div>
    </div>
  );
};
```

#### 在 App.tsx 中使用

```tsx
import { PerformanceMonitor } from './PerformanceMonitor';

export default function App() {
  const [showPerfMonitor, setShowPerfMonitor] = useState(false);

  // Ctrl+P 切换性能监控
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowPerfMonitor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="h-screen bg-[#1e2a3a] text-gray-100 flex flex-col font-mono">
      {/* 性能监控面板 */}
      <PerformanceMonitor logs={commandLogs} show={showPerfMonitor} />
      
      {/* 终端内容 */}
      {/* ... */}
    </div>
  );
}
```

### 方案 3：导出日志到文件

```tsx
// ✅ export 命令 - 导出日志
if (trimmedCmd === 'export logs' || trimmedCmd === 'export-logs') {
  setOutput(prev => [...prev, { type: 'input', text: cmd }]);
  
  try {
    const logData = JSON.stringify(commandLogs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-logs-${Date.now()}.json`;
    a.click();
    
    setOutput(prev => [...prev, {
      type: 'output',
      text: `Exported ${commandLogs.length} logs`
    }]);
  } catch (e) {
    setOutput(prev => [...prev, {
      type: 'error',
      text: 'Failed to export logs'
    }]);
  }
  
  setInput('');
  return;
}
```

### 方案 4：发送日志到服务器（可选）

```tsx
// ✅ 发送日志到后端
const sendLogToServer = async (log: CommandLog) => {
  try {
    await fetch('https://your-api.com/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: getUserId(), // 匿名 ID
        log,
      }),
    });
  } catch (e) {
    // 静默失败，不影响用户体验
    console.error('Failed to send log:', e);
  }
};

// ✅ 生成匿名用户 ID
const getUserId = (): string => {
  let userId = localStorage.getItem('anonymousUserId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('anonymousUserId', userId);
  }
  return userId;
};
```

### 方案 5：Rust 后端日志

在 `main.rs` 中添加日志：

```rust
use std::fs::OpenOptions;
use std::io::Write;

#[tauri::command]
fn log_command(command: String, duration: u64, success: bool) -> Result<(), String> {
    let log_entry = format!(
        "[{}] {} - {}ms - {}\n",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        command,
        duration,
        if success { "SUCCESS" } else { "FAILED" }
    );

    let log_path = dirs::home_dir()
        .unwrap()
        .join(".terminal_logs.txt");

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| e.to_string())?;

    file.write_all(log_entry.as_bytes())
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

添加依赖到 `Cargo.toml`：

```toml
[dependencies]
chrono = "0.4"
dirs = "5.0"
```

## 使用示例

### 查看统计

```bash
~ stats
Performance Statistics
━━━━━━━━━━━━━━━━━━━━━━

Total Commands: 156
Total Time: 45.23s
Average Time: 290.06ms

Slowest Command: npm install (12543ms)
Fastest Command: ls (12ms)

Top Commands:
  ls: 45 times
  cd: 32 times
  git: 18 times
  npm: 12 times
```

### 查看最近日志

```bash
~ logs 10
✓ [14:23:45] ls (15ms)
✓ [14:23:50] cd Desktop (8ms)
✓ [14:24:01] pwd (10ms)
✗ [14:24:15] npm start (145ms)
✓ [14:24:30] git status (234ms)
```

### 导出日志

```bash
~ export logs
Exported 156 logs
```

### 切换性能监控

按 `Ctrl+P` 显示/隐藏右上角的性能面板。

## 命令总结

| 命令 | 功能 |
|------|------|
| `stats` | 显示性能统计 |
| `performance` | 同 stats |
| `logs [count]` | 显示最近的日志（默认 20 条） |
| `export logs` | 导出日志到 JSON 文件 |
| `Ctrl+P` | 切换性能监控面板 |

## 日志文件位置

### 本地存储（localStorage）
- 浏览器开发工具 → Application → Local Storage
- Key: `commandLogs`

### 文件日志（如果实现）
- macOS/Linux: `~/.terminal_logs.txt`
- Windows: `C:\Users\YourName\.terminal_logs.txt`

## 隐私保护

### 匿名化

```tsx
const anonymizeCommand = (cmd: string): string => {
  // 移除敏感信息
  return cmd
    .replace(/password=\S+/g, 'password=***')
    .replace(/token=\S+/g, 'token=***')
    .replace(/api[_-]?key=\S+/gi, 'api_key=***');
};
```

### 本地优先

```tsx
// 只在用户同意后才发送
const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

if (analyticsEnabled) {
  sendLogToServer(log);
}
```

## 性能优化

### 1. 限制日志数量

```tsx
// 只保留最近 1000 条
const recentLogs = commandLogs.slice(-1000);
```

### 2. 批量保存

```tsx
// 每 10 条保存一次
useEffect(() => {
  if (commandLogs.length % 10 === 0) {
    localStorage.setItem('commandLogs', JSON.stringify(commandLogs));
  }
}, [commandLogs]);
```

### 3. 异步日志

```tsx
const logCommand = async (log: CommandLog) => {
  // 不阻塞 UI
  setTimeout(() => {
    setCommandLogs(prev => [...prev, log]);
  }, 0);
};
```

## 分析工具

### 查看哪些命令最慢

```tsx
const slowestCommands = commandLogs
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 10);
```

### 查看使用时间分布

```tsx
const getUsageByHour = (logs: CommandLog[]) => {
  const hours: { [hour: number]: number } = {};
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });
  return hours;
};
```

---

**现在你可以完整追踪终端的使用情况和性能了！** 📊

- ✅ 命令执行时间
- ✅ 使用统计
- ✅ 性能监控
- ✅ 日志导出
- ✅ 隐私保护