#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_PATH="/app/data/valley.db"
BACKUP_FILE="valley_${TIMESTAMP}.db"
CONTAINER_NAME="${CONTAINER_NAME:-ember-valley}"

mkdir -p "$BACKUP_DIR"

echo "=== 纪念碑谷数据库备份 ==="
echo "容器: $CONTAINER_NAME"
echo "备份目录: $BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "✗ 容器 $CONTAINER_NAME 未运行"
  exit 1
fi

echo "正在创建数据库快照..."

docker exec "$CONTAINER_NAME" sh -c "sqlite3 $DB_PATH '.backup /tmp/backup_tmp.db'"

echo "正在复制备份文件..."
docker cp "${CONTAINER_NAME}:/tmp/backup_tmp.db" "${BACKUP_DIR}/${BACKUP_FILE}"

docker exec "$CONTAINER_NAME" rm -f /tmp/backup_tmp.db

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo ""
echo "✓ 备份完成"
echo "  文件: $BACKUP_FILE"
echo "  大小: $BACKUP_SIZE"
echo "  路径: $BACKUP_DIR/$BACKUP_FILE"

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "valley_*.db" -type f | wc -l)
echo ""
echo "当前备份数量: $BACKUP_COUNT 个"

if [ "$BACKUP_COUNT" -gt 10 ]; then
  echo "清理旧备份（保留最近 10 个）..."
  cd "$BACKUP_DIR"
  ls -t valley_*.db | tail -n +11 | xargs rm -f
  echo "已清理旧备份"
fi
