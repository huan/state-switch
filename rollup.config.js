import json from 'rollup-plugin-json'

export default {
  input: 'dist/src/mod.js',
  output: {
    banner: '/* state-switch version ' + require('./package.json').version + ' */',
    file: 'bundles/state-switch.es6.js',
    footer: '/* https://github.com/huan */',
    format: 'es',
    name: 'window',
    sourcemap: true,
    exports: 'named',
  },
  plugins: [
    json({
      // All JSON files will be parsed by default,
      // but you can also specifically include/exclude files
      // include: 'node_modules/**',  // Default: undefined
      // exclude: [ 'node_modules/foo/**', 'node_modules/bar/**' ],  // Default: undefined
      preferConst: true, // Default: false
    }),
  ],
}
