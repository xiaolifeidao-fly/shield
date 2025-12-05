#!/bin/bash

# 项目文件复制脚本
# 功能：根据 .gitignore 规则，复制所有未被忽略的文件到目标目录

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
  echo -e "${RED}错误：请指定目标目录${NC}"
  echo "用法: $0 <目标目录>"
  echo "示例: $0 /path/to/destination"
  exit 1
fi

TARGET_DIR="$1"

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}错误：当前目录不是 git 仓库${NC}"
  exit 1
fi

# 创建目标目录
mkdir -p "$TARGET_DIR"

echo -e "${BLUE}开始复制文件...${NC}"
echo -e "${BLUE}源目录: $(pwd)${NC}"
echo -e "${BLUE}目标目录: $TARGET_DIR${NC}"
echo ""

# 初始化计数器
file_count=0
dir_count=0

# 获取脚本自身的文件名（相对路径）
SCRIPT_NAME=$(basename "$0")

# 使用 git ls-files 获取所有未被忽略的文件（包括已暂存和未暂存的）
# -c 表示显示缓存的文件（已跟踪的）
# -o 表示显示其他文件（未跟踪的）
# --exclude-standard 表示使用标准的排除规则（.gitignore）
git ls-files -c -o --exclude-standard | while IFS= read -r file; do
  # 跳过目录
  if [ -d "$file" ]; then
    continue
  fi
  
  # 跳过脚本自身
  if [ "$(basename "$file")" = "$SCRIPT_NAME" ]; then
    echo -e "${BLUE}⊘${NC} $file (跳过脚本自身)"
    continue
  fi
  
  # 跳过 .git 目录下的所有文件
  if [[ "$file" == .git/* ]] || [[ "$file" == .git ]]; then
    continue
  fi
  
  # 构建目标文件路径
  target_file="$TARGET_DIR/$file"
  target_dir=$(dirname "$target_file")
  
  # 创建目标目录（如果不存在）
  if [ ! -d "$target_dir" ]; then
    mkdir -p "$target_dir"
  fi
  
  # 复制文件
  if [ -f "$file" ]; then
    cp -p "$file" "$target_file"
    echo -e "${GREEN}✓${NC} $file"
    ((file_count++))
  fi
done

echo ""
echo -e "${GREEN}复制完成！${NC}"
echo -e "共复制 ${GREEN}${file_count}${NC} 个文件到 ${BLUE}${TARGET_DIR}${NC}"

