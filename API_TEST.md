# API 测试脚本

## 1. 获取验证码

```bash
curl http://localhost:3000/auth/captcha
```

**响应示例:**

```json
{
  "key": "abc123xyz",
  "image": "<svg>...</svg>"
}
```

## 2. 注册测试用户

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "123456",
    "email": "admin@example.com"
  }'
```

## 3. 登录（替换验证码值）

首先获取验证码，查看 SVG 图片中的文字，然后：

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "123456",
    "captcha": "ABCD",
    "captchaKey": "abc123xyz"
  }'
```

## 4. 测试错误次数限制

连续 5 次输入错误的验证码或密码：

```bash
# 第 1 次错误
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrong",
    "captcha": "WRONG",
    "captchaKey": "test-key"
  }'

# 重复 5 次后，会看到锁定提示
```

## Node.js 测试脚本

创建 `test-login.js`:

```javascript
const BASE_URL = 'http://localhost:3000';

async function testLogin() {
  try {
    // 1. 获取验证码
    console.log('1. 获取验证码...');
    const captchaRes = await fetch(`${BASE_URL}/auth/captcha`);
    const { key, image } = await captchaRes.json();
    console.log('✅ 验证码 Key:', key);
    console.log(
      '📝 请查看验证码图片（浏览器中打开）:\n',
      image.substring(0, 100) + '...',
    );

    // 2. 模拟登录（需要手动输入验证码）
    const captchaInput = 'ABCD'; // 这里需要根据实际验证码修改

    console.log('\n2. 尝试登录...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: '123456',
        captcha: captchaInput,
        captchaKey: key,
      }),
    });

    const loginData = await loginRes.json();

    if (loginRes.ok) {
      console.log('✅ 登录成功!');
      console.log('Token:', loginData.access_token);
      console.log('User:', loginData.user);
    } else {
      console.log('❌ 登录失败:', loginData.message);
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testLogin();
```

运行测试：

```bash
node test-login.js
```
