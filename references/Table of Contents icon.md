# 添加目录图标显示功能

## 目标效果

```
~ cd ~/Desktop
📁 Desktop ls
file1  file2

📁 Desktop cd Documents
📄 Documents 
```

不同目录显示不同图标。

## 实现方案

### 方案 1：使用 Emoji 图标（最简单）

#### 修改 `App.tsx`

```tsx
// ✅ 添加获取目录图标的函数
const getDirectoryIcon = (path: string): string => {
  if (!path) return '~';
  
  const dirName = path.split('/').filter(Boolean).pop()?.toLowerCase() || '';
  
  // 目录图标映射
  const iconMap: { [key: string]: string } = {
    // 系统目录
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
    'code': '💻',
    'src': '📂',
    'node_modules': '📦',
    'dist': '📤',
    'build': '🔨',
    '.git': '🌿',
    
    // 其他
    'trash': '🗑️',
    'archive': '📦',
    'temp': '⏳',
  };
  
  return iconMap[dirName] || '📁';
};

// ✅ 修改 getDisplayPath 函数
const getDisplayPath = (path: string) => {
  if (!path) return '~';
  
  const homeDirMatch = path.match(/^\/Users\/[^\/]+/) || 
                       path.match(/^\/home\/[^\/]+/) ||
                       path.match(/^C:\\Users\\[^\\]+/);
  const homeDir = homeDirMatch ? homeDirMatch[0] : '';
  
  if (homeDir && path === homeDir) {
    return '~';
  }
  
  const parts = path.split('/').filter(p => p);
  const dirName = parts[parts.length - 1] || '/';
  
  // ✅ 返回图标 + 目录名
  const icon = getDirectoryIcon(path);
  return `${icon} ${dirName}`;
};

// 渲染部分保持不变，自动显示图标
<span className="text-green-400">{getDisplayPath(currentDir)}</span>
```

### 方案 2：使用 Lucide React 图标库（更专业）

#### 1. 安装依赖

```bash
pnpm add lucide-react
```

#### 2. 创建图标组件

```tsx
import { 
  FolderIcon, 
  MonitorIcon, 
  FileTextIcon, 
  DownloadIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
  CodeIcon,
  PackageIcon,
  HomeIcon,
  TerminalIcon
} from 'lucide-react';

// ✅ 图标组件映射
const DirectoryIcon: React.FC<{ path: string }> = ({ path }) => {
  const dirName = path.split('/').filter(Boolean).pop()?.toLowerCase() || '';
  
  const iconProps = {
    size: 16,
    className: "inline-block mr-1"
  };
  
  const iconMap: { [key: string]: JSX.Element } = {
    'desktop': <MonitorIcon {...iconProps} />,
    'documents': <FileTextIcon {...iconProps} />,
    'downloads': <DownloadIcon {...iconProps} />,
    'pictures': <ImageIcon {...iconProps} />,
    'photos': <ImageIcon {...iconProps} />,
    'music': <MusicIcon {...iconProps} />,
    'movies': <VideoIcon {...iconProps} />,
    'videos': <VideoIcon {...iconProps} />,
    'code': <CodeIcon {...iconProps} />,
    'projects': <CodeIcon {...iconProps} />,
    'src': <CodeIcon {...iconProps} />,
    'node_modules': <PackageIcon {...iconProps} />,
  };
  
  if (!path || path === '~') {
    return <HomeIcon {...iconProps} />;
  }
  
  return iconMap[dirName] || <FolderIcon {...iconProps} />;
};

// ✅ 使用组件
<span className="text-green-400 flex items-center gap-1">
  <DirectoryIcon path={currentDir} />
  {getDisplayPath(currentDir)}
</span>
```

### 方案 3：自定义 SVG 图标

```tsx
// ✅ SVG 图标组件
const DesktopIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/>
  </svg>
);

const DocumentsIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);

// ✅ 图标映射
const getDirectoryIconComponent = (path: string) => {
  const dirName = path.split('/').filter(Boolean).pop()?.toLowerCase() || '';
  
  const iconMap: { [key: string]: JSX.Element } = {
    'desktop': <DesktopIcon />,
    'documents': <DocumentsIcon />,
    // ... 其他图标
  };
  
  return iconMap[dirName] || null;
};
```

