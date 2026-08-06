// 在 Linux serverless 构建（Vercel）上强制安装 @libsql 原生二进制。
//
// 背景：Vercel 的 npm install 由于「构建缓存恢复 / 可选依赖省略策略」，常常不会把
// libsql 的 optionalDependencies（@libsql/linux-x64-gnu 等）真正落到 node_modules——
// 只会留下一个空目录或 stub。更坑的是：后续再跑 `npm install --no-save @libsql/...`
// 时，npm 会判定它"已满足"（在可选依赖树里），直接回 `up to date` 而**不重新解包**，
// 导致原生 .node 文件始终缺失。Nitro 的 nft 做 traceInclude 时找不到 .node，整次
// 构建失败（Error: File .../node_modules/@libsql/linux-x64-gnu does not exist），
// 所有 /api 线上 500。
//
// 本脚本绕过 npm 的 "up to date" 短路：用 `npm pack` 强制下载 tarball，再用 `tar`
// 解包到 node_modules/@libsql/<平台>，保证原生 .node 真正落在磁盘上。仅 linux 执行
// （本地 Windows/Mac 的 install 已随 libsql 的 optionalDependencies 带上对应平台原生包）。
// 版本号动态取自已安装的 libsql（原生包版本与 libsql 同步）。
import process from 'node:process'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

if (process.platform !== 'linux') {
  process.exit(0)
}

const require = createRequire(import.meta.url)

// 取 libsql 真实版本（原生包版本与 libsql 同步）
let version = '0.5.29'
try {
  version = require('libsql/package.json').version
} catch {
  try {
    const clientPkg = require('@libsql/client/package.json')
    const v = clientPkg.dependencies?.libsql
    if (v) version = v.replace(/[^0-9.]/g, '')
  } catch {
    // 兜底：保持默认 0.5.29
  }
}

const targets = ['@libsql/linux-x64-gnu', '@libsql/linux-x64-musl']
const root = process.cwd()
const tmp = join(root, '.libsql-native-tmp')
mkdirSync(tmp, { recursive: true })

let installed = 0
for (const pkg of targets) {
  const segs = pkg.split('/') // ['@libsql', 'linux-x64-gnu']
  const dest = join(root, 'node_modules', ...segs)
  const hasBinary = existsSync(dest) && readdirSync(dest).some((f) => f.endsWith('.node'))
  if (hasBinary) {
    console.log(`[ensure-libsql-native] ${pkg} already present, skip`)
    continue
  }
  // 强制重新下载并解包，绕过 npm "up to date" 短路（Vercel 上常只剩空目录/stub）
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  // npm pack 产出 tarball 名：@libsql/linux-x64-gnu@0.5.29 -> libsql-linux-x64-gnu-0.5.29.tgz
  const tgzName = `${pkg.replace('@libsql/', 'libsql-').replace('/', '-')}-${version}.tgz`
  execSync(`npm pack ${pkg}@${version} --silent --no-audit --no-fund`, {
    cwd: tmp,
    stdio: 'inherit',
  })
  execSync(`tar -xzf "${join(tmp, tgzName)}" -C "${dest}" --strip-components=1`, {
    stdio: 'inherit',
  })
  installed++
  console.log(`[ensure-libsql-native] extracted ${pkg}@${version}`)
}

console.log(`[ensure-libsql-native] done (installed ${installed} package(s), version ${version})`)

// 清理临时 tarball 目录
try {
  rmSync(tmp, { recursive: true, force: true })
} catch {
  // 忽略清理失败
}
