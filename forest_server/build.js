const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./src/index.ts'], // Entry point of your project
  bundle: true,                   // Bundles all dependencies
  outfile: './dist/index.js',    // Output file
  platform: 'node',               // Targeting Node.js
  target: 'node16',               // Node.js version
  sourcemap: true,                // Optional: Generate source maps
  format: 'cjs',                  // CommonJS format
  minify: true,                   // Optional: Minify the output
}).then(() => {
  console.log('Build successful!');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});