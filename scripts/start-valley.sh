#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== 余烬 · 纪念碑谷服务启动 ==="

if [ ! -f .env ]; then
  echo "警告: .env 文件不存在，将使用默认环境变量"
  echo "提示: 复制 .env.example 为 .env 并配置相关参数"
fi

echo "正在启动服务..."
docker compose up -d --build

echo "等待服务就绪..."
sleep 3

if docker compose ps valley-server | grep -q "healthy\|Up"; then
  echo ""
  echo "✓ 纪念碑谷服务已启动"
  echo "  访问地址: http://localhost:3001"
  echo "  健康检查: http://localhost:3001/api/health"
  echo ""
  echo "常用命令:"
  echo "  查看日志: docker compose logs -f valley-server"
  echo "  停止服务: docker compose down"
  echo "  重启服务: docker compose restart"
else
  echo "✗ 服务启动失败，请查看日志:"
  docker compose logs valley-server
  exit 1
fi
