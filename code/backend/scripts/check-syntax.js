const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const workspaceRoot = path.join(backendRoot, '..');
const targets = [
  path.join(backendRoot, 'src'),
  path.join(backendRoot, 'setup-env.js'),
  path.join(workspaceRoot, 'app')
];

function collectJavaScriptFiles(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    return targetPath.endsWith('.js') ? [targetPath] : [];
  }

  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(entryPath);
    }

    return entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

const filesToCheck = targets.flatMap(collectJavaScriptFiles);
let hasError = false;

for (const filePath of filesToCheck) {
  try {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  } catch (error) {
    hasError = true;
    const relativePath = path.relative(workspaceRoot, filePath);
    const stderr = error.stderr ? error.stderr.toString().trim() : error.message;
    console.error(`Syntax check failed for ${relativePath}`);
    console.error(stderr);
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Syntax check passed for ${filesToCheck.length} JavaScript file(s).`);