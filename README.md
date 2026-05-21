# Blog ZK

基于 Next.js 16 App Router 构建的全栈博客平台，支持 Markdown 写作、标签、关注、通知、全文搜索等完整社区功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16.2（App Router，React Server Components） |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS v4 + @tailwindcss/typography |
| 数据库 | PostgreSQL（Neon，`postgres` 驱动） |
| 缓存 / 会话 | Upstash Redis（HTTP REST SDK） |
| 邮件 | Nodemailer（SMTP，支持 QQ 邮箱等） |
| 图片存储 | 本地 `public/uploads/`（已内置火山引擎 TOS SDK，可扩展） |
| Markdown | react-markdown + remark-gfm |
| 包管理 | pnpm |

---

## 功能一览

### 账户体系
- 注册 / 登录 / 登出
- **邮箱验证**：注册后需验证邮箱才能登录，验证链接 24 小时有效
- 会话存储于 Upstash Redis（Cookie `auth-token` + UUID token，7 天有效），服务端登出立即失效
- 密码 bcrypt 哈希存储

### 文章
- **写文章**：标题、正文（完整 Markdown）、封面图上传、标签（逗号分隔，最多 10 个）
- **实时预览**：写文章 / 编辑页均支持左右分栏 Markdown 实时预览
- **草稿自动保存**：写文章时每 1 秒防抖写入 localStorage，刷新后可恢复
- **封面图**：列表卡片和详情页均展示封面图缩略图
- **编辑 / 删除**：仅作者可操作，编辑页预填所有字段
- **阅读量统计**：Redis `SET NX` + 1 小时去重（已登录用户按 userId，匿名按 IP），写入 PostgreSQL `views` 列

### 首页
- **全部 / 关注** Tab 切换（已登录用户可切到「关注」Feed）
- **无限滚动分页**：首屏服务端渲染前 10 篇，滚动到底部后客户端自动加载下一页（`IntersectionObserver`），无需手动点击
- **全文搜索**：PostgreSQL `to_tsvector + plainto_tsquery`（`simple` 配置，支持中文）
- **标签过滤**：点击标签胶囊按标签筛选
- 搜索 × 标签 × Feed 三个维度可叠加，URL 参数 `?q=&tag=&feed=following`

### 标签
- 多对多（`tags` + `post_tags` 表）
- 写 / 编辑时用逗号分隔输入，自动 upsert
- 首页标签栏、文章详情均可点击跳转过滤

### 评论
- 登录后可发评论（最多 1000 字）
- 支持 `@用户名` 提及，渲染为可点击蓝色链接，跳转个人主页
- 点赞评论
- 评论作者或文章作者可删除评论

### 点赞
- 文章点赞，乐观更新 UI
- 评论点赞

### 关注 / 订阅
- 关注 / 取关其他用户（不能关注自己）
- 个人主页展示关注者数 / 关注中数
- 首页「关注」Feed 只显示已关注作者的文章

### 通知中心
触发场景：

| 事件 | 站内通知 | 邮件 |
|------|---------|------|
| 有人评论我的文章 | ✅ | ❌ |
| 有人点赞我的文章 | ✅ | ❌ |
| 有人点赞我的评论 | ✅ | ❌ |
| 有人关注我 | ✅ | ❌ |
| 评论中被 @ 提及 | ✅ | ✅ |

- `/notifications` 页面：最近 100 条，未读高亮 + 蓝色圆点
- 点击单条 → 标为已读 + 跳转目标页
- 「全部标为已读」一键清空
- Navbar 铃铛图标实时展示未读数（>99 显示 99+）

### 个人主页 `/users/[username]`
- 用户头像（首字母渐变）、加入时间
- 统计数据：文章数 / 总阅读量 / 获赞数 / 关注者数 / 关注中数
- 发布的全部文章列表（含标签、阅读量、点赞数）
- 自己看自己时：「写文章」按钮 + 「这是你」标签
- 看他人时：「关注 / 已关注」按钮（乐观更新）

---

## 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（Navbar + 全局样式）
│   ├── page.tsx                # 首页（搜索 / 标签 / Feed，无限滚动分页）
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── notifications/page.tsx  # 通知中心
│   ├── posts/
│   │   ├── new/page.tsx        # 写文章（含草稿 / 预览）
│   │   └── [id]/
│   │       ├── page.tsx        # 文章详情（阅读计数 / Markdown渲染）
│   │       └── edit/page.tsx   # 编辑文章（含预览）
│   ├── users/[username]/page.tsx  # 个人主页
│   └── api/
│       ├── init/route.ts       # GET /api/init — 执行数据库迁移
│       ├── upload/route.ts     # POST /api/upload — 上传图片到本地
│       └── posts/[id]/route.ts # GET /api/posts/:id — 供编辑页加载数据
├── components/
│   ├── Navbar.tsx              # 顶部导航（未读通知徽标）
│   ├── MarkdownContent.tsx     # react-markdown 渲染器
│   ├── LikeButton.tsx          # 文章点赞（乐观更新）
│   ├── CommentLikeButton.tsx   # 评论点赞（乐观更新）
│   ├── DeleteButton.tsx        # 删除文章
│   ├── FollowButton.tsx        # 关注 / 取关（乐观更新）
│   ├── PostCard.tsx            # 文章卡片（首页 / 用户页复用）
│   ├── HomePostList.tsx        # 首页无限滚动列表（客户端组件）
│   ├── CommentSection.tsx      # 评论区容器
│   ├── CommentItem.tsx         # 单条评论（@mention 高亮）
│   └── ImageUpload.tsx         # 图片上传（复用于封面图 / 正文插图）
└── lib/
    ├── db.ts                   # PostgreSQL 连接 + initDb() 建表
    ├── auth.ts                 # 会话管理（Cookie + Redis）
    ├── redis.ts                # Upstash Redis 单例
    ├── actions.ts              # 全部 Server Actions
    ├── notifications.ts        # 站内通知创建 + @mention 解析
    ├── email.ts                # Nodemailer SMTP 发送 + 邮件模板
    ├── tos.ts                  # 火山引擎 TOS 客户端（已就位，未启用）
    └── types.ts                # TypeScript 类型定义
