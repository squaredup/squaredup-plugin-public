export const metadataSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 25
        },
        displayName: {
            type: 'string'
        },
        type: {
            enum: ['cloud', 'onprem', 'hybrid', 'declarative']
        },
        supportsConfigValidation: {
            type: 'boolean'
        },
        importNotSupported: {
            type: 'boolean'
        },
        version: {
            type: 'string',
            pattern:
                '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?'
        },
        description: {
            type: 'string',
            maxLength: 300
        },
        category: {
            type: 'string',
            maxLength: 25
        },
        author: {
            type: 'string',
            maxLength: 75
        },
        links: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string'
                    },
                    label: { type: 'string' },
                    category: { type: 'string' }
                },
                required: ['label', 'url'],
                additionalProperties: false
            }
        },
        keywords: {
            type: 'array',
            items: {
                type: 'string',
                maxLength: 25
            }
        },
        objectTypes: {
            type: 'array',
            items: {
                type: 'string',
                maxLength: 50
            }
        },
        screenshots: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        actions: {
            type: 'object'
        },
        restrictedToPlatforms: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    },
    required: ['type', 'name', 'version', 'description', 'author'],
    additionalProperties: false
};

export const customTypesSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                maxLength: 100
            },
            type: {
                type: 'string',
                maxLength: 50
            },
            icon: {
                type: 'string'
            },
            singular: {
                type: 'string',
                maxLength: 25
            },
            plural: {
                type: 'string',
                maxLength: 28
            }
        },
        required: ['name', 'type', 'icon', 'singular', 'plural'],
        additionalProperties: false
    }
};

export const scopesSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            name: { type: 'string' }, // name must be a string
            matches: {
                oneOf: [
                    // matches should match either schema
                    { type: 'string', const: 'all' }, // a string of value 'all'
                    {
                        type: 'object', // an object
                        minProperties: 1, // at least 1 property
                        patternProperties: {
                            // properties can have any name
                            '.*': { 
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['equals', 'oneOf'] }, // a string of value 'equals' or 'oneOf'
                                    value: { type: 'string' }, // a string
                                    values: { type: 'array', items: { type: 'string' } } // an array of strings
                                },
                                dependentSchemas: {
                                    value: { properties: { type: { const: 'equals' } } }, // if value is used, type must be 'equals'
                                    values: { properties: { type: { const: 'oneOf' } } } // if values is used, type must be 'oneOf'
                                },
                                required: ['type'], // type is always required
                                oneOf: [
                                    // either value or values is required
                                    { required: ['value'] },
                                    { required: ['values'] }
                                ]
                            }
                        }
                    }
                ]
            }
        },
        required: ['name', 'matches'] // name and matches are always required
    }
};

export const codsSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            tplName: { type: 'string' },
            index: { type: 'number' },
            args: {
                type: 'object',
                properties: {
                    displayName: { type: 'string' },
                    dataSourceConfig: { type: 'object' },
                    description: { type: 'string' }
                },
                required: ['displayName', 'dataSourceConfig']
            }
        },
        required: ['tplName', 'index']
    }
};

export const timeframesSchema = {
    type: 'string',
    enum: [
        'last1hour',
        'last12hours',
        'last24hours',
        'last7days',
        'last30days',
        'thisMonth',
        'thisQuarter',
        'thisYear',
        'lastMonth',
        'lastQuarter',
        'lastYear'
    ]
};

export const dashboardsSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        dashboard: {
            type: 'object',
            properties: {
                _type: { type: 'string', const: 'layout/grid' },
                columns: { type: 'number', minimum: 1 },
                contents: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            x: { type: 'number', minimum: 0 },
                            y: { type: 'number', minimum: 0 },
                            h: { type: 'number', minimum: 1 },
                            w: { type: 'number' },
                            i: { type: 'string' },
                            config: {
                                type: 'object',
                                properties: {
                                    _type: { type: 'string' },
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    visualisation: { type: 'object' },
                                    scope: { type: 'object' },
                                    dataStream: { type: 'object' },
                                    datasource: { type: 'object' }
                                },
                                required: ['_type']
                            }
                        },
                        required: ['x', 'y', 'h', 'w', 'i', 'config']
                    }
                }
            },
            required: ['_type', 'columns', 'contents']
        },
        timeframe: timeframesSchema,
        schemaVersion: { type: 'string' }
    },
    required: ['name', 'dashboard', 'schemaVersion']
};

