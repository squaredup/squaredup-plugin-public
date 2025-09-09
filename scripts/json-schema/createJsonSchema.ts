import { DataStreamFileSchema } from '@squaredup/types/dataStreamFileSchema';
import { DashboardFileSchema } from '@squaredup/types/dashboardFileSchema';
import { writeFile } from 'fs/promises';
import { zodToJsonSchema } from 'zod-to-json-schema';

const fixedPath = '../../packages/@squaredup/schema/';

const writeSchemaFile = async (path: string, data: string) => {
    try {
        await writeFile(path, data);
        console.log(`${path} schema written`);
    } catch (error) {
        console.error(error);
    }
};

const DataStreamFileJSONSchema = zodToJsonSchema(DataStreamFileSchema);
writeSchemaFile(fixedPath + 'data_streams.schema.json', JSON.stringify(DataStreamFileJSONSchema, null, 4));

const DashboardFileJSONSchema = zodToJsonSchema(DashboardFileSchema);
writeSchemaFile(fixedPath + 'oob.schema.json', JSON.stringify(DashboardFileJSONSchema, null, 4));