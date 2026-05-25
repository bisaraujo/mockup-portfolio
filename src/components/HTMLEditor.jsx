import { useState, useRef } from 'react'
import { sanitizeRenderedHtml } from '../utils/sanitizeHtml'
import './HTMLEditor.css'

function HTMLEditor({ value, onChange, placeholder = 'Escreva seu conteudo aqui...' }) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef(null)

  const insertTag = (openTag, closeTag = '') => {
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const before = value.substring(0, start)
    const after = value.substring(end)

    const newText = before + openTag + selectedText + closeTag + after
    onChange({ target: { name: 'content', value: newText } })

    setTimeout(() => {
      textarea.focus()
      const newPosition = start + openTag.length + selectedText.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const toolbarButtons = [
    { label: 'H1', action: () => insertTag('<h1>', '</h1>'), title: 'Titulo 1' },
    { label: 'H2', action: () => insertTag('<h2>', '</h2>'), title: 'Titulo 2' },
    { label: 'H3', action: () => insertTag('<h3>', '</h3>'), title: 'Titulo 3' },
    { label: 'B', action: () => insertTag('<strong>', '</strong>'), title: 'Negrito', class: 'bold' },
    { label: 'I', action: () => insertTag('<em>', '</em>'), title: 'Italico', class: 'italic' },
    { label: 'U', action: () => insertTag('<u>', '</u>'), title: 'Sublinhado', class: 'underline' },
    { label: '<p>', action: () => insertTag('<p>', '</p>'), title: 'Paragrafo' },
    { label: '<br>', action: () => insertTag('<br>'), title: 'Quebra de linha' },
    { label: 'Link', action: () => insertTag('<a href="url">', '</a>'), title: 'Inserir link' },
    {
      label: '[[Wiki]]',
      action: () => insertTag('[[', ']]'),
      title: 'Link wiki - use [[TituloDaPagina]] ou [[TituloDaPagina|Texto exibido]]',
      class: 'wiki-link-btn'
    },
    { label: 'UL', action: () => insertTag('<ul>\n  <li>', '</li>\n</ul>'), title: 'Lista nao ordenada' },
    { label: 'OL', action: () => insertTag('<ol>\n  <li>', '</li>\n</ol>'), title: 'Lista ordenada' },
    { label: 'Code', action: () => insertTag('<code>', '</code>'), title: 'Codigo inline' },
    { label: 'Pre', action: () => insertTag('<pre>', '</pre>'), title: 'Pre-formatado' },
    { label: 'Quote', action: () => insertTag('<blockquote>', '</blockquote>'), title: 'Citacao' },
    { label: 'Img', action: () => insertTag('<img src="url" alt="descricao">', ''), title: 'Inserir imagem' },
    { label: 'Div', action: () => insertTag('<div class="custom">', '</div>'), title: 'Container div' }
  ]

  return (
    <div className="html-editor">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          {toolbarButtons.map((btn, index) => (
            <button
              key={index}
              type="button"
              className={`toolbar-btn ${btn.class || ''}`}
              onClick={btn.action}
              title={btn.title}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`preview-toggle ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
          title="Alternar visualizacao"
        >
          {showPreview ? 'Editar' : 'Visualizar'}
        </button>
      </div>

      {!showPreview ? (
        <textarea
          ref={textareaRef}
          name="content"
          value={value}
          onChange={onChange}
          className="editor-textarea"
          placeholder={placeholder}
          rows="20"
        />
      ) : (
        <div className="editor-preview">
          <div className="preview-label">Visualizacao:</div>
          <div className="preview-content" dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(value) }} />
        </div>
      )}

      <div className="editor-footer">
        <span className="editor-hint">
          Use tags HTML para formatar o conteudo. Links wiki: [[TituloDaPagina]] ou [[TituloDaPagina|Texto exibido]]
        </span>
      </div>
    </div>
  )
}

export default HTMLEditor
