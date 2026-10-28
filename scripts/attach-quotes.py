#!/usr/bin/env python3
"""
Переносит блоки «Как звучало на собеседовании» из конспектов в карточки:
дословная реплика интервьюера кладётся в поле `asked` у карточки с тегом «устно».

Запуск: python3 scripts/attach-quotes.py "<папка с конспектами>"
"""
import json
import pathlib
import re
import sys

NOTES = pathlib.Path(sys.argv[1])
SEED = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'seed'

# префикс id карточек ← номер исходного файла
PREFIX = {'1': 'ht', '2': 'js', '3': 'rk', '4': 'ts',
          '5': 'ar', '6': 'br', '7': 'lc', '8': 'pr'}

quotes = {}  # id карточки -> дословная реплика

for md in sorted(NOTES.glob('*.md')):
    file_no = md.name.split('.')[0].strip()
    prefix = PREFIX.get(file_no)
    if not prefix:
        continue

    question_no = None
    collecting = False
    buffer = []

    for line in md.read_text(encoding='utf-8').splitlines():
        heading = re.match(r'^##\s+(\d+)\.', line)
        if heading:
            question_no = heading.group(1)
            collecting = False
            buffer = []
            continue

        if re.match(r'^>\s*\[!quote\]', line):
            collecting = True
            buffer = []
            continue

        if collecting:
            if line.startswith('>'):
                text = re.sub(r'^>\s?', '', line).strip()
                if text:
                    buffer.append(text)
                continue
            # блок закончился
            if buffer and question_no:
                quotes[f'{prefix}-{question_no}-1'] = ' '.join(buffer)
            collecting = False
            buffer = []

    if collecting and buffer and question_no:
        quotes[f'{prefix}-{question_no}-1'] = ' '.join(buffer)


def clean(text: str) -> str:
    """Убирает markdown-ссылки-таймкоды вида [54](#) и голые тайминги."""
    text = re.sub(r'\[([^\]]*)\]\(#\)', '', text)
    text = re.sub(r'\s+(\d{1,2}:\d{2}(?:[–-]\d{1,2}:\d{2})?|\d{2})(?=[\s,;.]|$)', '', text)
    return re.sub(r'\s{2,}', ' ', text).strip()


attached = missing = 0
for path in sorted(SEED.glob('1*.json')):
    bundle = json.loads(path.read_text(encoding='utf-8'))
    changed = False
    for card in bundle['cards']:
        if 'устно' not in card.get('tags', []):
            continue
        quote = quotes.get(card['id'])
        if quote:
            card['asked'] = clean(quote)
            attached += 1
            changed = True
        else:
            missing += 1
            print(f'  без реплики: {card["id"]}')
    if changed:
        path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print(f'\nРеплик найдено в конспектах: {len(quotes)}')
print(f'Привязано к карточкам: {attached}, без реплики: {missing}')
