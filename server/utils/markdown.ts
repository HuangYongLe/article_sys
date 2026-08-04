import MarkdownIt from 'markdown-it'
import Shiki from '@shikijs/markdown-it'
import sanitizeHtml from 'sanitize-html'

/** 代码高亮支持的语言白名单（限定体积） */
const HIGHLIGHT_LANGS = [
  'javascript', 'typescript', 'vue', 'html', 'css', 'json', 'bash', 'shell',
  'python', 'go', 'rust', 'java', 'sql', 'yaml', 'markdown', 'diff', 'tsx', 'jsx',
]

let _md: MarkdownIt | null = null
let _initializing: Promise<MarkdownIt> | null = null

/**
 * Markdown 渲染器单例。三道防线：
 * 1. markdown-it `html: false` —— 源文档中的原生 HTML 一律转义
 * 2. markdown-it 默认 validateLink —— 拦截 javascript:/vbscript:/file: 等危险协议
 * 3. sanitize-html 白名单 —— 输出层兜底过滤
 */
async function getRenderer(): Promise<MarkdownIt> {
  if (_md) return _md
  if (_initializing) return _initializing
  _initializing = (async () => {
    const md = new MarkdownIt({ html: false, linkify: true, breaks: false })
    md.use(await Shiki({
      themes: { light: 'github-light', dark: 'github-dark' },
      langs: HIGHLIGHT_LANGS,
      fallbackLanguage: 'text',
      defaultLanguage: 'text',
    }))
    // 外链加 rel/target
    const defaultLinkOpen = md.renderer.rules.link_open
      ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const href = tokens[idx]!.attrGet('href') ?? ''
      if (/^https?:\/\//i.test(href)) {
        tokens[idx]!.attrSet('target', '_blank')
        tokens[idx]!.attrSet('rel', 'noopener noreferrer nofollow')
      }
      return defaultLinkOpen(tokens, idx, options, env, self)
    }
    _md = md
    return md
  })()
  return _initializing
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote',
    'ul', 'ol', 'li', 'strong', 'em', 's', 'del', 'a', 'img',
    'pre', 'code', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'loading'],
    // Shiki 高亮依赖内联 style 与 class
    span: ['style', 'class'],
    pre: ['style', 'class', 'tabindex'],
    code: ['class'],
    th: ['align'],
    td: ['align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  disallowedTagsMode: 'discard',
}

/** Markdown → 安全 HTML（发布/保存时调用，结果缓存到 articles.content_html） */
export async function renderMarkdown(content: string): Promise<string> {
  const md = await getRenderer()
  return sanitizeHtml(md.render(content), SANITIZE_OPTIONS)
}

/** 粗略字数统计：CJK 每字计 1，其余按空白分词计 1 */
export function countWords(content: string): number {
  const stripped = content
    .replace(/```[\s\S]*?```/g, ' ') // 代码块不计
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接/图片保留文字
    .replace(/[#>*`~\-_|]/g, ' ')
  const cjk = (stripped.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) ?? []).length
  const words = stripped
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return cjk + words
}

/** 从正文提取纯文本摘要（用户未填 summary 时兜底） */
export function extractSummary(content: string, max = 160): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`~\-_|[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}
