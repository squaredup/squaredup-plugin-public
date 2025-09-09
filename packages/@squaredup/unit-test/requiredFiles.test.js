import Ajv from 'ajv';
import { describe, expect, test } from '@jest/globals';
import { loadJsonFromFile, safeLoadJsonFromFile, testablePluginFolder } from './util.js';
import { customTypesSchema, dataStreamsSchema, jiraSchema, metadataSchema, uiSchema } from '../schema/schema.js';
import path from 'path';

export const testIf = (condition, ...args) => condition ? test(...args) : test.skip(...args);
export const describeIf = (condition, ...args) => condition ? describe(...args) : describe.skip(...args);

const ajv = new Ajv({ allowUnionTypes: true, strict: false });

const jsonSchemas = {
    'metadata.json': metadataSchema,
    'custom_types.json': customTypesSchema,
    'ui.json': uiSchema,
    'data_streams.json': dataStreamsSchema,
    'jira.json': jiraSchema,
};

// Files required for plugin to work
const requiredJsonFiles = [
    'metadata.json',
    'ui.json',
    'data_streams.json'
];

// Optional configuration files
const optionalJsonFiles = [
    'custom_types.json',
    'jira.json',
];

// Validate JSON for a specific file
const validateJson = (filePath) => {
    const json = loadJsonFromFile(filePath);

    const jsonSchema = jsonSchemas[path.basename(filePath)];

    if (ajv.validate(jsonSchema, json)) {
        return 'Validated';
    }
    else {
        return ajv.errorsText();
    }
};

// replace empty space with '-'; remove 'onpremise' word; remove any brackets in the name; remove last character if it ends with just '-'
const sanitiseName = (name) => name?.toLowerCase().replace(/ /g, '-').replace(/onpremise$/, '').replace(/\(.*?\)/g, '').replace(/-$/, '');
const BASE_HELP_URL = 'https://squaredup.com/cloud/pluginsetup-';
const BASE_DOCS_URL = 'https://docs.squaredup.com/data-sources/';
const BASE_LEARN_URL = 'https://squaredup.com/plugins/';

const validateFileContents = (pluginToTest, fileName, isMandatory) => {
    const filePath = path.join(pluginToTest.pluginPath, fileName);
    const fileLoadResults = safeLoadJsonFromFile(filePath);

    describeIf((isMandatory || fileLoadResults.fileExists), fileName, () => {
        test('File Exists', async () => {
            expect(fileLoadResults.fileExists).toBe(true);
        });
        testIf(fileLoadResults.fileExists, 'Is valid JSON', async () => {
            expect(fileLoadResults.fileLoadSuccess).toBe(true);
        });
        testIf(fileLoadResults.fileLoadSuccess, 'Matches Definition', async () => {
            expect(validateJson(filePath)).toBe('Validated');
        });

        if (fileName === 'metadata.json' && fileLoadResults.fileExists) {
            validateMetadata(pluginToTest);
        }
    });
};

