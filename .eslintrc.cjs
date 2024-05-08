module.exports = {
    env: {
        es2021: true,
        node: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    ignorePatterns: ["wrappedHandler.js", "handlerCloud.js", "handlerOnPrem.js"],
    rules: {
        indent: ['error', 4, { SwitchCase: 1, offsetTernaryExpressions: false }],
        'linebreak-style': 'off',
        quotes: ['error', 'single'],
        semi: ['error', 'always']
    }
};
