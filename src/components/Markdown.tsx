import { useMemo } from 'react'
import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)

const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'xml',
  // Однофайловый компонент Vue — это разметка с вложенными script и style
  vue: 'xml',
  sh: 'bash',
  shell: 'bash',
}

const marked = new Marked({ gfm: true, breaks: false })

marked.use({
  renderer: {
    code({ text, lang }) {
      const name = ALIASES[lang ?? ''] ?? lang ?? ''
      const highlighted = hljs.getLanguage(name)
        ? hljs.highlight(text, { language: name, ignoreIllegals: true }).value
        : escapeHtml(text)
      return `<pre><code class="hljs">${highlighted}</code></pre>`
    },
  },
})

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

/**
 * Заметки и карточки — локальный контент самого пользователя, поэтому HTML в них
 * рендерится как есть; санитайзер не подключаем, чтобы не ломать примеры разметки.
 */
export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => marked.parse(text ?? '') as string, [text])
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
