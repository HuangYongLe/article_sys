# 文章发布平台（article-sys）

一个基于 **Nuxt 4** 的轻量级内容发布平台：作者可以用 Markdown 写作、打标签、沉淀公开主页，管理员可以治理内容与用户。支持服务端渲染（SSR）、公开页静态预渲染（SSG）、SEO 优化与图片/字体优化。

## 功能特性

- **认证与权限**：注册 → 超管审核 → 登录；基于 cookie 的会话（`nuxt-auth-utils`）。角色含 `super_admin` / 普通用户。
- **文章管理**：Markdown 编辑器、标签、封面图、发布/草稿状态。
- **公开页**：首页文章聚合流、作者主页 `/u/[username]`、文章详情 `/u/[username]/[slug]`、标签云，全部支持静态预渲染（SSG）。
- **中控平台**：用户管理、文章治理、审计日志（`/admin`）。
- **SEO 与性能**：每页 `metadata` / Open Graph / Twitter Card / `canonical`；动态 OG 图片（1200×630）；`@nuxt/image` 响应式图片（webp/avif + 懒加载）；系统字体栈（零网络字体）。
- **部署**：原生支持 Vercel（Nitro serverless + 构建期 SSG）。

## 技术栈

| 分类   | 选型                                            |
| ---- | --------------------------------------------- |
| 框架   | Nuxt 4.5.1 / Nitro 2 / Vue 3.5                |
| UI   | `@nuxt/ui` v4（Tailwind CSS v4，主色 indigo）      |
| 数据库  | `@libsql/client`（本地 `file:` SQLite 或远程 Turso） |
| ORM  | `drizzle-orm`                                 |
| 状态   | `@pinia/nuxt`                                 |
| 图片   | `@nuxt/image`                                 |
| OG 图 | `@resvg/resvg-wasm`（SVG → PNG）                |

## 功能截图（占位）

> 以下为截图占位，请将实际截图放入 `screenshots/` 目录并替换下方路径后即可生效。

| 页面           | 截图   |
| ------------ | ---- |
| 首页（聚合流）      | 首页   |
| 登录页          | 登录   |
| 注册页          | 注册   |
| 作者主页         | 作者主页 |
| 文章详情         | 文章详情 |
| 后台 Dashboard | 后台   |
| 中控台 Admin    | 中控台  |

---

## 环境要求

- **Node.js ≥ 22.12.0**（本项目 `package.json` 的 `engines` 与 `.nvmrc` 已锁定；低于此版本会因 `oxc-parser` 的 `require(esm)` 报错）。
- 包管理器：npm（或兼容 pnpm/yarn）。

```bash
# 查看 node 版本
node -v
# 若使用 nvm
nvm use            # 读取 .nvmrc
```

---

## 安装与运行

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd article-sys
npm install
```

> `postinstall` 会自动执行 `nuxt prepare` 生成类型声明。

### 2. 配置环境变量

复制示例文件并按需修改：

```bash
cp .env.example .env
```

必填项（`NUXT_SESSION_PASSWORD`）+ 数据库连接，详见下方「环境变量配置」。

### 3. 初始化数据库（建表）

本项目使用 Drizzle，schema 位于 `server/database/schema.ts`。首次运行前需把表结构推送到数据库：

```bash
# 本地（file:./local.db）
npm run db:push

# 远程 Turso（先确保 .env 中已配置 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN）
npm run db:push
```

> 可选：`npm run db:generate` 生成迁移文件，`npm run db:migrate` 执行迁移；`db:studio` 打开 Drizzle Studio 查看数据。

### 4. 启动开发服务器

```bash
npm run dev
# 默认地址 http://localhost:3000
```

### 5. 其他常用脚本

```bash
npm run build      # 生产构建（SSR）
npm run generate   # 静态预渲染构建（nuxt generate）→ 输出 .output/public
npm run preview    # 预览生产构建
```

### 默认超管账号（仅本地开发库）

本地 `local.db` 内置一个超级管理员，便于联调：

- 用户名：`boss`
- 密码：`boss87654321`

> ⚠️ 生产环境请务必修改密码，或自行在数据库中创建一个 `role = 'super_admin'` 的用户。注册的新用户需管理员在 `/admin` 审核通过后才可以登录。



---

## 环境变量配置

所有变量均在 `.env` 中设置（参考 `.env.example`）。

| 变量                      | 必填   | 默认值                     | 说明                                                                   |
| ----------------------- | ---- | ----------------------- | -------------------------------------------------------------------- |
| `NUXT_SESSION_PASSWORD` | 生产必填 | 空                       | 会话加密密钥，>= 32 字符。生成：`openssl rand -base64 32`。**生产环境缺失会导致会话功能异常。**    |
| `TURSO_DATABASE_URL`    | 是    | `file:./local.db`       | 本地开发用 `file:./local.db`；生产填 Turso 地址 `libsql://<db>-<org>.turso.io`。 |
| `TURSO_AUTH_TOKEN`      | 远程必填 | 空                       | Turso 访问令牌：`turso db tokens create <db-name>`。本地 `file:` 可留空。        |
| `BLOB_READ_WRITE_TOKEN` | 可选   | 空                       | Vercel Blob 图片上传令牌；缺失时文章封面降级为「填写图片 URL」。                             |
| `NUXT_PUBLIC_SITE_URL`  | 建议   | `http://localhost:3000` | 站点绝对地址，用于 `canonical`、OG 图片等绝对链接。**生产请改为真实域名（含 https）。**             |
| `NUXT_PUBLIC_SITE_NAME` | 否    | `文章发布平台`                | 站点名称，用于标题、品牌展示等。                                                     |

