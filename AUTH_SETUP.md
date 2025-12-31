# 后端登录系统设置指南

## 数据库配置

### 1. 配置 PostgreSQL 连接

在项目根目录创建或编辑 `.env` 文件：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
```

**示例配置：**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blog_db?schema=public"
JWT_SECRET="my-secret-key-123456"
PORT=3000
```

### 2. 生成 Prisma Client 并创建数据库表

```bash
# 生成 Prisma Client
npx prisma generate

# 创建数据库迁移
npx prisma migrate dev --name init

# 或者直接推送 schema 到数据库（开发环境）
npx prisma db push
```

### 3. 创建测试用户

启动服务器后，使用以下接口创建测试用户：

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "123456",
    "email": "admin@example.com"
  }'
```

## API 接口说明

### 1. 获取验证码

**接口：** `GET /auth/captcha`

**响应示例：**

```json
{
  "key": "abc123def456",
  "image": "<svg>...</svg>"
}
```

前端将 `image` 渲染为 SVG 验证码图片，保存 `key` 用于登录验证。

### 2. 用户登录

**接口：** `POST /auth/login`

**请求体：**

```json
{
  "username": "admin",
  "password": "123456",
  "captcha": "ABCD",
  "captchaKey": "abc123def456"
}
```

**成功响应：**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxx123456",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**失败响应：**

- 验证码错误：`400 Bad Request - "Invalid verification code"`
- 密码错误：`401 Unauthorized - "Invalid username or password"`
- 锁定状态：`401 Unauthorized - "Too many failed attempts. Please try again in XX seconds."`

### 3. 注册用户（测试用）

**接口：** `POST /auth/register`

**请求体：**

```json
{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com"
}
```

## 安全特性

### 1. 验证码机制

- 每次获取验证码都会生成新的 SVG 图片
- 验证码有效期 5 分钟
- 一次性使用，验证后自动失效

### 2. 连续错误限制

- 最多允许 5 次失败尝试（包括验证码错误和密码错误）
- 达到限制后锁定 1 分钟
- 基于 IP 地址进行限制
- 成功登录后自动清除失败记录

### 3. 密码加密

- 使用 bcrypt 加密存储密码
- 加盐强度：10 rounds

### 4. JWT Token

- 默认有效期：24 小时
- 包含用户 ID 和用户名

## 前端集成示例

```typescript
// 1. 获取验证码
const captchaResponse = await fetch('http://localhost:3000/auth/captcha');
const { key, image } = await captchaResponse.json();

// 2. 渲染验证码（React）
<div dangerouslySetInnerHTML={{ __html: image }} />

// 3. 登录
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: '123456',
    captcha: userInputCaptcha,
    captchaKey: key,
  }),
});

const { access_token, user } = await loginResponse.json();
```

## 数据库模型

### User 表

- `id`: 主键 (cuid)
- `username`: 用户名（唯一）
- `password`: 加密密码
- `email`: 邮箱（可选，唯一）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### LoginAttempt 表

- `id`: 主键 (cuid)
- `identifier`: 标识符（IP 地址）
- `failedCount`: 失败次数
- `lockedUntil`: 锁定截止时间
- `lastAttemptAt`: 最后尝试时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 常用命令

```bash
# 启动开发服务器
pnpm start:dev

# 查看数据库
npx prisma studio

# 重置数据库
npx prisma migrate reset

# 生成新的迁移
npx prisma migrate dev --name <migration-name>
```

## 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- pnpm（推荐）或 npm