const validateMetadata = (pluginToTest) => {
    const helpLinkOld = 'Help adding this plugin';
    const helpLinkNew = 'Help adding this datasource';
    const learnMoreLink = 'Learn more';
    const metadata = loadJsonFromFile(path.join(pluginToTest.pluginPath, 'metadata.json'));
    const hasHelpMetadataLink = Array.isArray(metadata.links) && metadata.links?.some(l => l.label === helpLinkOld) || metadata.links?.some(l => l.label === helpLinkNew);
    const hasLearnMoreMetadataLink = Array.isArray(metadata.links) && metadata.links?.some(l => l.label === learnMoreLink);
    const squaredUpAuthored = metadata.author === 'SquaredUp';
    const squaredUpInternal = metadata.category && metadata.category === 'SquaredUp Internal';
    const onPremCapable = metadata.type === 'onprem' || metadata.type === 'hybrid';

    testIf(onPremCapable, 'On-Prem Plugin metadata.json has restrictedToPlatforms', async () => {
        expect(metadata.restrictedToPlatforms).toBeDefined();
    });

    describeIf(onPremCapable, 'On-Prem capable plugin metadata.json actions check', () => {
        const dataStreamsConfig = loadJsonFromFile(path.join(pluginToTest.pluginPath, 'data_streams.json'));
        const dataSources = dataStreamsConfig.dataSources ?? [];

        const actions = metadata.actions;

        testIf(metadata.supportsConfigValidation, 'Has test config action in metadata.json', () => {
            expect(actions.__testConfig).toBeDefined();
        });

        testIf(!metadata.importNotSupported, 'Has import action in metadata.json', () => {
            expect(actions.import).toBeDefined();
        });

        test.each(dataSources)('$name data source has matching action in metadata.json', ({ name }) => {
            expect(actions[name]).toBeDefined();
        });

    });

    testIf(squaredUpAuthored, `Contains required "${helpLinkOld}" link`, async () => {
        expect(hasHelpMetadataLink).toBe(true);
    });

    testIf((squaredUpAuthored && hasHelpMetadataLink && !squaredUpInternal), 'Help link destination URL matches format', async () => {
        const link = metadata.links.find(l => l.label === helpLinkOld || l.label === helpLinkNew);

        // We check both here, as sometimes links are updated to reflect a plugin rename BUT only 
        // the displayName can change and not the name (as changing the name makes it a different plugin)
        const name = sanitiseName(metadata.name);
        const displayName = sanitiseName(metadata.displayName);

        const regexUrlDocs = [
            `${BASE_HELP_URL}.*`,
            `${BASE_DOCS_URL}.*`
        ];

        const linkKeywords = [];
        linkKeywords.push(name);
        linkKeywords.push(displayName);
        if (metadata?.keywords) {
            linkKeywords.push(...metadata.keywords);
        }

        const regexKeywords = new RegExp(linkKeywords.join('|'), 'i');

        // check that the link starts with correct url base and 
        // that at least one of the name, display name or a keyword is contained within the link
        const linkIsValid = regexUrlDocs.some(regex => new RegExp(regex).test(link.url)) && regexKeywords.test(link.url);
        expect(linkIsValid).toEqual(true);
    });

    testIf((squaredUpAuthored && hasLearnMoreMetadataLink && !squaredUpInternal), 'Learn more link destination URL matches format', async () => {
        const link = metadata.links.find(l => l.label === learnMoreLink);

        const name = sanitiseName(metadata.name);
        const displayName = sanitiseName(metadata.displayName);

        const linkKeywords = [];
        linkKeywords.push(name);
        linkKeywords.push(displayName);
        if (metadata?.keywords) {
            linkKeywords.push(...metadata.keywords);
        }

        const regexKeywords = new RegExp(linkKeywords.join('|'), 'i');

        // check that the link starts with correct url base and 
        // that at least one of the name, display name or a keyword is contained within the link        
        const linkIsValid = link.url.startsWith(BASE_LEARN_URL) && regexKeywords.test(link.url);
        expect(linkIsValid).toEqual(true);
    });
};


describe('Code Quality', () => {
    for (let index = 0; index < global.pluginsToTest.length; index++) {
        const pluginToTest = global.pluginsToTest[index];

        const validFolder = testablePluginFolder(pluginToTest.pluginPath);
        const packageJson = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'package.json'));

        describeIf(validFolder, `${pluginToTest.name}`, () => {
            requiredJsonFiles.forEach(requiredFile => {
                validateFileContents(pluginToTest, requiredFile, true);
            });
            optionalJsonFiles.forEach(optionalFile => {
                validateFileContents(pluginToTest, optionalFile, false);
            });
        });

        describeIf(validFolder && packageJson.fileExists, `${pluginToTest.name} package.json`, () => {
            test('Name in package.json mataches metadata.json in name-version format', async () => {
                const name = packageJson.fileContent.name;
                const metadata = loadJsonFromFile(path.join(pluginToTest.pluginPath, 'metadata.json'));

                const expectedPackageName = `${metadata.name.toLowerCase().replace(/\s+/g, '-')}-v${metadata.version.split('.')[0]}`;
                expect(name).toBe(expectedPackageName);
            });
        });
    }
});