> 以 `NUXT_PUBLIC_` 开头的变量会暴露到客户端（用于 SEO/OG 等）。

---

## 部署到 Vercel

本应用通过 Nitro 以 **serverless（SSR）** 方式运行，同时会在构建期把公开页（`/` 与 `/u/**`）预渲染为静态 HTML。

### 方式一：Vercel 控制台（推荐）

1. 在 Vercel 导入本仓库（Framework Preset 选 **Nuxt**，根目录为仓库根）。
2. **Node 版本**：在项目 `Settings → Build & Development` 中将 Node.js Version 设为 **22.x**（项目 `engines` 已声明，Vercel 通常会自动识别）。
3. **配置环境变量**（`Settings → Environment Variables`），至少包含：
   - `NUXT_SESSION_PASSWORD`（生产值）
   - `TURSO_DATABASE_URL`（你的 Turso 地址）
   - `TURSO_AUTH_TOKEN`
   - `NUXT_PUBLIC_SITE_URL`（改为你的生产域名，如 `https://your-app.vercel.app`）
   - `NUXT_PUBLIC_SITE_NAME`
   - `BLOB_READ_WRITE_TOKEN`（如需上传图片）
   - 作用域勾选 **Production** 和 **Preview**。
4. **构建数据库（建表）**：确保部署前 Turso 中已存在表结构。可在本地执行 `TURSO_DATABASE_URL=<远程> TURSO_AUTH_TOKEN=<令牌> npm run db:push`，或在 Vercel 的 Build Command 中追加：
   ```bash
   npm run db:push && nuxt build
   ```
   > 公开页在 `nuxt build` 阶段会被预渲染，因此需要构建期能连到数据库（上述环境变量需对 **Build** 作用域可见）。
5. 点击 **Deploy**。部署完成后访问分配的域名即可。

### 方式二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel            # 按提示关联项目，环境变量在控制台配置亦可
vercel --prod
```

### 生产环境注意事项

- **超管账号**：Vercel 上的数据库是全新的，本地 `boss` 账号不会同步过去。请通过 Turso 控制台执行 SQL 插入一个 `role = 'super_admin'` 的用户，或使用你的注册 + 审核流程创建管理员。
- **首次注册审核**：普通用户注册后状态为待审核，需超管在 `/admin` 通过后才能登录。
- **纯静态部署（不推荐）**：`npm run generate` 产出 `.output/public` 可用于纯静态托管，但该模式下登录、文章 CRUD 等 API 不可用，仅适合只展示公开页的场景。

---

## 项目结构（简览）

```
article-sys/
├─ app/
│  ├─ pages/            # 页面（首页、登录、注册、作者页、文章详情、dashboard、admin）
│  ├─ layouts/          # default / auth 布局
│  ├─ components/       # 公共组件
│  ├─ assets/css/       # 全局样式（字体优化等）
│  └─ app.config.ts     # UI 主题（primary=indigo, neutral=zinc）
├─ server/
│  ├─ api/              # 接口（auth、articles、admin、public 等）
│  ├─ database/         # drizzle schema
│  ├─ routes/og/        # OG 图片路由
│  └─ utils/            # db / og 等工具
├─ nuxt.config.ts       # 模块、图片优化、SSG routeRules、SEO head
├─ drizzle.config.ts    # drizzle-kit 配置
└─ .env.example         # 环境变量示例
```

---

## 许可证

私有项目，未经授权不得使用。
