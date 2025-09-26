import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/ur.js',
      format: 'umd',
      name: 'UR',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      terser()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/ur.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      terser()
    ]
  }
];
