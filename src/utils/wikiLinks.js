// Utility functions for wiki-style page linking

/**
 * Parse wiki-style links in content and convert them to HTML links
 * Supports:
 * - [[PageTitle]] - Links to page with that title
 * - [[PageTitle|Display Text]] - Links to page with custom display text
 * 
 * @param {string} content - HTML content with wiki-style links
 * @param {Array} pages - Array of all pages
 * @returns {string} - Content with wiki links converted to HTML links
 */
export const parseWikiLinks = (content, pages) => {
  if (!content || !pages) return content

  // Create a map of page titles to page IDs (case-insensitive)
  const pageTitleMap = new Map()
  pages.forEach(page => {
    pageTitleMap.set(page.title.toLowerCase(), page.id)
  })

  // Regex to match [[PageTitle]] or [[PageTitle|Display Text]]
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

  return content.replace(wikiLinkRegex, (match, pageTitle, displayText) => {
    const trimmedTitle = pageTitle.trim()
    const trimmedDisplay = displayText ? displayText.trim() : trimmedTitle
    const pageId = pageTitleMap.get(trimmedTitle.toLowerCase())

    if (pageId) {
      // Page exists - create link
      return `<a href="/page/${pageId}" class="wiki-link" data-page-id="${pageId}">${trimmedDisplay}</a>`
    } else {
      // Page doesn't exist - create red link (broken link)
      return `<span class="wiki-link-broken" title="Page '${trimmedTitle}' does not exist">${trimmedDisplay}</span>`
    }
  })
}

/**
 * Get a list of pages that link TO the given page
 * @param {string} pageId - ID of the target page
 * @param {Array} pages - Array of all pages
 * @returns {Array} - Array of pages that contain links to the target page
 */
export const getBacklinks = (pageId, pages) => {
  const targetPage = pages.find(p => p.id === pageId)
  if (!targetPage) return []

  const backlinks = []
  pages.forEach(page => {
    if (page.id === pageId) return // Skip self

    // Check if page content contains a wiki link to the target page
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
    let match
    while ((match = wikiLinkRegex.exec(page.content)) !== null) {
      const linkedTitle = match[1].trim()
      if (linkedTitle.toLowerCase() === targetPage.title.toLowerCase()) {
        backlinks.push(page)
        break
      }
    }
  })

  return backlinks
}