## 完整实现（方案 1 - Emoji）

```tsx
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface OutputLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>('');
  const [previousDir, setPreviousDir] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);

  // ✅ 目录图标映射
  const getDirectoryIcon = (path: string): string => {
    if (!path) return '🏠';
    
    const dirName = path.split('/').filter(Boolean).pop()?.toLowerCase() || '';
    
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
      'applications': '📱',
      'library': '📚',
      'public': '🌐',
      
      // 开发目录
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
    
    return iconMap[dirName] || '📁';
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

  useEffect(() => {
    const initDir = async () => {
      try {
        const dir = await invoke<string>('execute_command', { 
          command: 'pwd' 
        });
        const cleanDir = dir.trim().replace(/\x1B\[[0-9;]*[JKmsu]/g, '');
        setCurrentDir(cleanDir);
        setPreviousDir(cleanDir);
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
      
      const newDir = result.trim().replace(/\x1B\[[0-9;]*[JKmsu]/g, '');
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

    // 别名
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

    // 快捷命令
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

    if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
      if (!isShortcut) {
        setOutput(prev => [...prev, { type: 'input', text: cmd }]);
      }
      
      setInput('');
      
      const targetDir = trimmedCmd.substring(3).trim();
      await changeDirectory(targetDir);
      
      return;
    }

    // 智能路径检测
    const isDirPattern = /^[a-zA-Z0-9_.-]+$/.test(trimmedCmd);
    
    if (isDirPattern) {
      try {
        const testCmd = currentDir 
          ? `cd "${currentDir}" && cd "${trimmedCmd}" && pwd`
          : `cd "${trimmedCmd}" && pwd`;
        
        const result = await invoke<string>('execute_command', { 
          command: testCmd 
        });
        
        const newDir = result.trim().replace(/\x1B\[[0-9;]*[JKmsu]/g, '');
        setPreviousDir(currentDir);
        setCurrentDir(newDir);
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
      
      const cleanResult = result.replace(/\x1B\[[0-9;]*[JKmsu]/g, '') || '';
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
              <div className="text-gray-300 whitespace-pre-wrap">{line.text}</div>
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
            className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500"
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

## 图标映射表

| 目录 | 图标 | Emoji |
|------|------|-------|
| Home | 🏠 | `:house:` |
| Desktop | 🖥️ | `:desktop_computer:` |
| Documents | 📄 | `:page_facing_up:` |
| Downloads | ⬇️ | `:arrow_down:` |
| Pictures | 🖼️ | `:framed_picture:` |
| Music | 🎵 | `:musical_note:` |
| Movies | 🎬 | `:clapper:` |
| Projects | 💼 | `:briefcase:` |
| Code | 💻 | `:computer:` |
| src | 📂 | `:open_file_folder:` |
| node_modules | 📦 | `:package:` |
| 其他 | 📁 | `:file_folder:` |

## 使用效果

```bash
🏠 ~ cd Desktop
🖥️ Desktop ls
file1 file2

🖥️ Desktop cd Documents
📄 Documents pwd
/Users/you/Documents

📄 Documents cd ~/projects
💼 projects cd my-app
💼 my-app cd src
📂 src 
```

## 自定义图标

添加更多图标很简单：

```tsx
const iconMap: { [key: string]: string } = {
  // 添加你自己的目录图标
  'myfolder': '🎨',
  'work': '💼',
  'personal': '👤',
  // ...
};
```

## 可选：动态图标颜色

```tsx
<span className="text-green-400">
  <span className="text-yellow-400">{getDirectoryIcon(path)}</span>
  {' '}
  {dirName}
</span>
```

现在图标是黄色的！🎨

---

**现在每个目录都有专属图标了！** ✨

修改 `getDirectoryIcon` 函数添加图标映射即可。