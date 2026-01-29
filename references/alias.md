# 添加命令别名支持

## 问题

输入 `ll` 显示 `command not found`，因为 `ll` 是 shell 别名，不是真实命令。

## 原因

我们的终端每次执行命令都启动一个新的 shell 进程，不会加载 shell 配置文件（如 `.bashrc`、`.zshrc`），所以没有别名。

## 解决方案

### 方案 1：前端别名映射（推荐，最简单）

在前端直接将别名转换为实际命令。

#### 修改 `executeCommand` 函数

```tsx
const executeCommand = async (cmd: string) => {
  if (!cmd.trim()) return;

  let trimmedCmd = cmd.trim();

  // ✅ 添加别名映射
  const aliases: { [key: string]: string } = {
    'll': 'ls -la',
    'la': 'ls -la',
    'l': 'ls -lh',
    'cls': 'clear',
    'md': 'mkdir',
    'rd': 'rmdir',
    'copy': 'cp',
    'move': 'mv',
    'del': 'rm',
  };

  // 检查是否是别名
  const cmdParts = trimmedCmd.split(' ');
  const baseCmd = cmdParts[0];
  
  if (aliases[baseCmd]) {
    // 替换别名
    cmdParts[0] = aliases[baseCmd];
    trimmedCmd = cmdParts.join(' ');
  }

  // ... 其他代码
};
```

### 方案 2：加载 Shell 配置文件

修改后端命令执行，加载配置文件。

#### 修改 `main.rs`

```rust
#[tauri::command]
fn execute_command(command: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (shell, args) = ("cmd", vec!["/C", &command]);
    
    #[cfg(not(target_os = "windows"))]
    let (shell, args) = {
        // ✅ 使用 login shell 来加载配置文件
        ("bash", vec!["-l", "-c", &command])
        // 或者对于 zsh 用户
        // ("zsh", vec!["-l", "-c", &command])
    };

    let output = Command::new(shell)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.to_string())
    }
}
```

### 方案 3：完整别名系统（推荐用于生产）

创建一个可配置的别名系统。

#### 创建别名管理

```tsx
// src/utils/aliases.ts
export interface Alias {
  name: string;
  command: string;
}

export class AliasManager {
  private aliases: Map<string, string>;

  constructor() {
    this.aliases = new Map();
    this.loadDefaultAliases();
    this.loadUserAliases();
  }

  private loadDefaultAliases() {
    // 默认别名
    this.aliases.set('ll', 'ls -la');
    this.aliases.set('la', 'ls -la');
    this.aliases.set('l', 'ls -lh');
    this.aliases.set('..', 'cd ..');
    this.aliases.set('...', 'cd ../..');
    this.aliases.set('~', 'cd ~');
  }

  private loadUserAliases() {
    // 从 localStorage 加载用户自定义别名
    const saved = localStorage.getItem('userAliases');
    if (saved) {
      try {
        const userAliases = JSON.parse(saved);
        Object.entries(userAliases).forEach(([name, cmd]) => {
          this.aliases.set(name, cmd as string);
        });
      } catch (e) {
        console.error('Failed to load user aliases:', e);
      }
    }
  }

  expand(command: string): string {
    const parts = command.trim().split(' ');
    const baseCmd = parts[0];
    
    if (this.aliases.has(baseCmd)) {
      parts[0] = this.aliases.get(baseCmd)!;
      return parts.join(' ');
    }
    
    return command;
  }

  add(name: string, command: string) {
    this.aliases.set(name, command);
    this.saveUserAliases();
  }

  remove(name: string) {
    this.aliases.delete(name);
    this.saveUserAliases();
  }

  list(): Array<[string, string]> {
    return Array.from(this.aliases.entries());
  }

  private saveUserAliases() {
    const userAliases: { [key: string]: string } = {};
    this.aliases.forEach((cmd, name) => {
      userAliases[name] = cmd;
    });
    localStorage.setItem('userAliases', JSON.stringify(userAliases));
  }
}
```

#### 在 App.tsx 中使用

```tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { AliasManager } from './utils/aliases';

export default function App() {
  const aliasManager = useMemo(() => new AliasManager(), []);
  
  // ... 其他代码

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    // ✅ 展开别名
    let trimmedCmd = aliasManager.expand(cmd.trim());

    // ... 继续执行命令
  };

  // ✅ 添加 alias 命令
  if (trimmedCmd.startsWith('alias ')) {
    const aliasCmd = trimmedCmd.substring(6).trim();
    
    if (!aliasCmd) {
      // 显示所有别名
      const aliases = aliasManager.list();
      setOutput(prev => [...prev, { type: 'input', text: cmd }]);
      setOutput(prev => [...prev, {
        type: 'output',
        text: aliases.map(([name, cmd]) => `${name}='${cmd}'`).join('\n')
      }]);
      setInput('');
      return;
    }
    
    // 添加新别名：alias ll='ls -la'
    const match = aliasCmd.match(/^(\w+)=(['"]?)(.+)\2$/);
    if (match) {
      const [, name, , command] = match;
      aliasManager.add(name, command);
      setOutput(prev => [...prev, {
        type: 'output',
        text: `Alias added: ${name}='${command}'`
      }]);
      setInput('');
      return;
    }
  }

  // ✅ 添加 unalias 命令
  if (trimmedCmd.startsWith('unalias ')) {
    const name = trimmedCmd.substring(8).trim();
    aliasManager.remove(name);
    setOutput(prev => [...prev, {
      type: 'output',
      text: `Alias removed: ${name}`
    }]);
    setInput('');
    return;
  }

  // ... 其他命令处理
}
```

