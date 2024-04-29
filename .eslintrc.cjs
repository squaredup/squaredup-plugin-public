module.exports = {
    env: {
        es2021: true,
        node: true
    },
    extends: ['eslint:recommended', 'prettier'],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
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
        'no-duplicate-imports': 'warn'
    }
};
