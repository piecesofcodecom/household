import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import path from 'path';
import postcss from 'rollup-plugin-postcss';
import cssnano from 'cssnano';

export default {
  input: path.resolve('module', 'household.mjs'), // Entry point of your module
  output: {
    file: 'build/household.js', // Output bundle file
    format: 'esm', // Output format (esm for ES Module)
  },
  plugins: [
    resolve({
      browser: true,  // Adjust depending on target environment
      extensions: ['.js', '.mjs', '.json', '.node']
    }), // Teaches Rollup how to find external modules
    commonjs(), // Convert CommonJS modules to ES6
    postcss({
      plugins: [
        cssnano({
          preset: 'default',
        })
      ],
      extract: 'styles/household.min.css', // Extrai e minifica o CSS para um arquivo separado
      minimize: true, // Enable minification
    })
  ]
};
