export default {
  files: ['test/**/*.test.ts'],
  failFast: false,
  failWithoutAssertions: false,
  verbose: true,
  timeout: '2m',
  nodeArguments: [
    '--no-warnings',
    '--loader=@esbuild-kit/esm-loader',
    '--experimental-specifier-resolution=node',
  ],
  extensions: {
    ts: 'module',
  },
}
