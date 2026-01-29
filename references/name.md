# Terminal MVP Quick Reference

## Quick Start Commands

```bash
# Create new project
bash scripts/create_terminal_mvp.sh my-terminal

# Navigate to project
cd my-terminal

# Install dependencies (if not auto-installed)
npm install

# Start development
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Project Structure

```
my-terminal/
├── src/
│   ├── App.tsx           # Main terminal component
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind imports
├── src-tauri/
│   ├── src/
│   │   └── main.rs       # Rust backend
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── package.json          # Node dependencies
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
└── tsconfig.json         # TypeScript configuration
```

## Key Files

### Frontend: src/App.tsx

Main terminal UI component:
- Displays output lines
- Handles user input
- Executes commands via Tauri
- Manages loading state

### Backend: src-tauri/src/main.rs

Rust command executor:
- `execute_command` - Runs shell commands
- Returns stdout or stderr
- Cross-platform (Windows/macOS/Linux)

## Common Tasks

### Test Command Execution

**Windows:**
```
dir
echo Hello
whoami
date /t
```

**macOS/Linux:**
```
ls
echo Hello
whoami
pwd
date
```

### Add New Tauri Command

1. Add Rust function:
```rust
#[tauri::command]
fn my_command(param: String) -> Result<String, String> {
    Ok(format!("Received: {}", param))
}
```

2. Register in main:
```rust
.invoke_handler(tauri::generate_handler![
    execute_command,
    my_command  // Add here
])
```

3. Call from frontend:
```typescript
const result = await invoke<string>('my_command', { param: 'value' });
```

### Modify UI Colors

Edit `src/App.tsx`:
```tsx
// Change background
<div className="h-screen bg-gray-900"> // Change bg-gray-900

// Change input color
<span className="text-green-400">$</span> // Change text-green-400

// Change error color
${line.type === 'error' ? 'text-red-400' : ''} // Change text-red-400
```

### Change Window Size

Edit `src-tauri/tauri.conf.json`:
```json
{
  "app": {
    "windows": [{
      "width": 800,      // Change width
      "height": 600,     // Change height
      "minWidth": 600,   // Minimum width
      "minHeight": 400   // Minimum height
    }]
  }
}
```

### Add Dependencies

**Frontend:**
```bash
npm install <package-name>
```

**Backend (Rust):**
Edit `src-tauri/Cargo.toml`:
```toml
[dependencies]
tauri = { version = "2.0", features = [] }
# Add new dependency
serde = { version = "1", features = ["derive"] }
```

## Development Workflow

```
Edit Code → Save → Auto-Reload
   ↓
Test in Dev Mode
   ↓
Build for Production
   ↓
Distribute
```

## Debugging

### Frontend Errors

Open DevTools in running app:
- **Windows/Linux**: F12 or Ctrl+Shift+I
- **macOS**: Cmd+Option+I

### Backend Errors

Check terminal output where you ran `npm run tauri:dev`

### Build Errors

```bash
# Clean build
rm -rf node_modules dist src-tauri/target
npm install
npm run tauri:build
```

## Performance Tips

1. **Limit output lines** to 1000
2. **Use React.memo** for output lines
3. **Debounce** rapid updates
4. **Virtual scrolling** for long outputs

## File Sizes

- **Development**: ~200MB (with dependencies)
- **Production Build**: 5-10MB (platform-specific)
- **Runtime Memory**: 50-100MB

## Build Output Locations

After `npm run tauri:build`:

- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `appimage/`

## Common Issues

### "Command not found"
- Verify shell path in main.rs
- Try absolute command paths
- Check PATH environment variable

### Tailwind not working
```bash
npm list tailwindcss  # Should show 3.4.17
npm install --save-dev tailwindcss@3.4.17
```

### Build fails
```bash
# Update Rust
rustup update

# Check Tauri CLI
npm run tauri info

# Clean and rebuild
rm -rf src-tauri/target
npm run tauri:build
```

### Window won't open
- Check tauri.conf.json
- Verify Vite server is running
- Check terminal for error messages

## Keyboard Shortcuts (Default)

| Shortcut | Action |
|----------|--------|
| Enter | Execute command |
| Ctrl+C | Copy (OS default) |
| Ctrl+V | Paste (OS default) |
| F12 | Open DevTools |

## Configuration Reference

### package.json
- Scripts: dev, build, tauri commands
- Dependencies: React, Tauri API
- DevDependencies: TypeScript, Vite, Tailwind

### vite.config.ts
- Port: 1420
- React plugin
- Dev server settings

### tailwind.config.js
- Content paths
- Theme extensions
- Plugins

### tsconfig.json
- TypeScript compiler options
- Strict mode enabled
- React JSX transform

### tauri.conf.json
- App name and version
- Window configuration
- Build commands
- Security settings

## Next Steps

After your MVP is working:

1. ✅ Verify basic commands work
2. ✅ Test on target platforms
3. ⬜ Add command history (see extensions.md)
4. ⬜ Implement clear button
5. ⬜ Add ANSI color support
6. ⬜ Create multiple tabs
7. ⬜ Integrate real PTY

See `references/extensions.md` for detailed implementation guides.

## Getting Help

- **Tauri Discord**: https://discord.gg/tauri
- **GitHub Issues**: Create issues for bugs
- **Documentation**: https://tauri.app/
- **Stack Overflow**: Tag with `tauri`, `rust`, `react`

## Useful Commands Reference

### Development
```bash
npm run dev               # Vite dev server only
npm run tauri:dev         # Full Tauri dev mode
npm run build             # Build frontend
npm run tauri:build       # Build complete app
```

### Maintenance
```bash
npm update                # Update packages
npm audit fix             # Fix vulnerabilities
npm run lint              # Run linter (if configured)
```

### Tauri CLI
```bash
npm run tauri info        # Show environment info
npm run tauri icon        # Generate app icons
npm run tauri signer      # Code signing tools
```

## Environment Variables

```bash
# Development
TAURI_SKIP_DEVSERVER_CHECK=true  # Skip dev server check
TAURI_DEBUG=1                     # Enable debug mode

# Build
TAURI_PRIVATE_KEY=path/to/key    # For signing
TAURI_KEY_PASSWORD=password      # Key password
```

## Tips

1. **Start simple** - Get MVP working first
2. **Test frequently** - Run tauri:dev after changes
3. **Read errors** - Terminal output is helpful
4. **Use DevTools** - Inspect frontend issues
5. **Check docs** - Tauri docs are comprehensive
6. **Ask community** - Discord is very active

## Minimum Requirements

- **Node.js**: 18+ 
- **Rust**: 1.70+
- **OS**: 
  - Windows 10+
  - macOS 10.15+
  - Linux (modern distro)