export const uiSchema = {
    type: 'array',
    maxItems: 20,
    items: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                maxLength: 100
            },
            type: {
                type: 'string'
            },
            label: {
                type: 'string',
                maxLength: 100
            },
            title: {
                type: 'string',
                maxLength: 150
            },
            help: {
                type: 'string'
            },
            validation: {
                type: 'object',
                properties: {
                    required: {
                        type: 'boolean'
                    },
                    maxLength: {
                        type: 'object',
                        properties: {
                            value: {
                                type: 'number'
                            }
                        },
                        required: ['value'],
                        additionalProperties: false
                    },
                    minLength: {
                        type: 'object',
                        properties: {
                            value: {
                                type: 'number'
                            }
                        },
                        required: ['value'],
                        additionalProperties: false
                    }
                },
                required: ['required']
            },
            placeholder: {
                type: 'string',
                maxLength: 100
            },
            fields: {
                type: 'array',
                items: { $ref: '#/items' }
            }
        },
        if: {
            properties: { type: { const: 'fieldGroup' } }
        },
        then: {
            required: ['type']
        },
        else: {
            required: ['name', 'type', 'label']
        }
    }
};

export const payloadSchema = {
    type: 'object',
    properties: {
        vertices: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    sourceId: { type: 'string' },
                    type: {
                        type: ['array', 'string'],
                        items: {
                            type: 'string'
                        }
                    },
                    monitorUrl: {
                        type: ['array', 'string'],
                        items: {
                            type: 'string'
                        }
                    },
                    sourceType: {
                        type: ['string', 'array'],
                        items: {
                            type: 'string'
                        }
                    },
                    sourceName: { type: 'string' },
                    links: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                url: {
                                    type: 'string'
                                },
                                label: { type: 'string' }
                            },
                            required: ['label', 'url']
                        }
                    },
                    tags: {
                        type: 'array',
                        items: {
                            type: ['object', 'string'],
                            properties: {
                                name: { type: 'string' },
                                value: { type: 'string' }
                            }
                        }
                    },
                    state: {
                        type: 'string',
                        enum: ['success', 'error', 'warning', 'unknown']
                    },
                    id: false,
                    __endpoint: false,
                    __search: false,
                    __partitionKey: false,
                    __tenantId: false,
                    __configId: false,
                    __ruleId: false,
                    __canonicalType: false,
                    __timestamp: false
                },
                required: ['sourceId', 'name', 'sourceType', 'sourceName']
            }
        },
        edges: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    outV: { type: 'string' },
                    inV: { type: 'string' },
                    label: { type: 'string', not: { const: 'is' } },
                    id: false,
                    __partitionKey: false,
                    __tenantId: false,
                    __configId: false,
                    __ruleId: false,
                    __timestamp: false
                },
                required: ['outV', 'inV', 'label']
            }
        },
        gremlinQuery: { type: 'string' },
        bindings: { type: 'object' },
        startOfImport: { type: 'boolean' },
        endOfImport: { type: 'boolean' },
        configSubType: { type: 'string' },
        configId: { type: 'string' }
    },
    anyOf: [{ required: ['vertices'] }, { required: ['vertices', 'edges'] }]
};

export const datastreamSupportedTimeframesSchema = {
    oneOf: [
        { type: 'boolean' },
        {
            type: 'array',
            uniqueItems: true,
            items: timeframesSchema
        }
    ]
};

