// 在 Linux serverless 构建（Vercel）上强制安装 @libsql 原生二进制。
//
// 背景：Vercel 的 npm install 由于「构建缓存恢复 / 可选依赖省略策略」，常常不会把
// libsql 的 optionalDependencies（@libsql/linux-x64-gnu 等）真正落到 node_modules——
// 只会留下一个空目录。Nitro 的 nft 在做 traceInclude 时找不到文件，直接
// 报 “File .../node_modules/@libsql/linux-x64-gnu does not exist”，整次构建失败，
// 导致所有 /api 线上 500。
//
// 本脚本在安装阶段（postinstall）显式把对应平台的原生包装进 node_modules，
// 保证 nft 在 nuxt build 时能追踪到 .node 文件。本机 Windows/Mac 开发环境不需要
// （本地 install 已随 libsql 的 optionalDependencies 带上对应平台原生包），故仅在
// linux 执行；版本号动态取自已安装的 libsql（原生包版本与 libsql 同步）。
import process from 'node:process'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

if (process.platform !== 'linux') {
  process.exit(0)
}

const require = createRequire(import.meta.url)
let version = '0.5.29'
try {
  version = require('libsql/package.json').version
} catch {
  // 兜底：保持默认
}

const pkgs = [
  `@libsql/linux-x64-gnu@${version}`,
  `@libsql/linux-x64-musl@${version}`,
]

try {
  execSync(
    `npm install --no-save --no-audit --no-fund --ignore-scripts ${pkgs.join(' ')}`,
    { stdio: 'inherit' },
  )
  console.log(`[ensure-libsql-native] installed linux native bindings (${version})`)
} catch (e) {
  // 只告警不中断：万一装不上，resilient traceInclude 会跳过它，构建仍可进行
  // （此时 DB 路由在运行时才会报错，但 captcha 等不碰库的路由不受影响）。
  console.warn('[ensure-libsql-native] failed to install native bindings:', e.message)
}