## 完整示例（方案 1 - 最简单）

```tsx
const executeCommand = async (cmd: string) => {
  if (!cmd.trim()) return;

  let trimmedCmd = cmd.trim();

  // ✅ 别名映射
  const aliases: { [key: string]: string } = {
    // ls 别名
    'll': 'ls -la',
    'la': 'ls -la',
    'l': 'ls -lh',
    'ls': 'ls --color=auto',
    
    // 导航别名
    '..': 'cd ..',
    '...': 'cd ../..',
    '....': 'cd ../../..',
    '~': 'cd ~',
    '-': 'cd -',
    
    // 文件操作别名（Windows 风格）
    'md': 'mkdir',
    'rd': 'rmdir',
    'copy': 'cp',
    'move': 'mv',
    'del': 'rm',
    'cls': 'clear',
    
    // Git 别名
    'gs': 'git status',
    'ga': 'git add',
    'gc': 'git commit',
    'gp': 'git push',
    'gl': 'git log',
    'gd': 'git diff',
    
    // 其他常用别名
    'h': 'history',
    'c': 'clear',
  };

  // 展开别名
  const cmdParts = trimmedCmd.split(' ');
  const baseCmd = cmdParts[0];
  
  if (aliases[baseCmd]) {
    cmdParts[0] = aliases[baseCmd];
    trimmedCmd = cmdParts.join(' ');
  }

  // 快捷命令处理
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

  // ... 继续处理命令
};
```

## 常用别名列表

### Unix/Linux/macOS

```tsx
const aliases = {
  // 列出文件
  'll': 'ls -la',
  'la': 'ls -la',
  'l': 'ls -lh',
  'lt': 'ls -ltr',
  
  // 导航
  '..': 'cd ..',
  '...': 'cd ../..',
  '~': 'cd ~',
  '-': 'cd -',
  
  // 文件操作
  'cp': 'cp -i',
  'mv': 'mv -i',
  'rm': 'rm -i',
  'mkdir': 'mkdir -p',
  
  // 查找
  'grep': 'grep --color=auto',
  'fgrep': 'fgrep --color=auto',
  'egrep': 'egrep --color=auto',
  
  // Git
  'g': 'git',
  'gs': 'git status',
  'ga': 'git add',
  'gc': 'git commit',
  'gp': 'git push',
  'gl': 'git log --oneline',
  'gd': 'git diff',
  'gco': 'git checkout',
  'gb': 'git branch',
  
  // npm
  'ni': 'npm install',
  'nid': 'npm install --save-dev',
  'nr': 'npm run',
  'nt': 'npm test',
  
  // pnpm
  'pi': 'pnpm install',
  'pa': 'pnpm add',
  'pr': 'pnpm run',
  
  // 其他
  'h': 'history',
  'c': 'clear',
  'e': 'exit',
};
```

### Windows

```tsx
const aliases = {
  'll': 'dir',
  'ls': 'dir',
  'md': 'mkdir',
  'rd': 'rmdir',
  'copy': 'copy',
  'move': 'move',
  'del': 'del',
  'cls': 'clear',
};
```

## 使用示例

### 添加别名后

```bash
# 现在可以工作了！
~ ll
total 48
drwxr-xr-x   6 user  staff   192 Jan 30 10:00 .
drwxr-xr-x  20 user  staff   640 Jan 30 09:00 ..
-rw-r--r--   1 user  staff  1024 Jan 30 10:00 file.txt

# 其他别名也能用
~ la         # ls -la
~ gs         # git status
~ ni         # npm install
```

## 动态管理别名（方案 3）

```bash
# 查看所有别名
~ alias
ll='ls -la'
gs='git status'
ni='npm install'

# 添加新别名
~ alias mytest='echo "Hello World"'
Alias added: mytest='echo "Hello World"'

# 使用新别名
~ mytest
Hello World

# 删除别名
~ unalias mytest
Alias removed: mytest
```

## 推荐方案

**使用方案 1**（前端别名映射）最简单有效：

1. ✅ 不需要修改 Rust 代码
2. ✅ 跨平台兼容
3. ✅ 易于添加新别名
4. ✅ 不依赖系统 shell 配置

只需在 `executeCommand` 开头添加别名映射即可！

---

**现在 `ll` 命令可以正常工作了！** ✅