import { z } from 'zod';
// import { UIConfigSchema } from './UIConfig';

// Adjust this when we've got all the types correct. 
export const TemplateSchema = z.array(z.unknown()).optional();