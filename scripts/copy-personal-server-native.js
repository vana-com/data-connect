#!/usr/bin/env node

/**
 * beforeBundleCommand: copies personal-server native addons into the
 * Tauri bundle resource directory.
 *
 * Tauri's resource glob (dist/*) only copies files, not directories.
 * This script copies the node_modules/ directory (containing better-sqlite3
 * native addon) into the bundle's resource directory after Tauri has
 * placed the binary there.
 *
 * CWD is src-tauri/ when Tauri calls this.
 */

import { existsSync, cpSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const srcNodeModules = join(ROOT, 'personal-server', 'dist', 'node_modules');

if (!existsSync(srcNodeModules)) {
  console.log('[copy-native] No personal-server node_modules found, skipping');
  process.exit(0);
}

// Move node_modules out of dist/ so Tauri's glob doesn't choke on it
const tmpDir = join(ROOT, 'personal-server', '_node_modules_bundle');
if (!existsSync(tmpDir)) {
  cpSync(srcNodeModules, tmpDir, { recursive: true });
}

// Find the bundle resource directories where Tauri placed personal-server
const targetDir = join(ROOT, 'src-tauri', 'target');
let copied = 0;

for (const triple of readdirSync(targetDir)) {
  // Check release bundle paths
  const paths = [
    // macOS .app
    ...(() => {
      const macDir = join(targetDir, triple, 'release', 'bundle', 'macos');
      if (!existsSync(macDir)) return [];
      return readdirSync(macDir)
        .filter(f => f.endsWith('.app'))
        .map(f => join(macDir, f, 'Contents', 'Resources', 'personal-server', 'dist'));
    })(),
    // Direct resource dir (used during resource staging)
    join(targetDir, triple, 'release', 'personal-server', 'dist'),
  ];

  for (const destDir of paths) {
    if (existsSync(destDir)) {
      const dest = join(destDir, 'node_modules');
      if (!existsSync(dest)) {
        cpSync(tmpDir, dest, { recursive: true });
        console.log(`[copy-native] Copied node_modules to ${dest}`);
        copied++;
      }
    }
  }
}

if (copied === 0) {
  console.log('[copy-native] No bundle resource directories found yet');
}
