import { readFileSync } from 'fs';
import { join } from 'path';

export function getPackageNameVersion(currentDir) {
    const metadataPath = join(currentDir, '..', 'metadata.json');
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const name = metadata.displayName.replace(/\s/g, '-');
    const majorVersion = `v${metadata.version.split('.')[0]}`;
    return `${name}-${majorVersion}`;
}
