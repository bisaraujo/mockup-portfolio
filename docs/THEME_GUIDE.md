# Theme System Guide

## Overview
The Fan Wiki now features a dual-theme system allowing users to switch between a modern **Dark Theme** and an immersive **Fantasy Theme**.

## How to Switch Themes

### Using the Theme Switcher
1. Look for the theme button in the header navigation bar
2. Click **🏰 Fantasy** to switch to Fantasy theme
3. Click **🌙 Dark** to switch back to Dark theme
4. Your preference is automatically saved in browser storage

The theme switcher is located in the header between "Home" and "Create Page" buttons.

## Theme Descriptions

### 🌙 Dark Theme (Default)
The original modern dark theme featuring:
- **Background**: Deep charcoal (#1a1a1e)
- **Accent Colors**: Electric blue (#4a9eff)
- **Typography**: Modern sans-serif fonts
- **Style**: Clean, minimalist, tech-focused
- **Best For**: General wikis, modern content, tech documentation

### 🏰 Fantasy Theme
An immersive medieval/fantasy-inspired theme featuring:
- **Background**: Deep brown with warm undertones (#1a1410)
- **Accent Colors**: Gold and brass (#d4af37, #8b6914)
- **Typography**: Serif fonts (Georgia) for headings
- **Style**: Ornamental, medieval, RPG-inspired
- **Best For**: Fantasy content, game wikis, medieval settings, lore documentation

## Fantasy Theme Features

### Color Palette
- **Primary Background**: Dark brown (#1a1410)
- **Secondary Background**: Medium brown (#2d2417)
- **Text Colors**: 
  - Primary: Parchment (#f4e8d8)
  - Accent: Gold (#ffd700)
  - Secondary: Tan (#d4c4a8)
- **Borders**: Brass/Gold tones (#8b6914)
- **Links**: Golden yellow (#d4af37)

### Visual Elements
1. **Ornamental Borders**: Golden borders on major sections
2. **Decorative Patterns**: Subtle gradient overlays
3. **Shadow Effects**: Deep shadows for depth
4. **Typography**: Serif fonts for medieval feel
5. **Sword Icons**: Decorative elements on headers

### Component Styling

#### Header & Navigation
- Gradient backgrounds with gold accents
- Golden underline effect
- Brass-colored borders
- Serif logo text with glow effect

#### Sidebar
- Warm brown background
- Golden section titles
- Hover effects with brass highlights
- Category badges with gold borders

#### Content Cards
- Parchment-colored text
- Golden borders on hover
- Deep shadows for depth
- Serif headings

#### Buttons
- Gold/brass color scheme
- Stylized borders
- Glow effects on hover
- Medieval aesthetic

#### Forms & Inputs
- Dark brown backgrounds
- Golden borders
- Brass focus highlights
- Serif labels

## Technical Implementation

### CSS Variables
The fantasy theme uses CSS custom properties for easy customization:
```css
--bg-primary: #1a1410
--accent-primary: #8b6914
--accent-secondary: #d4af37
--text-primary: #f4e8d8
--border-accent: #8b6914
```

### Theme Application
Themes are applied via a body class:
- Dark Theme: No class (default styles)
- Fantasy Theme: `body.fantasy-theme`

### State Management
- Theme preference stored in `localStorage`
- Persists across browser sessions
- Applied on component mount
- Instantly switches without page reload

### File Structure
```
src/
├── App.jsx                 # Theme state management
├── fantasy-theme.css       # Fantasy theme styles
├── index.css              # Base/Dark theme styles
└── components/
    ├── Header.jsx         # Theme switcher button
    └── Header.css         # Header styles
```

## Customization

### Adding New Themes
To add additional themes:

1. Create a new CSS file (e.g., `light-theme.css`)
2. Define styles using body class selector:
```css
body.light-theme {
  /* your styles */
}
```
3. Import in App.jsx
4. Add theme option to toggleTheme function
5. Update theme switcher button

### Modifying Fantasy Theme Colors
Edit the CSS variables in `fantasy-theme.css`:
```css
body.fantasy-theme {
  --accent-primary: #your-color;
  --accent-secondary: #your-color;
  /* ... */
}
```

### Custom Theme Elements
Add custom decorative elements:
```css
body.fantasy-theme .element::after {
  content: '⚔';
  /* positioning and styling */
}
```

## Best Practices

### When to Use Dark Theme
- Modern content
- Technical documentation
- General-purpose wikis
- Better for low-light reading
- Professional appearance

### When to Use Fantasy Theme
- Fantasy game wikis (D&D, RPGs)
- Medieval/historical content
- Fiction world-building
- Lore documentation
- Immersive storytelling
- Creative writing projects

## Browser Compatibility
- Full support in modern browsers
- CSS custom properties required
- LocalStorage API used for persistence
- Fallback to default theme if needed

## Accessibility Notes
- Both themes maintain good contrast ratios
- Text remains readable in both modes
- Focus states clearly visible
- Supports system font preferences
- No motion/animation that could cause issues

## Tips for Content Creators

### Optimizing for Both Themes
1. Test content in both themes before publishing
2. Avoid hardcoded colors in content
3. Use semantic HTML for proper styling
4. Images work in both themes
5. Links maintain good contrast

### Fantasy Theme Content Tips
- Use descriptive, narrative language
- Add dramatic headings
- Include lore and backstory
- Structure content like book chapters
- Use blockquotes for character dialog

## Future Enhancements
Potential additions:
- Light theme option
- Custom theme builder
- Theme preview before switching
- Per-page theme override
- Import/export theme configurations
- Community theme sharing

Enjoy creating with your chosen aesthetic! 🎨⚔️
