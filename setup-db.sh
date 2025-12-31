#!/bin/bash

echo "========================================="
echo "博客后端登录系统 - 数据库设置"
echo "========================================="
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件"
    echo "📝 请创建 .env 文件并配置以下内容："
    echo ""
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/database_name?schema=public\""
    echo "JWT_SECRET=\"your-secret-key\""
    echo "PORT=3000"
    echo ""
    exit 1
fi

echo "✅ 找到 .env 文件"
echo ""

# 推送数据库 schema
echo "📦 正在推送数据库 schema..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库 schema 推送成功！"
    echo ""
    
    # 询问是否创建测试用户
    read -p "是否创建测试用户 (admin/123456)? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔧 启动服务器并创建测试用户..."
        
        # 启动服务器
        pnpm start:dev &
        SERVER_PID=$!
        
        echo "⏳ 等待服务器启动..."
        sleep 5
        
        # 创建用户
        curl -X POST http://localhost:3000/auth/register \
          -H "Content-Type: application/json" \
          -d '{"username":"admin","password":"123456","email":"admin@example.com"}' \
          --silent --show-error
        
        echo ""
        echo ""
        echo "✅ 测试用户创建成功！"
        echo "   用户名: admin"
        echo "   密码: 123456"
        echo ""
        
        # 停止服务器
        kill $SERVER_PID
        
        echo "服务器已停止"
    fi
    
    echo ""
    echo "========================================="
    echo "🎉 设置完成！"
    echo "========================================="
    echo ""
    echo "下一步:"
    echo "1. 启动服务器: pnpm start:dev"
    echo "2. 访问 http://localhost:3000"
    echo "3. 测试登录接口"
    echo ""
    echo "API 文档: 查看 AUTH_SETUP.md"
    echo ""
else
    echo ""
    echo "❌ 数据库 schema 推送失败"
    echo "请检查:"
    echo "1. PostgreSQL 是否正在运行"
    echo "2. .env 中的 DATABASE_URL 是否正确"
    echo "3. 数据库是否已创建"
    echo ""
fi
