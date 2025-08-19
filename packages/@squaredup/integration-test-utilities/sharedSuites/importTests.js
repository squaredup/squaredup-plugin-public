import { beforeAll, describe, expect, it } from 'vitest';
import { testImportObjects, confirmPresenceOfEdgesAndVertices, checkTypesPresence } from '../helpers/import.js';
import { verifyDataStreamResponse } from '../helpers/assertions.js';

/**
 * Run through all common plugin import tests and requires the importObjects, plugin credentials and
 * dataTypes to be passed in.
 * @param {Object} options.importObjects - The objects to be imported, typically from a plugin.
 * @param {Object} options.credentials - The credentials required for the import.
 * @param {Array} options.dataTypes - An array of expected data types for the vertices
 * @param {boolean} options.edges - To confirm presence of edges in the import, defaults to true.
 * @param {string} options.plugin - The name of the plugin being tested.
 * @param {Object} options.pagingConfig - Configuration for paging, if applicable.
 *
 * @example
 *      import { runImportTests } from '@squaredup/integration-test-utilities/sharedSuites/importTests.js';
 *      runImportTests(importObjects, env.Credentials.AzureDevOps, allTypes);
 */

export function runCommonImportTests(options = {}) {
    options.edges = options.edges ?? true;

    let importedObjects = {};

    describe(`${options.plugin} Import Tests`, () => {
        beforeAll(async () => {
            //invokes the import function for plugin
            importedObjects = await testImportObjects(options.importObjects, options.credentials);
        });

        it('Returns Vertices and Edges', async () => {
            confirmPresenceOfEdgesAndVertices(importedObjects, options.edges);
            if (!options.edges) {
                expect(importedObjects.edges).toHaveLength(0);
            }
        });

        it('Validates that all vertices have a valid type', async () => {
            checkTypesPresence(options.dataTypes, importedObjects.vertices);
        });

        if (options.edges) {
            it('Returns valid edges', async () => {
                const expectedProperties = {
                    outV: expect.any(String),
                    label: expect.any(String),
                    inV: expect.any(String)
                };

                verifyDataStreamResponse(importedObjects.edges, expectedProperties);
            });
        }

        if (options.pagingConfig) {
            it('Verifies paging feature for importing objects', async () => {
                //invokes the import function for plugin with paging
                const pagedObjects = await testImportObjects(options.importObjects, options.pagingConfig);

                //verifies all expected objects are imported (sorting arrays to handle different ordering due to paging)
                expect(pagedObjects.vertices.map((x) => x.sourceId).sort()).toEqual(
                    importedObjects.vertices.map((x) => x.sourceId).sort()
                );
                expect(pagedObjects.edges.length).toEqual(importedObjects.edges.length);
            });
        }
    });
}