```

---

## 数据库设计

所有表通过 `GET /api/init` 幂等创建（`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`）。

```
users
  id · username · email · password_hash · created_at
  email_verified · email_verification_token · email_verification_sent_at

posts
  id · title · content · cover_image · author_id → users
  views · created_at · updated_at

likes
  id · user_id → users · post_id → posts  (UNIQUE user_id+post_id)

comments
  id · content · author_id → users · post_id → posts · created_at

comment_likes
  id · user_id → users · comment_id → comments  (UNIQUE user_id+comment_id)

tags
  id · name (UNIQUE) · slug (UNIQUE)

post_tags
  post_id → posts · tag_id → tags  (PRIMARY KEY 复合)

follows
  follower_id → users · following_id → users  (PRIMARY KEY 复合, CHECK follower≠following)

notifications
  id · user_id → users · actor_id → users
  type: mention | follow | comment | like | comment_like
  post_id → posts · comment_id → comments
  content · read_at · created_at
  INDEX: (user_id, read_at, created_at DESC)
```

---

## 邮箱验证流程

1. **用户注册** → 填写用户名、邮箱、密码
2. **发送验证邮件** → 系统生成随机 token，发送含验证链接的邮件（24小时有效）
3. **等待验证页面** → 提示用户查收邮件，提供「重新发送」按钮
4. **点击验证链接** → `/verify-email?token=xxx` 验证邮箱并激活账号
5. **登录检查** → 未验证邮箱的用户登录时会提示验证，并提供重新发送入口

---

## 快速开始

### 1. 克隆并安装依赖

```bash
use20          # 切换到 Node.js 20
pnpm install
```

### 2. 配置环境变量

复制 `.env.example`（或直接新建 `.env`）并填写：

```env
# PostgreSQL（推荐 Neon 免费套餐）
DATABASE_URL=postgres://...

# Upstash Redis（upstash.com 免费套餐）
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# SMTP 邮件（注册邮箱验证必需，不配置时邮件仅打日志，验证功能不可用）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ号@qq.com
SMTP_PASS=QQ邮箱授权码
SMTP_FROM="博客 <你的QQ号@qq.com>"

# 应用基础 URL（邮件中的跳转链接会用到）
APP_BASE_URL=http://localhost:3000
```

> **SMTP 获取方式**：QQ邮箱 → 设置 → 账户 → 开启 SMTP → 生成授权码
>
> **注意**：邮箱验证是注册流程的必要环节，请确保 SMTP 配置正确，否则新用户无法完成注册验证。

### 3. 初始化数据库

启动开发服务器后访问一次：

```
http://localhost:3000/api/init
```

返回 `{"success":true}` 即表示所有表创建成功。**每次新增表结构后都需要重新访问此接口**。

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000`

### 5. 构建生产版本

```bash
pnpm build
pnpm start
```

### 6. 运行 Cursor Agent 命令行 Demo

`agent/demo.js` 支持在命令行选择模型、输入多行提示词，并以逐字效果输出回复：

```bash
use20
node agent/demo.js
```

脚本会自动读取项目根目录 `.env` 中的 `CURSOR_API_KEY`；如果命令行环境已设置同名变量，则优先使用命令行环境变量。
在 pnpm 安装的 Windows 环境下，脚本也会自动定位 `@cursor/sdk-win32-x64` 自带的 `rg.exe`，避免本地 Agent 扫描工作区时报 `Ripgrep path not configured`。

如需调整逐字输出速度，可设置毫秒级延迟：

```bash
TYPEWRITER_DELAY_MS=0 node agent/demo.js
```

---

## 图片上传说明

图片通过 **Vercel Blob** 存储，上传后返回公开 CDN URL，路径格式为 `uploads/YYYY/MM/<uuid>.<ext>`。

需在 `.env` 中配置：

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Token 在 [Vercel Dashboard](https://vercel.com/dashboard) → 项目 → Storage → Blob → 创建 Token 获取。本地开发与生产环境使用同一 Token 即可。

项目中保留了**火山引擎 TOS SDK**（`src/lib/tos.ts`），如需切换，修改 `src/app/api/upload/route.ts` 调用 `tosClient.putObject()` 并配置以下环境变量：

```env
TOS_ACCESS_KEY_ID=...
TOS_ACCESS_KEY_SECRET=...
TOS_ENDPOINT=tos-cn-beijing.volces.com
TOS_REGION=cn-beijing
BUCKET_NAME=your-bucket
CDNBASEURL=https://your-cdn.example.com/
```

---

## 开发规范

> 详见 [AGENTS.md](./AGENTS.md)

- 始终使用 **git bash** 执行命令，禁用 PowerShell
- 安装包前先执行 `use20` 切换 Node.js 20
- 包管理统一使用 **pnpm**（`pnpm add`，`pnpm add -D`）

---

## 主要依赖版本

| 包 | 版本 |
|----|------|
| next | 16.2.3 |
| react | 19.2.4 |
| typescript | ^5 |
| tailwindcss | ^4 |
| postgres | ^3.4.9 |
| @upstash/redis | ^1.37.0 |
| nodemailer | ^8.0.7 |
| react-markdown | ^10.1.0 |
| remark-gfm | ^4.0.1 |
| bcryptjs | ^3.0.3 |
| @volcengine/tos-sdk | ^2.9.1 |
