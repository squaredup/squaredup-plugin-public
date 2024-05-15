import path from 'path';
import fs from 'fs';
import util from 'util';

const readDir = util.promisify(fs.readdir);

export const getPluginFolders = async (directoryPath) => {
    const mainFolders = (await readDir(directoryPath)).filter(
        (item) => !['.gitignore', '.DS_Store', 'package.json', 'package-lock.json'].includes(item)
    );

    const allFolders = [];
    await Promise.all(
        mainFolders.map(async (folder) => {
            const subFolders = await readDir(path.join(directoryPath, folder));

            subFolders.map((subFolder) => {
                if (/^v\d+$/gmu.test(subFolder)) {
                    allFolders.push(path.join(folder, subFolder));
                }
            });
        })
    );

    return allFolders.map((pluginPath) => {
        const pathParts = pluginPath.split(/\\|\//u);
        return {
            name: `${pathParts[0]} (${pathParts[1]})`,
            pluginPath: path.join(directoryPath, pluginPath)
        };
    });
};

// Return JSON from loaded file
export const loadJsonFromFile = (filePath) => {
    const rawdata = fs.readFileSync(filePath);
    return JSON.parse(rawdata);
};

export const testablePluginFolder = (folderPath) => {
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
