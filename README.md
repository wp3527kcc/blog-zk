# 博客系统

基于 Next.js 16 App Router 构建的全栈博客平台，支持用户注册/登录、发帖删帖、点赞、图片上传等功能。

## 技术栈

| 类型 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS v4 |
| 数据库 | PostgreSQL（Neon 无服务器版） |
| 缓存 / Session | Upstash Redis |
| 认证 | 有状态 Session Token（UUID + Redis） |
| 图片存储 | 火山云 TOS + CDN |
| 部署 | Vercel |

## 功能特性

- 用户注册 / 登录 / 退出（Cookie Session，7 天有效）
- 发布、删除文章
- 博客列表 & 文章详情
- 点赞（乐观更新）
- 图片上传（火山云 TOS，单张 ≤ 5 MB）
- 路由守卫（访问 `/posts/new` 自动跳转登录）

---

## 本地开发

### 前置要求

- Node.js >= 20.9.0（推荐使用 [nvm](https://github.com/nvm-sh/nvm)）
- 一个 [Neon](https://neon.tech) PostgreSQL 数据库
- 一个 [Upstash](https://upstash.com) Redis 数据库
- 一个火山云 TOS Bucket（含 CDN 域名）

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd next-demo
npm install
```

### 2. 配置环境变量

复制示例文件并填入真实值：

```bash
cp .env.example .env
```

各变量说明见 `.env.example`。

### 3. 初始化数据库表

启动开发服务器后，**首次运行必须** 访问以下接口创建数据库表：

```bash
# 启动开发服务器
npm run dev

# 在另一个终端初始化 DB（只需执行一次）
curl http://localhost:3000/api/init
# 返回 {"success":true} 即为成功
```

### 4. 访问

打开 [http://localhost:3000](http://localhost:3000)

> **注意**：本机需使用 Node.js 20+。若使用 nvm，执行 `nvm use 20`。

---

## 部署到 Vercel

### 第一步：推送代码到 GitHub

```bash
git add .
git commit -m "feat: blog system"
git push origin main
```

### 第二步：在 Vercel 导入项目

1. 打开 [vercel.com/new](https://vercel.com/new)
2. 点击 **Import Git Repository**，选择你的 GitHub 仓库
3. Framework Preset 会自动识别为 **Next.js**，无需修改
4. 点击 **Environment Variables**，逐一添加以下变量：

### 第三步：配置环境变量

在 Vercel 项目 → **Settings → Environment Variables** 中添加：

> **Node.js 版本**：项目锁定 Node.js `20.x`，Vercel 会自动使用该版本构建。

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | Neon Pooler 连接串 | `postgres://user:pwd@host-pooler.region.aws.neon.tech/db?sslmode=require` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | `Adxx...` |
| `JWT_SECRET` | Session 签名密钥（随机字符串 ≥ 32 位） | `f6734b10-5272-...` |
| `TOS_ACCESS_KEY_ID` | 火山云 AccessKey ID | `AKLTZj...` |
| `TOS_ACCESS_KEY_SECRET` | 火山云 AccessKey Secret | `TXpne...` |
| `TOS_ENDPOINT` | TOS 服务端点 | `tos-cn-beijing.volces.com` |
| `TOS_REGION` | TOS 地域 | `cn-beijing` |
| `BUCKET_NAME` | TOS Bucket 名称 | `my-blog-images` |
| `CDNBASEURL` | 图片 CDN 域名（末尾带 `/`） | `https://cdn.example.com/` |

> **重要**：`DATABASE_URL` 必须使用 Neon 的 **Pooler** 端点（URL 中含 `-pooler`），普通端点在 Vercel 无服务器环境下会因连接数限制报错。

### 第四步：部署

点击 **Deploy**，等待构建完成（约 30~60 秒）。

### 第五步：初始化数据库（首次部署后必做）

部署成功后，访问以下 URL 创建数据库表：

```
https://<your-project>.vercel.app/api/init
```

页面返回 `{"success":true,"message":"数据库初始化成功"}` 即完成。

> 此操作使用 `CREATE TABLE IF NOT EXISTS`，重复执行不会破坏数据，安全。

---

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 博客首页（文章列表）
│   ├── login/page.tsx        # 登录页
│   ├── register/page.tsx     # 注册页
│   ├── posts/
│   │   ├── new/page.tsx      # 发布文章
│   │   └── [id]/page.tsx     # 文章详情
│   └── api/
│       ├── init/route.ts     # 数据库初始化
│       └── upload/route.ts   # 图片上传（火山云 TOS）
├── components/
│   ├── Navbar.tsx            # 顶部导航
│   ├── LikeButton.tsx        # 点赞按钮（客户端，乐观更新）
│   ├── DeleteButton.tsx      # 删除按钮（客户端，含确认弹窗）
│   └── ImageUpload.tsx       # 图片上传组件
├── lib/
│   ├── actions.ts            # Server Actions（登录/注册/发帖/点赞）
│   ├── auth.ts               # Session 管理（Redis）
│   ├── db.ts                 # PostgreSQL 连接 & 表初始化
│   ├── redis.ts              # Upstash Redis 客户端
│   ├── tos.ts                # 火山云 TOS 客户端
│   └── types.ts              # TypeScript 类型定义
└── proxy.ts                  # 路由守卫（Next.js 16 Proxy）
```

## 数据库表结构

```sql
-- 用户表
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文章表
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  content    TEXT NOT NULL,           -- 支持 ![alt](url) 图片语法
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 点赞表
CREATE TABLE likes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
```

## 图片上传说明

- 接口：`POST /api/upload`（需登录）
- 限制：单张 ≤ 5 MB，支持 JPG / PNG / GIF / WebP
- 存储路径：`blog/images/{年}/{月}/{UUID}.{ext}`
- 上传成功后，图片 URL 以 `![图片](url)` 格式插入正文
- 文章详情页自动将 `![alt](url)` 渲染为 `<img>` 标签
