const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const currentVersion = String(packageJson?.version ?? '1.0.0');
const versionParts = currentVersion.split('.').map((part) => Number.parseInt(part, 10));

while (versionParts.length < 3) {
  versionParts.push(0);
}

if (versionParts.some((part) => Number.isNaN(part))) {
  throw new Error(`Cannot bump non-numeric version: ${currentVersion}`);
}

versionParts[2] += 1;

packageJson.version = versionParts.slice(0, 3).join('.');

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`Bumped app version: ${currentVersion} -> ${packageJson.version}`);
