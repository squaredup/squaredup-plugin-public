import { payloadSchema } from '@squaredup/schema';
import Ajv from 'ajv';
import { expect } from 'vitest';
import { getApi } from './logReport.js';

const ajv = new Ajv({ allowUnionTypes: true, strict: false });

const maxImportPayloadSize = 2 * 1024 * 1024;

export const testImportObjects = async (importObjects, pluginConfig) => {
    const validate = ajv.compile(payloadSchema);

    let pagingContext = {};

    const combinedOutput = {
        vertices: [],
        edges: []
    };

    do {
        const importResponse = await importObjects({ pluginConfig, pagingContext }, getApi(pluginConfig));

        //verifies the maximum payload size
        expect(JSON.stringify(importResponse).length).toBeLessThanOrEqual(maxImportPayloadSize);

        pagingContext = importResponse.pagingContext;
        if (pagingContext) {
            const pagingContextJson = JSON.stringify(pagingContext);
            pagingContext = JSON.parse(pagingContextJson);
        }

        //validates the importResponse
        expect(validate(importResponse)).toBe(true);

        if (importResponse.vertices) {
            combinedOutput.vertices = combinedOutput.vertices.concat(importResponse.vertices);
        }
        if (importResponse.edges) {
            combinedOutput.edges = combinedOutput.edges.concat(importResponse.edges);
        }
    } while (pagingContext && Object.keys(pagingContext).length > 0);

    return combinedOutput;
};

export const checkTypesPresence = (typesToCheck, vertices) => {
    const typesSet = new Set();

    // Populate typesSet with typesToCheck array
    typesToCheck.forEach((type) => typesSet.add(type));

    for (const vertex of vertices) {
        typesSet.delete(vertex.type);
    }

    expect(typesSet, `Expected all types to be present but missing: ${[...typesSet].join(', ')}`).toHaveLength(0);
};

export const confirmPresenceOfEdgesAndVertices = (object, edges = true) => {
    expect(object).toHaveProperty('vertices');
    expect(object.vertices.length).toBeGreaterThan(0);

    if (edges) {
        expect(object).toHaveProperty('edges');
        expect(object.edges.length).toBeGreaterThan(0);
    }
};