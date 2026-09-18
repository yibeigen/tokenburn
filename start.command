#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 未检测到 Node.js，请先安装: https://nodejs.org/  (需 22.5+)"
  read -p "按回车退出..."
  exit 1
fi
node bin/tokenburn.js "$@"