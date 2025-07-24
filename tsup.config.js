module.exports = {
  entry: ['src/main.ts'],
  format: ['cjs'],            // CommonJS 格式，适合 Screeps
  outDir: 'dist',
  bundle: true,               // 打包依赖
  minify: false,             // Screeps 不需要压缩
  sourcemap: false,
  splitting: false,
  clean: true,
  external: [],              // 不排除任何模块
  noExternal: [/.*/],        // 强制打包所有依赖，包括 screeps-profiler
  target: 'es2017',          // 匹配 tsconfig.json 的 target
  platform: 'neutral',      // 中性平台，避免 Node.js 特定代码
  outExtension: ({ format }) => {
    return {
      js: '.js'              // 强制使用 .js 扩展名
    }
  }
}