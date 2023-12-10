import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  external: [...Object.keys(pkg.peerDependencies || {})],
  plugins: [
    commonjs(),
    typescript({ outputToFilesystem: true })
  ],
}