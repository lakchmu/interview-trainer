#!/bin/bash
# Обновляет встроенные конспекты (data/notes) из внешней папки.
#
# Конспекты живут внутри приложения, чтобы оно ни от чего не зависело. Но если
# исходники правятся в Obsidian, снимок нужно обновлять — вот этим.
#
#   npm run sync-notes                  — из папки, указанной в .notes-src
#   npm run sync-notes -- "/путь/к/папке"
#   npm run sync-notes -- "/путь" --force  — перезаписать даже расходящиеся
#
# Копируются только .md. Ничего не удаляется и не пишется обратно в источник.

set -euo pipefail

# Папка по умолчанию — из файла .notes-src в корне проекта (в git не попадает:
# это путь на конкретной машине).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_SRC=""
[ -f "$ROOT_DIR/.notes-src" ] && DEFAULT_SRC="$(head -n 1 "$ROOT_DIR/.notes-src")"
SRC="${1:-$DEFAULT_SRC}"
[ "$SRC" = "--force" ] && SRC="$DEFAULT_SRC"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data/notes"

if [ ! -d "$SRC" ]; then
  echo "✗ Папка не найдена:"
  echo "  $SRC"
  echo
  echo "  Укажи свою:  npm run sync-notes -- \"/путь/к/папке\""
  exit 1
fi

shopt -s nullglob
files=("$SRC"/*.md)
if [ ${#files[@]} -eq 0 ]; then
  echo "✗ В папке нет .md-файлов: $SRC"
  exit 1
fi

# Встроенная копия — не просто снимок: её правят прямо здесь (переработка
# разделов, схемы). Поэтому расхождение НЕ значит «источник новее»: молча
# затирать местные правки нельзя. Перезапись только по явному --force.
FORCE=0
for a in "$@"; do [ "$a" = "--force" ] && FORCE=1; done

mkdir -p "$DEST"
changed=0
added=0
conflicts=()
for f in "${files[@]}"; do
  name="$(basename "$f")"
  if [ ! -f "$DEST/$name" ]; then
    cp "$f" "$DEST/$name"; added=$((added + 1))
    echo "  + $name"
  elif ! cmp -s "$f" "$DEST/$name"; then
    if [ "$FORCE" = "1" ]; then
      cp "$f" "$DEST/$name"; changed=$((changed + 1))
      echo "  ~ $name (перезаписан)"
    else
      conflicts+=("$name")
    fi
  fi
done

if [ ${#conflicts[@]} -gt 0 ]; then
  echo
  echo "⚠ Расходятся с источником (НЕ тронуты):"
  for c in "${conflicts[@]}"; do echo "    $c"; done
  echo
  echo "  Встроенная копия могла быть переработана прямо в проекте — схемы,"
  echo "  разбивка на разделы. Перезапись потеряет эти правки."
  echo "  Посмотреть разницу:"
  echo "    diff \"$SRC/<файл>\" \"$DEST/<файл>\""
  echo "  Перезаписать всё равно:"
  echo "    npm run sync-notes -- \"$SRC\" --force"
fi

# Файлы, которых в источнике больше нет, оставляем: отметки чтения и карточки
# привязаны к именам, и молча удалять материал вместе с прогрессом нельзя.
for d in "$DEST"/*.md; do
  name="$(basename "$d")"
  [ -f "$SRC/$name" ] || echo "  ! $name — в источнике больше нет, оставлен на месте"
done

echo
echo "Готово: файлов ${#files[@]}, новых $added, обновлено $changed, расхождений ${#conflicts[@]}."
[ $((added + changed)) -gt 0 ] && echo "Перезапусти приложение, чтобы оно перечитало конспекты."
exit 0
