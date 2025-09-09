#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

(async function lintAndFormat() {
    try {
        // Resolve the current working directory (repo root)
        const __filename = fileURLToPath(import.meta.url);
        const cwd = path.resolve(path.dirname(__filename), '../../');

        // Get the root folder to lint, defaults to the repo root
        const root = process.argv[2] == null ? '' : `^${process.argv[2]}`;
        const pattern = new RegExp(`${root}/.*\\.[tj]sx?$`, 'giu');
        console.log(`Linting and formatting files matching pattern: ${pattern}`);

        // Get changed files relative to main branch, excluding deleted files
        const files = execSync('git diff --name-only --diff-filter=d origin/main...', {
            cwd
        })
            .toString('ascii')
            .split('\n')
            .filter((file) => pattern.test(file));

        if (files.length === 0) {
            console.log('No matching changed files detected.');
            process.exit(0);
        }

        console.log('Running Prettier...');
        execSync(`pnpm exec prettier --write ${files.join(' ')}`, {
            cwd,
            stdio: 'inherit'
        });

        // Lint and fix files with ESLint
        console.log('Running ESLint...');
        execSync(`pnpm exec eslint --fix ${files.join(' ')}`, {
            cwd,
            stdio: 'inherit'
        });

        console.log('Formatting and linting completed.');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
