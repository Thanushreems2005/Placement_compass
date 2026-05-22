import fs from 'fs';
import path from 'path';

// Determine build directory (either container path or local path)
const clientDir = fs.existsSync('/usr/src/app/dist/client')
  ? '/usr/src/app/dist/client'
  : './dist/client';

const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error("Assets directory does not exist! Please run Vite build first.");
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);

// Find compiled styles
const cssFile = files.find(f => f.endsWith('.css'));
const cssRef = cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}">` : '';

// Find all candidate index scripts
const candidateJsFiles = files.filter(f => f.endsWith('.js'));

// Scan candidates to find the unique primary entry point containing React mounting code (createRoot)
let entryJsFile = null;
for (const file of candidateJsFiles) {
  const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
  if (content.includes('createRoot') || content.includes('mount(')) {
    entryJsFile = file;
    break;
  }
}

// Fallback to the largest index file if createRoot isn't explicitly matched
if (!entryJsFile && candidateJsFiles.length > 0) {
  candidateJsFiles.sort((a, b) => {
    return fs.statSync(path.join(assetsDir, b)).size - fs.statSync(path.join(assetsDir, a)).size;
  });
  entryJsFile = candidateJsFiles[0];
}

if (!entryJsFile) {
  console.error("No valid primary entry JS file found!");
  process.exit(1);
}

console.log(`Resolved primary entry point: ${entryJsFile}`);

const jsRefs = `<script type="module" src="/assets/${entryJsFile}"></script>`;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Placement Intelligence Portal</title>
    <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml">
    <meta name="description" content="AI-powered company intelligence and placement analysis platform">
    ${cssRef}
  </head>
  <body>
    <div id="root"></div>
    ${jsRefs}
  </body>
</html>
`;

fs.writeFileSync(path.join(clientDir, 'index.html'), htmlContent);
console.log('Dynamic production index.html generated successfully!');
