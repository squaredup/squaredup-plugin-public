import path from 'path';
import fs from 'fs';
import util from 'util';

const readDir = util.promisify(fs.readdir);

export const getPluginFolders = async (directoryPath) => {
    const mainFolders = (await readDir(directoryPath)).filter(item =>
        !['.gitignore', '.DS_Store', 'package.json'].includes(item)
    );

    const allFolders = [];
    await Promise.all(mainFolders.map(async (folder) => {
        const subFolders = await readDir(path.join(directoryPath, folder));

        // Check for versioned folders and only use the latest version
        const versionedFolders = subFolders
            .filter(subFolder => /^v\d+$/gm.test(subFolder))
            .map(subFolder => ({
                path: path.join(folder, subFolder),
                version: parseInt(subFolder.replace('v', ''), 10)
            }))
            .sort((a, b) => b.version - a.version);

        if (versionedFolders.length > 0) {
            allFolders.push(versionedFolders[0].path);
        }
    }));

    return allFolders.map((pluginPath) => {
        const pathParts = pluginPath.split(/\\|\//);
        return {
            name: `${pathParts[0]} (${pathParts[1]})`,
            pluginPath: path.join(directoryPath, pluginPath)
        };
    });
};

// Return JSON from loaded file
export const loadJsonFromFile = (filePath) => {
    const rawdata = fs.readFileSync(filePath);
    try {
        const result = JSON.parse(rawdata);
        return result;
    } catch (err) {
        throw new Error(`Error parsing JSON file: ${filePath}`);
    }
};

export const testablePluginFolder = (folderPath) =>{
    // Skip tests when the folder doesn't contain metadata.json
    const folderContents = fs.readdirSync(folderPath);
    const packageFile = folderContents.includes('package.json');
    const metadata = safeLoadJsonFromFile(path.join(folderPath, 'metadata.json')).fileContent;
    return packageFile || metadata !== null;
};

// Safely load a file for testing, with some metadata on the attempt
export const safeLoadJsonFromFile = (filePath) => {
    let fileLoadSuccess = false;
    let fileContent = null;
    let fileExists = fs.existsSync(filePath);

    if (!fileExists) {
        return {
            fileExists,
            fileLoadSuccess,
            fileContent
        };
    }

    try {
        fileContent = loadJsonFromFile(filePath);
        fileLoadSuccess = true;
    } catch (error) {
        fileLoadSuccess = false;
    }

    return {
        fileExists,
        fileLoadSuccess,
        fileContent
    };
};
