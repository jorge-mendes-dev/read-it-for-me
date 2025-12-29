// Build script for Firefox version
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🦊 Building Firefox version...\n');

// Step 1: Create temporary Firefox source files
console.log('📝 Creating Firefox-specific source files...');

const files = [
  'src/background/background.ts',
  'src/content/content.ts',
  'src/content/floatingPlayer.ts',
  'src/popup/App.tsx',
  'src/utils/i18n.ts'
];

const backups = [];

files.forEach(file => {
  const filePath = path.join(path.dirname(__dirname), file);
  const backupPath = filePath + '.chrome-backup';
  
  // Backup original
  fs.copyFileSync(filePath, backupPath);
  backups.push({ original: filePath, backup: backupPath });
  
  // Replace chrome with browser
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/chrome\./g, 'browser.');
  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('✅ Firefox source files created\n');

// Step 2: Build
console.log('🔨 Running build...');
try {
  // Skip TypeScript checking for Firefox build, just use Vite
  execSync('node_modules\\.bin\\vite.cmd build', { 
    stdio: 'inherit',
    shell: true 
  });
} catch (error) {
  console.error('❌ Build failed');
  // Restore backups
  backups.forEach(({ original, backup }) => {
    fs.copyFileSync(backup, original);
    fs.unlinkSync(backup);
  });
  process.exit(1);
}

console.log('✅ Build completed\n');

// Step 3: Restore original files
console.log('🔄 Restoring Chrome source files...');
backups.forEach(({ original, backup }) => {
  fs.copyFileSync(backup, original);
  fs.unlinkSync(backup);
});
console.log('✅ Chrome source files restored\n');

// Step 4: Replace manifest
console.log('📋 Replacing with Firefox manifest...');
const manifestSrc = path.join(path.dirname(__dirname), 'public', 'manifest-firefox.json');
const manifestDest = path.join(path.dirname(__dirname), 'dist', 'manifest.json');
fs.copyFileSync(manifestSrc, manifestDest);
console.log('✅ Firefox manifest installed\n');

// Step 5: Create Firefox dist folder
console.log('📦 Creating Firefox distribution...');
const firefoxDist = path.join(path.dirname(__dirname), 'dist-firefox');

// Remove old firefox dist if exists
if (fs.existsSync(firefoxDist)) {
  fs.rmSync(firefoxDist, { recursive: true });
}

// Copy dist to dist-firefox
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(path.join(path.dirname(__dirname), 'dist'), firefoxDist);
console.log('✅ Firefox distribution created in dist-firefox/\n');

// Step 6: Restore Chrome manifest in dist
console.log('🔄 Restoring Chrome manifest in dist...');
const chromeManifestSrc = path.join(path.dirname(__dirname), 'public', 'manifest.json');
const chromeManifestDest = path.join(path.dirname(__dirname), 'dist', 'manifest.json');
fs.copyFileSync(chromeManifestSrc, chromeManifestDest);
console.log('✅ Chrome manifest restored in dist/\n');

console.log('🎉 Firefox build complete!\n');
console.log('📂 Chrome/Edge: dist/');
console.log('📂 Firefox: dist-firefox/');
console.log('🔧 Load in Firefox: about:debugging#/runtime/this-firefox\n');
