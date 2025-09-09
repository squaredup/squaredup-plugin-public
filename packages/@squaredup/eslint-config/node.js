module.exports = {
    root: true,
    plugins: ['no-only-tests'],
    extends: ['eslint:recommended', 'prettier'],
    parser: '@babel/eslint-parser',
    parserOptions: {
        requireConfigFile: false,
        es2021: true
    },
    env: {
        es2021: true,
        node: true
    },
    ignorePatterns: ['wrappedHandler.js', 'handlerCloud.js', 'handlerOnPrem.js'],
    rules: {
        'jsx-quotes': ['error', 'prefer-single'],
        semi: ['error', 'always'],
        'default-case': 'error',
        quotes: ['error', 'single', { avoidEscape: true }],
        curly: 'error',
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'guard-for-in': 'error',
        'no-alert': 'error',
        'no-caller': 'error',
        'no-empty-function': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-extra-bind': 'error',
        'no-implicit-coercion': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-iterator': 'error',
        'no-labels': 'error',
        'no-lone-blocks': 'error',
        'no-loop-func': 'warn',
        'no-multi-spaces': 'warn',
        'no-return-assign': 'error',
        'no-return-await': 'warn',
        'no-self-compare': 'warn',
        'no-sequences': 'error',
        'no-throw-literal': 'warn',
        'no-unused-vars': ['error', { ignoreRestSiblings: true }],
        'no-useless-call': 'warn',
        'no-useless-concat': 'warn',
        'no-useless-return': 'warn',
        'require-unicode-regexp': 'warn',
        'vars-on-top': 'error',
        'no-shadow': 'warn',
        'brace-style': 'warn',
        camelcase: 'error',
        'comma-dangle': ['error', 'never'],
        'max-len': [
            'warn',
            {
                code: 120,
                tabWidth: 4,
                ignoreStrings: true,
                ignoreTemplateLiterals: true,
                ignoreTrailingComments: true,
                ignoreRegExpLiterals: true
            }
        ],
        'no-debugger': 'warn',
        'no-duplicate-imports': 'warn',
        'no-only-tests/no-only-tests': 'error'
    },
    overrides: [
        // Use typescript rules for TS files
        {
            files: ['**/*.ts', '**/*.tsx'],
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended'
            ],
            rules: {
                'no-unused-vars': ['off'],
                'no-redeclare': 'off',
                '@typescript-eslint/ban-ts-comment': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-redeclare': ['error'],
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    {
                        ignoreRestSiblings: true,
                        argsIgnorePattern: '^_' // allow unused if they start with an underscore
                    }
                ],
                '@typescript-eslint/no-empty-object-type': 'error',
                // we should turn this on at some point, too many things to change right now
                '@typescript-eslint/explicit-module-boundary-types': 'off'
            },
            globals: { Atomics: 'readonly', SharedArrayBuffer: 'readonly' },
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint']
        }
    ]
};
