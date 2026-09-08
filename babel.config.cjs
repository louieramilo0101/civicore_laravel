/** @type {import('@babel/core').TransformOptions} Shared Babel transforms for the frontend and tests. */
module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
    ],
};
