#!/bin/bash
# Запуск тренажёра из .app-бандла: поднимает продакшн-сервер и открывает браузер.
# Приложения, запущенные из Finder, получают урезанный PATH без nvm и Homebrew,
# поэтому node ищется явно.

set -u
PROJECT="__PROJECT_DIR__"
PORT=5174
URL="http://localhost:$PORT"

die() {
  /usr/bin/osascript -e "display alert \"Interview Trainer\" message \"$1\" as critical" >/dev/null 2>&1
  exit 1
}

find_node() {
  # 1) nvm — берём самую свежую установленную версию
  local nvm_dir="$HOME/.nvm/versions/node"
  if [ -d "$nvm_dir" ]; then
    local latest
    latest=$(/bin/ls -1 "$nvm_dir" 2>/dev/null | /usr/bin/sort -t. -k1.2,1n -k2,2n -k3,3n | /usr/bin/tail -1)
    [ -n "$latest" ] && [ -x "$nvm_dir/$latest/bin/node" ] && { echo "$nvm_dir/$latest/bin/node"; return; }
  fi
  # 2) Homebrew и системные пути
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    [ -x "$candidate" ] && { echo "$candidate"; return; }
  done
  # 3) то, что вдруг оказалось в PATH
  command -v node 2>/dev/null
}

cd "$PROJECT" 2>/dev/null || die "Папка проекта не найдена:\n$PROJECT\n\nЕсли проект переехал, пересоберите приложение: npm run make-app"

NODE=$(find_node)
[ -n "$NODE" ] && [ -x "$NODE" ] || die "Не найден Node.js.\nУстановите его или запустите проект вручную: npm run dev"
export PATH="$(/usr/bin/dirname "$NODE"):$PATH"

# Уже запущено? Просто открываем вкладку и выходим.
if /usr/bin/curl -fsS --max-time 1 "$URL/api/config" >/dev/null 2>&1; then
  /usr/bin/open "$URL"
  exit 0
fi

# Первый запуск после клонирования/обновления: доустановить зависимости и собрать
if [ ! -d node_modules ]; then
  /usr/bin/osascript -e 'display notification "Устанавливаю зависимости, это разово" with title "Interview Trainer"' >/dev/null 2>&1
  npm ci >/tmp/interview-trainer-install.log 2>&1 || npm install >>/tmp/interview-trainer-install.log 2>&1 \
    || die "Не удалось установить зависимости.\nЛог: /tmp/interview-trainer-install.log"
fi

if [ ! -f dist/index.html ]; then
  /usr/bin/osascript -e 'display notification "Собираю приложение…" with title "Interview Trainer"' >/dev/null 2>&1
  npm run build >/tmp/interview-trainer-build.log 2>&1 \
    || die "Сборка не прошла.\nЛог: /tmp/interview-trainer-build.log"
fi

# Открываем браузер, как только сервер ответит
(
  for _ in $(seq 1 60); do
    if /usr/bin/curl -fsS --max-time 1 "$URL/api/config" >/dev/null 2>&1; then
      /usr/bin/open "$URL"
      exit 0
    fi
    sleep 0.25
  done
) &

# Сервер держим на переднем плане: пока он жив — приложение видно в доке,
# и «Завершить» из дока корректно его останавливает.
export API_PORT="$PORT"
export NODE_ENV=production
exec "$NODE" server/index.mjs >>/tmp/interview-trainer.log 2>&1
