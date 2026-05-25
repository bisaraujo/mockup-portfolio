import DOMPurify from 'dompurify'

const inlineStyleToImportant = (styleText) => {
  if (!styleText) return ''

  return styleText
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colonIndex = part.indexOf(':')
      if (colonIndex === -1) return part

      const prop = part.slice(0, colonIndex).trim()
      const value = part.slice(colonIndex + 1).trim()
      if (!prop || !value) return part
      if (/!important\s*$/i.test(value)) return `${prop}: ${value}`

      return `${prop}: ${value} !important`
    })
    .join('; ')
}

const sanitizeInlineStyle = (styleText) => {
  if (!styleText) return ''

  return String(styleText)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colonIndex = part.indexOf(':')
      if (colonIndex === -1) return ''

      const prop = part.slice(0, colonIndex).trim().toLowerCase()
      const value = part.slice(colonIndex + 1).trim()
      if (!prop || !value) return ''
      if (!/^[a-z-]+$/.test(prop)) return ''

      const lowerValue = value.toLowerCase()
      if (
        lowerValue.includes('javascript:') ||
        lowerValue.includes('vbscript:') ||
        lowerValue.includes('expression(') ||
        lowerValue.includes('@import') ||
        lowerValue.includes('-moz-binding') ||
        lowerValue.includes('behavior:')
      ) {
        return ''
      }

      return `${prop}: ${value}`
    })
    .filter(Boolean)
    .join('; ')
}

const promoteInlineStylePriority = (html) =>
  String(html ?? '').replace(/style=(['"])(.*?)\1/gis, (_match, quote, styleText) => {
    const promoted = inlineStyleToImportant(styleText)
    return promoted ? `style=${quote}${promoted}${quote}` : ''
  })

const normalizeInlineStyles = (html) =>
  String(html ?? '').replace(/style=(['"])(.*?)\1/gis, (_match, quote, styleText) => {
    const safeStyle = sanitizeInlineStyle(styleText)
    if (!safeStyle) return ''
    const promoted = inlineStyleToImportant(safeStyle)
    return promoted ? `style=${quote}${promoted}${quote}` : ''
  })

export const sanitizeRenderedHtml = (html) => {
  if (!html) return ''

  const sanitized = DOMPurify.sanitize(normalizeInlineStyles(html), {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span',
      'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img', 'mark',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'data-page-id', 'src', 'alt', 'width', 'height', 'style'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i
  })

  return promoteInlineStylePriority(sanitized)
}
