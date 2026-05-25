# Fan Wiki

A modern, interactive fan wiki website built with React, featuring a design inspired by Fandom.com. Create, edit, and organize wiki pages with ease!

## Features

- 🎨 **Dual Theme System** - Switch between modern Dark theme and immersive Fantasy theme
- 🏰 **Fantasy Wiki Style** - Medieval-inspired design with gold accents and serif fonts
- ✏️ **HTML Editor** - Rich text editing with visual toolbar and live preview
- 📝 **Interactive Page Creation** - Create new wiki pages with formatted content
- 🖊️ **Edit Functionality** - Edit existing pages directly from the interface
- 🗂️ **Category System** - Organize pages by categories
- 🔍 **Sidebar Navigation** - Easy browsing with categorized page lists
- 💾 **Local Storage** - All pages and theme preferences saved in your browser
- 📱 **Responsive** - Works on desktop and mobile devices
- 👁️ **Preview Mode** - Toggle between edit and preview to see your HTML rendering

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173/`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## Usage

### Creating a New Page

1. Click the "Create Page" button in the header
2. Fill in the page title and category (optional)
3. Use the HTML toolbar to format your content
4. Click the Preview button to see how it will look
5. Click "Create Page" to save

### Using the HTML Editor

The editor includes a toolbar with formatting options:
- Headings (H1, H2, H3)
- Text formatting (Bold, Italic, Underline)
- Lists (ordered and unordered)
- Links and images
- Code blocks and quotes
- Toggle Preview to see rendered HTML

See [HTML_EDITOR_GUIDE.md](HTML_EDITOR_GUIDE.md) for detailed instructions.

### Switching Themes

1. Click the theme button in the header (🏰 Fantasy or 🌙 Dark)
2. Your preference is automatically saved
3. Choose Fantasy theme for medieval/RPG content
4. Choose Dark theme for modern wikis

See [THEME_GUIDE.md](THEME_GUIDE.md) for detailed theme information.

### Editing a Page

1. Navigate to any wiki page
2. Click the "Edit" button in the page header
3. Make your changes
4. Click "Save Changes"

### Deleting a Page

1. Navigate to the page you want to delete
2. Click the "Delete" button
3. Confirm the deletion

## Project Structure

```
Wiki/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Header.css
│   │   ├── Sidebar.jsx
│   │   ├── Sidebar.css
│   │   ├── HomePage.jsx
│   │   ├── HomePage.css
│   │   ├── WikiPage.jsx
│   │   ├── WikiPage.css
│   │   ├── CreatePage.jsx
│   │   └── CreatePage.css
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

## Technologies Used

- **React 18** - UI framework
- **React Router 6** - Client-side routing
- **Vite** - Build tool and dev server
- **LocalStorage API** - Data persistence
- **CSS3** - Styling with modern features

## Color Scheme

The design follows a dark theme similar to Fandom.com:

- Background: `#1a1a1e`
- Secondary Background: `#2a2a2e`
- Accent Blue: `#4a9eff`
- Text: `#f0f0f0`
- Borders: `#3a3a3e`

## Future Enhancements

- 🔍 Search functionality
- 🖼️ Image upload support
- 📊 Page analytics
- 👥 Multi-user support with authentication
- 🌐 Database integration
- 📤 Export/import wiki data
- 🎨 Rich text editor
- 🔗 Internal page linking

## License

MIT License - Feel free to use this project for your own fan wikis!

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
