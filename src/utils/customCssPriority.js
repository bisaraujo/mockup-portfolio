const addImportantToBlock = (blockBody) => {
  const declarations = blockBody
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const colonIndex = decl.indexOf(':')
      if (colonIndex === -1) return decl

      const prop = decl.slice(0, colonIndex).trim()
      const value = decl.slice(colonIndex + 1).trim()

      if (!prop || !value) return decl
      if (prop.startsWith('--')) return `${prop}: ${value}`
      if (/!important\s*$/i.test(value)) return `${prop}: ${value}`

      return `${prop}: ${value} !important`
    })

  return declarations.join('; ')
}

const scopeSelectors = (selectors, scopeSelector) =>
  selectors
    .split(',')
    .map((selector) => selector.trim())
    .filter(Boolean)
    .map((selector) => `${scopeSelector} ${selector}`)
    .join(', ')

const transformCss = (cssText, scopeSelector) => {
  let out = ''
  let i = 0

  while (i < cssText.length) {
    const open = cssText.indexOf('{', i)
    if (open === -1) {
      out += cssText.slice(i)
      break
    }

    const head = cssText.slice(i, open).trim()
    let depth = 1
    let j = open + 1

    while (j < cssText.length && depth > 0) {
      if (cssText[j] === '{') depth += 1
      else if (cssText[j] === '}') depth -= 1
      j += 1
    }

    if (depth !== 0) {
      out += cssText.slice(i)
      break
    }

    const blockBody = cssText.slice(open + 1, j - 1)

    if (head.startsWith('@media') || head.startsWith('@supports')) {
      out += `${head} {${transformCss(blockBody, scopeSelector)}}`
    } else if (head.startsWith('@')) {
      out += `${head} {${addImportantToBlock(blockBody)}}`
    } else {
      out += `${scopeSelectors(head, scopeSelector)} {${addImportantToBlock(blockBody)}}`
    }

    i = j
  }

  return out
}

export const makeCustomCssHighPriority = (cssText, scopeSelector) => {
  if (!cssText || typeof cssText !== 'string') return ''
  if (!scopeSelector || typeof scopeSelector !== 'string') return ''

  return transformCss(cssText, scopeSelector)
}
