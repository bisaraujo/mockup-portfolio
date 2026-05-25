# Wiki Codebase Redundancy Audit Report

**Generated:** March 12, 2026  
**Scope:** Complete codebase analysis (src/, server/, styles)

---

## Executive Summary

The codebase contains **significant redundancies** across multiple categories:
- **Critical duplications:** 2-4 instances of identical functions
- **Code pattern repetitions:** 5+ places with similar logic patterns
- **CSS patterns:** Multiple repeated style definitions that could be abstracted
- **Service layer:** Repetitive fetch wrapper patterns across 5 service files

**Estimated consolidation potential:** 30-40% reduction in duplicated code

---

## 1. FUNCTION DUPLICATIONS

### 1.1 **CRITICAL: `inlineStyleToImportant()` Function**
**Severity:** HIGH | **Impact:** Backend & Frontend Mismatch

**Locations:**
- [server/server.js](server/server.js#L130-L148)
- [src/utils/sanitizeHtml.js](src/utils/sanitizeHtml.js#L3-L17)

**Issue:** Identical function exists in both server and frontend. Any bug fixes or improvements must be made in TWO places.

**Solution:** 
- Create `src/utils/styleProcessing.js` with shared utility
- Update server to import and use the same function
- OR move sanitization logic to server-only utility

**Affected Functions:**
- `inlineStyleToImportant()`
- `promoteInlineStylePriority()`

---

### 1.2 **MAJOR: `buildFolderTree()` Function**
**Severity:** HIGH | **Impact:** Logic Duplication

**Locations:**
- [src/components/Sidebar.jsx](src/components/Sidebar.jsx#L15-L85)
- [src/pages/HomePage.jsx](src/pages/HomePage.jsx#L14-L84)

**Issue:** Complex 70+ line folder tree building logic duplicated exactly. Both components rebuild the same structure.

**Current Pattern:**
```javascript
// SAME LOGIC REPEATED TWICE
const buildFolderTree = () => {
  const tree = { folders: {}, pages: [] }
  pages.forEach(page => {
    if (!page.folderPath || page.folderPath.trim() === '') {
      tree.pages.push({ ...page, type: 'page' })
    } else {
      // ... nested folder parsing logic (40+ lines)
    }
  })
  characters.forEach(character => {
    // ... identical pattern for characters
  })
  return tree
}
```

**Solution:**
- Extract to `src/utils/folderStructure.js`
- Create function: `buildFolderTree(pages, characters)`
- Import in both Sidebar.jsx and HomePage.jsx

---

### 1.3 **PATTERN: `handleSidebarChange()` Similar Logic**
**Severity:** MEDIUM | **Impact:** Maintenance overhead

**Locations:**
- [src/pages/CreatePage.jsx](src/pages/CreatePage.jsx#L49-L57)
- [src/pages/CreateCharacter.jsx](src/pages/CreateCharacter.jsx#L73-L82)
- [src/pages/WikiPage.jsx](src/pages/WikiPage.jsx#L193-L202)

**Issue:** Identical state setter pattern repeated 3 times:
```javascript
const handleSidebarChange = (field, value) => {
  setFormData({
    ...formData,
    sidebar: {
      ...formData.sidebar,
      [field]: value
    }
  })
}
```

**Solution:** Create custom hook: `useSidebarForm(initialData)`

---

### 1.4 **PATTERN: `handleInfoFieldChange()` Similar Logic**
**Severity:** MEDIUM | **Impact:** Code duplication

**Locations:**
- [src/pages/CreatePage.jsx](src/pages/CreatePage.jsx#L87-L96)
- [src/pages/CreateCharacter.jsx](src/pages/CreateCharacter.jsx#L84-L93)
- [src/pages/WikiPage.jsx](src/pages/WikiPage.jsx#L203-L212) (similar pattern)

**Issue:** Array item update logic appears 3 times with identical implementation.

---

## 2. EVENT HANDLER DUPLICATIONS

### 2.1 **PATTERN: `handleWikiLinkClick()` – Document Event Listeners**
**Severity:** MEDIUM | **Impact:** Logic duplication

**Locations:**
- [src/pages/WikiPage.jsx](src/pages/WikiPage.jsx#L56-L74)
- [src/pages/CharacterPage.jsx](src/pages/CharacterPage.jsx#L65-L83)

**Issue:** Identical wiki link click handling logic in 2 pages:
```javascript
// SAME IN BOTH FILES
useEffect(() => {
  const handleWikiLinkClick = (e) => {
    if (e.target.classList.contains('wiki-link')) {
      e.preventDefault()
      let pageId = e.target.getAttribute('data-page-id')
      if (!pageId) {
        const href = e.target.getAttribute('href') || ''
        const match = href.match(/^\/page\/([^/?#]+)/)
        pageId = match ? match[1] : null
      }
      if (pageId) {
        navigate(`/page/${pageId}`)
      }
    }
  }
  document.addEventListener('click', handleWikiLinkClick)
  return () => document.removeEventListener('click', handleWikiLinkClick)
}, [navigate])
```

**Solution:** Create custom hook: `useWikiLinkNavigation()`

---

### 2.2 **PATTERN: API_URL Setup – Multiple Formats**
**Severity:** MEDIUM | **Impact:** Inconsistency & Maintenance

**Locations:**
- [src/services/authService.js](src/services/authService.js#L4)
- [src/services/pageService.js](src/services/pageService.js#L1)
- [src/services/characterService.js](src/services/characterService.js#L1-L2)
- [src/services/mapService.js](src/services/mapService.js#L1)
- [src/services/imageService.js](src/services/imageService.js#L1)
- [src/pages/CharacterPage.jsx](src/pages/CharacterPage.jsx#L111) (inline definitions!)

**Issue:** API_URL initialization repeated 6+ times with **2 different patterns**:

**Pattern A** (Most services):
```javascript
const API_URL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') 
  : ''
```

**Pattern B** (characterService):
```javascript
const API_BASE = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') 
  : ''
const API_URL = `${API_BASE}/api`
```

**Additionally:** CharacterPage.jsx repeats this logic INLINE in 2 places.

**Solution:**
- Create `src/config/apiConfig.js`
- Export centralized `getApiUrl(endpoint)`
- Standardize across all services

---

## 3. FETCH PATTERN REPETITIONS

### 3.1 **Service Layer Anti-Pattern: Repetitive Try-Catch-Console**
**Severity:** MEDIUM | **Impact:** Boilerplate, poor error handling

**All 5 service files exhibit this pattern:**

```javascript
async methodName(/*params*/) {
  try {
    const response = await fetch(`${API_URL}/api/endpoint`, {
      method: 'GET',     // or POST/PUT/DELETE
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to...')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error doing thing:', error)
    throw error
  }
}
```

**Locations:** 30+ method definitions across:
- authService.js (6+ methods)
- pageService.js (6+ methods)
- characterService.js (10+ methods)
- mapService.js (8+ methods)
- imageService.js (3 methods)

**Solution:** Create `src/services/apiClient.js` with generic fetch wrapper:
```javascript
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API request failed')
    }
    return response.json()
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error)
    throw error
  }
}
```

---

## 4. CSS REDUNDANCIES

### 4.1 **Button Styles – Multiple Definitions**
**Severity:** LOW | **Impact:** Styling inconsistency

**Locations with `.btn` or similar:**
- [src/pages/WikiPage.css](src/pages/WikiPage.css#L38-L72)
- [src/pages/CreatePage.css](src/pages/CreatePage.css#L45-L65)
- [src/pages/CharacterPage.css](src/pages/CharacterPage.css#L27-L43)
- [src/components/Header.css](src/components/Header.css#L66-L85)

**Pattern:** Similar button styling definitions:
```css
.btn {
  padding: 0.625rem 1.125rem;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  background: #4a9eff;
  color: white;
}

.btn-primary:hover {
  background: #3a8eef;
  transform: translateY(-0.125rem);
}
```

**Solution:** Consolidate to `src/styles/buttons.css` with:
- `.btn` base styles
- `.btn-primary`, `.btn-secondary`, `.btn-danger` variants
- Import globally in `src/components/Header.css`

---

### 4.2 **Form Input Styles – Repeated Definitions**
**Severity:** MEDIUM | **Impact:** Inconsistency across pages

**Locations:**
- [src/pages/CreatePage.css](src/pages/CreatePage.css#L24-L39)
- [src/pages/CharacterPage.css](src/pages/CharacterPage.css#L95-L102)

**Pattern:**
```css
.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #1a1a1e;
  border: 0.0625rem solid #3a3a3e;
  border-radius: 0.375rem;
  color: #f0f0f0;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4a9eff;
  box-shadow: 0 0 0 0.1875rem rgba(74, 158, 255, 0.1);
}
```

**Solution:** Extract to `src/styles/forms.css` and import globally.

---

### 4.3 **Page Container & Card Styles – Repetitive**
**Severity:** MEDIUM | **Impact:** Not reusing patterns

**Locations:**
- [src/pages/WikiPage.css](src/pages/WikiPage.css#L1-L5) – `.wiki-page { max-width: 75rem }`
- [src/pages/CharacterPage.css](src/pages/CharacterPage.css#L1-L3) – `.character-page { max-width: 75rem }`
- [src/pages/HomePage.css](src/pages/HomePage.css#L1-L2) – `.home-page { max-width: 62.5rem }`

**Pattern:** `.page-card`, `.content-box`, `.sidebar` all have similar:
```css
background: #2a2a2e;
border: 0.0625rem solid #3a3a3e;
border-radius: 0.5rem;
padding: 1.875rem;
```

---

### 4.4 **Text Gradient – Duplicate Definition**
**Severity:** LOW | **Impact:** Not DRY

**Locations:**
- [src/components/Header.css](src/components/Header.css#L33-L37)
- [src/pages/HomePage.css](src/pages/HomePage.css#L13-L17)

**Pattern:**
```css
background: linear-gradient(135deg, #4a9eff 0%, #7ab8ff 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

---

## 5. SANITIZATION LOGIC DUPLICATIONS

### 5.1 **Multiple Sanitization Functions with Similar Purpose**
**Severity:** MEDIUM | **Impact:** Maintenance burden

**Functions in [server/server.js](server/server.js):**
- `sanitizePlainText()` (line ~168)
- `sanitizeRichHtml()` (line ~180)
- `sanitizeSidebar()` (line ~205)

**Additionally in [src/utils/sanitizeHtml.js](src/utils/sanitizeHtml.js):**
- `sanitizeRenderedHtml()`

**Issue:** Server and client have different sanitization approaches:
- **Server:** Uses `sanitize-html` npm package
- **Client:** Uses `DOMPurify` npm package
- Different allowed tags, attributes, and configurations

**Current mismatch:** Server sanitizes content during save; client sanitizes again during render.

---

## 6. MIDDLEWARE & ERROR HANDLING PATTERNS

### 6.1 **Authorization Middleware Repetition (Server)**
**Severity:** LOW | **Impact:** Some code duplication

**[server/server.js](server/server.js#L223-L260):**
```javascript
const requireAuth = (req, res, next) => {
  if (req.session?.userId) next()
  else res.status(401).json({ error: 'Unauthorized' })
}

const requireAdmin = (req, res, next) => {
  if (req.session?.userId && req.session.role === 'admin') next()
  else res.status(403).json({ error: 'Forbidden - Admin access required' })
}

const requirePageEditor = asyncMw(async (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' })
  if (req.session.role === 'admin') return next()
  const page = await Page.findById(req.params.id)
  if (!page) return res.status(404).json({ error: 'Page not found' })
  if (page.editors?.includes(req.session.userId)) return next()
  res.status(403).json({ error: 'Forbidden - You do not have permission...' })
})

const requireCharacterOwner = asyncMw(async (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' })
  if (req.session.role === 'admin') return next()
  const character = await Character.findById(req.params.id)
  if (!character) return res.status(404).json({ error: 'Character not found' })
  if (character.ownerId === req.session.userId) return next()
  res.status(403).json({ error: 'Forbidden - You do not have permission...' })
})
```

**Pattern:** Similar structure across multiple permission checks. Could be abstracted.

---

## 7. DATA STRUCTURE PATTERNS

### 7.1 **Sidebar Object Pattern – Repeated Definition**
**Severity:** LOW | **Impact:** Type inconsistency

**Appears in multiple files:**
```javascript
// Same object structure repeated 10+ times:
sidebar: {
  image: '',
  quote: '',
  infoFields: []
}
```

**Suggestion:** Create constant in `src/constants/dataModels.js`:
```javascript
export const EMPTY_SIDEBAR = {
  image: '',
  quote: '',
  infoFields: []
}
```

---

## 8. CONFIGURATION & CONSTANTS

### 8.1 **Magic Numbers and Strings**
**Severity:** MEDIUM | **Impact:** Maintainability

**Repeated values:**
- `'http://localhost:3001'` – appears 6+ times
- Color codes like `#4a9eff`, `#3a3a3e`, `#1a1a1e` – scattered across CSS
- API endpoint paths – scattered across services
- Max length values: `120`, `500`, `2000`, `5000` – repeated in sanitization

**Solution:** Create `src/constants/index.js`:
```javascript
export const API_CONFIG = {
  DEFAULT_PORT: 3001,
  DEV_URL: 'http://localhost:3001',
  ENDPOINTS: {
    AUTH: '/api/auth',
    PAGES: '/api/pages',
    // ...
  }
}

export const VALIDATION = {
  MAX_TITLE_LENGTH: 200,
  MAX_QUOTE_LENGTH: 2000,
  MAX_PLAIN_TEXT: 5000,
  // ...
}
```

---

## CONSOLIDATION ROADMAP

### Phase 1: Critical (Highest Impact)
1. **Extract `buildFolderTree()`** to `src/utils/folderStructure.js`
   - Saves ~70 lines
   - Improves maintainability
   - Estimated time: 15 min

2. **Consolidate API_URL setup** to `src/config/apiConfig.js`
   - Saves ~20 lines across 6 files
   - Ensures consistency
   - Estimated time: 20 min

3. **Create generic API fetch wrapper** in `src/services/apiClient.js`
   - Reduces 30+ methods to ~15
   - Improves error handling
   - Estimated time: 45 min

### Phase 2: High Priority (Medium Impact)
4. **Extract style functions** to `src/utils/styleProcessing.js`
   - Consolidates `inlineStyleToImportant()` and friends
   - Syncs server/client logic
   - Estimated time: 25 min

5. **Create custom hooks:**
   - `useWikiLinkNavigation()` – Saves 30 lines
   - `useSidebarForm()` – Saves 40 lines
   - Estimated time: 30 min

6. **Consolidate CSS** into `src/styles/`:
   - `buttons.css` – Button variants
   - `forms.css` – Form inputs
   - `containers.css` – Page/card containers
   - Estimated time: 40 min

### Phase 3: Medium Priority (Low-Medium Impact)
7. **Create constants file** `src/constants/index.js`
   - API endpoints
   - Validation limits
   - Color palette
   - Estimated time: 20 min

8. **Extract data models** to `src/constants/dataModels.js`
   - Default sidebar object
   - Form schemas
   - Estimated time: 15 min

---

## Code Quality Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Duplicate Functions | 4 | 0 | 100% |
| Repeated Patterns | 8+ | 2 | 75% |
| API Fetch Boilerplate (lines) | ~400 | ~100 | 75% |
| CSS Redundancy (lines) | ~250 | ~100 | 60% |
| Total Code Reduction | ~900 lines | ~600 lines | 33% |

---

## Summary of Recommendations

### Critical Issues
- ✅ **Duplicate `inlineStyleToImportant()`** – Merge to shared utility
- ✅ **Duplicate `buildFolderTree()`** – Extract to custom hook/utility
- ✅ **Inconsistent API_URL setup** – Centralize configuration

### High Priority
- ✅ **Repetitive fetch patterns** – Create generic API client
- ✅ **Duplicate event handlers** – Extract to custom hooks
- ✅ **CSS button redundancy** – Consolidate to stylesheet

### Medium Priority
- ✅ **Form handling logic** – Create custom hooks
- ✅ **Magic numbers/strings** – Move to constants
- ✅ **CSS container styles** – Extract to shared CSS

### Total Estimated Consolidation Time: **3-4 hours**
**Estimated Code Savings: 30-40% reduction in duplicated code**

