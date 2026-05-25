# HTML Editor Guide

## Overview
The Fan Wiki now supports HTML editing with a visual toolbar and live preview functionality. This allows you to create rich, formatted content for your wiki pages.

## Features

### HTML Toolbar
The editor includes a comprehensive toolbar with the following buttons:

- **H1, H2, H3** - Insert heading tags
- **B** - Bold text with `<strong>` tag
- **I** - Italic text with `<em>` tag
- **U** - Underline text with `<u>` tag
- **<p>** - Insert paragraph tags
- **<br>** - Insert line breaks
- **Link** - Insert anchor tags for hyperlinks
- **UL** - Create unordered (bulleted) lists
- **OL** - Create ordered (numbered) lists
- **Code** - Inline code formatting
- **Pre** - Preformatted code blocks
- **Quote** - Blockquote for citations
- **Img** - Insert images
- **Div** - Create div containers

### Preview Mode
Click the **👁️ Preview** button to toggle between edit and preview modes:
- **Edit Mode**: Write and edit HTML with syntax support
- **Preview Mode**: See how your HTML will render on the wiki page

## How to Use

### Creating Formatted Content

1. **Select text** in the editor
2. **Click a toolbar button** to wrap the selection with tags
3. Or manually type HTML tags directly

### Example HTML

```html
<h2>Character Profile</h2>
<p>This is a <strong>main character</strong> from the series.</p>

<h3>Abilities</h3>
<ul>
  <li>Super strength</li>
  <li>Flight</li>
  <li>Energy manipulation</li>
</ul>

<blockquote>
  "With great power comes great responsibility."
</blockquote>
```

### Supported HTML Elements

The wiki supports standard HTML elements including:
- Headings (h1-h6)
- Text formatting (strong, em, u)
- Links (a)
- Images (img)
- Lists (ul, ol, li)
- Code blocks (code, pre)
- Blockquotes
- Line breaks (br)
- Paragraphs (p)
- Divs with custom classes
- Tables (table, tr, td, th)
- Horizontal rules (hr)

### Adding Links

```html
<a href="https://example.com">Link Text</a>
```

### Adding Images

```html
<img src="image-url.jpg" alt="Description">
```

### Creating Lists

**Unordered List:**
```html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

**Ordered List:**
```html
<ol>
  <li>First step</li>
  <li>Second step</li>
  <li>Third step</li>
</ol>
```

### Code Blocks

**Inline code:**
```html
Use <code>inline code</code> for short snippets.
```

**Code block:**
```html
<pre>
function example() {
  return "formatted code";
}
</pre>
```

## Tips

1. **Use Preview Often**: Click the preview button frequently to check your formatting
2. **Valid HTML**: Always close your tags properly
3. **Styling**: The wiki applies automatic styling to your HTML elements
4. **Spacing**: Use `<br>` for line breaks and `<p>` for paragraphs
5. **Nested Elements**: You can nest elements inside each other for complex layouts

## Keyboard Workflow

1. Type your content
2. Select text you want to format
3. Click toolbar button to apply formatting
4. Continue typing or editing
5. Click Preview to verify appearance

## Color Scheme

The rendered HTML uses the wiki's dark theme:
- Headings: White (#f0f0f0)
- Body text: Light gray (#d0d0d0)
- Links: Blue (#4a9eff)
- Code: Blue highlight with dark background
- Blockquotes: Gray with blue left border

Enjoy creating rich, formatted wiki pages! 🎨