export const dataStreamsSchema = {
    type: 'object',
    required: ['dataSources', 'matches', 'dataStreams'],
    properties: {
        rowTypes: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                required: ['name', 'metadata'],
                properties: {
                    name: {
                        type: 'string'
                    },
                    metadata: {
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'object',
                            oneOf: [{ required: ['name'] }, { required: ['pattern'] }],
                            properties: {
                                name: {},
                                pattern: {}
                            }
                        }
                    }
                }
            }
        },
        dataSources: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                required: ['name', 'displayName', 'supportedScope'],
                properties: {
                    name: {
                        type: 'string'
                    },
                    displayName: {
                        type: 'string'
                    },
                    supportedScope: {
                        type: 'string'
                    },
                    timeframes: datastreamSupportedTimeframesSchema
                }
            }
        },
        matches: {
            oneOf: [
                {
                    const: 'none'
                },
                {
                    const: 'all'
                },
                {
                    type: 'object',
                    patternProperties: {
                        '.*': {
                            oneOf: [
                                {
                                    type: 'object',
                                    required: ['type', 'values'],
                                    properties: {
                                        type: { const: 'oneOf' },
                                        values: { type: 'array', items: { type: 'string' } }
                                    }
                                },
                                {
                                    type: 'object',
                                    required: ['type', 'value'],
                                    properties: {
                                        type: { const: 'contains' },
                                        value: { type: 'string', items: { type: 'string' } }
                                    }
                                },
                                {
                                    type: 'object',
                                    required: ['type', 'value'],
                                    properties: {
                                        type: { const: 'equals' },
                                        value: { type: 'string', items: { type: 'string' } }
                                    }
                                },
                                {
                                    type: 'object',
                                    required: ['type', 'pattern'],
                                    properties: {
                                        type: { const: 'regex' },
                                        pattern: { type: 'string' }
                                    }
                                },
                                {
                                    type: 'object',
                                    required: ['type'],
                                    properties: {
                                        type: { const: 'any' }
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    type: 'array',
                    uniqueItems: true,
                    items: {
                        type: 'object',
                        patternProperties: {
                            '.*': {
                                oneOf: [
                                    {
                                        type: 'object',
                                        required: ['type', 'values'],
                                        properties: {
                                            type: { const: 'oneOf' },
                                            values: { type: 'array', items: { type: 'string' } }
                                        }
                                    },
                                    {
                                        type: 'object',
                                        required: ['type', 'value'],
                                        properties: {
                                            type: { const: 'contains' },
                                            value: { type: 'string', items: { type: 'string' } }
                                        }
                                    },
                                    {
                                        type: 'object',
                                        required: ['type', 'value'],
                                        properties: {
                                            type: { const: 'equals' },
                                            value: { type: 'string', items: { type: 'string' } }
                                        }
                                    },
                                    {
                                        type: 'object',
                                        required: ['type', 'pattern'],
                                        properties: {
                                            type: { const: 'regex' },
                                            pattern: { type: 'string' }
                                        }
                                    },
                                    {
                                        type: 'object',
                                        required: ['type'],
                                        properties: {
                                            type: { const: 'any' }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ]
        },
        dataStreams: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                required: ['displayName', 'definition'],
                properties: {
                    displayName: {
                        type: 'string'
                    },
                    provides: {
                        type: 'string',
                        enum: ['health', 'templateData','componentType']
                    },
                    definition: {
                        type: 'object',
                        required: ['name', 'dataSourceConfig', 'rowPath', 'matches'],
                        dependencies: {
                            metadata: { not: { required: ['rowType'] } },
                            rowType: { not: { required: ['metadata'] } }
                        },
                        properties: {
                            name: { type: 'string' },
                            dataSourceConfig: { type: 'object' },
                            rowPath: {
                                type: 'array',
                                items: { type: ['array', 'string'], items: { type: 'string' } }
                            },
                            matches: {
                                oneOf: [
                                    {
                                        const: 'none'
                                    },
                                    {
                                        const: 'all'
                                    },
                                    {
                                        type: 'object',
                                        patternProperties: {
                                            '.*': {
                                                oneOf: [
                                                    {
                                                        type: 'object',
                                                        required: ['type', 'values'],
                                                        properties: {
                                                            type: { const: 'oneOf' },
                                                            values: { type: 'array', items: { type: 'string' } }
                                                        }
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['type', 'value'],
                                                        properties: {
                                                            type: { const: 'contains' },
                                                            value: { type: 'string', items: { type: 'string' } }
                                                        }
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['type', 'value'],
                                                        properties: {
                                                            type: { const: 'equals' },
                                                            value: { type: 'string', items: { type: 'string' } }
                                                        }
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['type', 'pattern'],
                                                        properties: {
                                                            type: { const: 'regex' },
                                                            pattern: { type: 'string' }
                                                        }
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['type'],
                                                        properties: {
                                                            type: { const: 'any' }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        type: 'array',
                                        uniqueItems: true,
                                        items: {
                                            type: 'object',
                                            patternProperties: {
                                                '.*': {
                                                    oneOf: [
                                                        {
                                                            type: 'object',
                                                            required: ['type', 'values'],
                                                            properties: {
                                                                type: { const: 'oneOf' },
                                                                values: { type: 'array', items: { type: 'string' } }
                                                            }
                                                        },
                                                        {
                                                            type: 'object',
                                                            required: ['type', 'value'],
                                                            properties: {
                                                                type: { const: 'contains' },
                                                                value: { type: 'string', items: { type: 'string' } }
                                                            }
                                                        },
                                                        {
                                                            type: 'object',
                                                            required: ['type', 'value'],
                                                            properties: {
                                                                type: { const: 'equals' },
                                                                value: { type: 'string', items: { type: 'string' } }
                                                            }
                                                        },
                                                        {
                                                            type: 'object',
                                                            required: ['type', 'pattern'],
                                                            properties: {
                                                                type: { const: 'regex' },
                                                                pattern: { type: 'string' }
                                                            }
                                                        },
                                                        {
                                                            type: 'object',
                                                            required: ['type'],
                                                            properties: {
                                                                type: { const: 'any' }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                ]
                            },
                            metadata: {
                                type: 'array',
                                uniqueItems: true,
                                items: {
                                    type: 'object',
                                    oneOf: [{ required: ['name'] }, { required: ['pattern'] }],
                                    properties: {
                                        name: {},
                                        pattern: {}
                                    }
                                }
                            },
                            rowtype: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string' }
                                }
                            }
                        },
                        timeframes: datastreamSupportedTimeframesSchema,
                        manualConfigApply: {
                            type: 'boolean'
                        },
                        tags: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

export const jiraSchema = {
    type: 'object',
    properties: {
        tier: {
            type: 'number'
        },
        fixed: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string'
                    },
                    PR: {
                        type: ['integer', 'string']
                    }
                }
            }
        },
        na: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string'
                    },
                    comment: {
                        type: 'string'
                    }
                }
            }
        }
    }
};
