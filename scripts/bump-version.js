const fs = require('node:fs');
const path = require('node:path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const currentVersion = String(appJson?.expo?.version ?? '1.0.0');
const versionParts = currentVersion.split('.').map((part) => Number.parseInt(part, 10));

while (versionParts.length < 3) {
  versionParts.push(0);
}

if (versionParts.some((part) => Number.isNaN(part))) {
  throw new Error(`Cannot bump non-numeric version: ${currentVersion}`);
}

versionParts[2] += 1;

appJson.expo.version = versionParts.slice(0, 3).join('.');

fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);
console.log(`Bumped app version: ${currentVersion} -> ${appJson.expo.version}`);
