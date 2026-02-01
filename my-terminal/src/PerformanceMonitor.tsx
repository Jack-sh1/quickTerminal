import { useState, useEffect } from 'react';

interface CommandLog {
  timestamp: number;
  command: string;
  directory: string;
  duration: number; // 毫秒
  success: boolean;
  outputLines: number;
}

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
    if (!show) return;

    // 计算最近一分钟的命令数
    const oneMinuteAgo = Date.now() - 60000;
    const recentLogs = logs.filter(log => log.timestamp > oneMinuteAgo);
    const commandsPerMinute = recentLogs.length;

    // 计算平均响应时间
    const avgTime = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length
      : 0;

    // 获取内存使用情况 (Chrome/Electron/Tauri WebView 支持)
    const memory = (performance as any).memory;
    const memoryUsage = memory ? memory.usedJSHeapSize / 1048576 : 0;

    setPerfData({
      cpuUsage: 0, // 浏览器端获取 CPU 较难，需后端支持
      memoryUsage,
      commandsPerMinute,
      averageResponseTime: avgTime,
    });
  }, [logs, show]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-[#2a3b4d] border border-gray-600 rounded-lg p-4 text-xs font-mono shadow-xl z-50 select-none backdrop-blur-sm bg-opacity-90">
      <div className="text-green-400 font-bold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        PERFORMANCE MONITOR
      </div>
      
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">Memory:</span>
          <span>{perfData.memoryUsage.toFixed(2)} MB</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">Cmd/min:</span>
          <span>{perfData.commandsPerMinute}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">Avg Time:</span>
          <span className={perfData.averageResponseTime > 500 ? 'text-yellow-400' : 'text-blue-400'}>
            {perfData.averageResponseTime.toFixed(0)}ms
          </span>
        </div>
        <div className="flex justify-between gap-8 border-t border-gray-700 pt-2">
          <span className="text-gray-500">Total Logs:</span>
          <span>{logs.length}</span>
        </div>
      </div>
      
      <div className="mt-3 text-[10px] text-gray-600 italic">
        Press Ctrl+P to toggle
      </div>
    </div>
  );
};
