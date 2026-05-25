import 'dotenv/config'
import express            from 'express'
import multer             from 'multer'
import cors               from 'cors'
import helmet             from 'helmet'
import { rateLimit }     from 'express-rate-limit'
import path               from 'path'
import fs                 from 'fs'
import { fileURLToPath }  from 'url'
import bcrypt             from 'bcryptjs'
import session            from 'express-session'
import MongoStore         from 'connect-mongo'
import sanitizeHtml       from 'sanitize-html'
import { v2 as cloudinary } from 'cloudinary'
import { connectDB, User, Page, Character, Image, WikiMap } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app           = express()
const PORT          = process.env.PORT || 3001
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

if (IS_PRODUCTION && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters long in production')
}

// Trust Render's (and Vercel's) reverse proxy so req.secure is true for HTTPS
// requests. Without this, express-session refuses to set Secure cookies over
// the HTTP connection between Render's proxy and this Node process.
app.set('trust proxy', 1)

// ── Cloudinary configuration ──────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true
})

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET
)

const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error)
      else       resolve(result)
    })
    stream.end(buffer)
  })

const generateSignedUrl = (publicId, resourceType = 'image', expiresIn = 3600) => {
  const expireAt = Math.floor(Date.now() / 1000) + expiresIn
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type:          'authenticated',
    sign_url:      true,
    expires_at:    expireAt,
    secure:        true
  })
}

const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/\/image\/(?:upload|authenticated)\/(?:s--[^/]+--\/)?(?:[^/]+\/)*v\d+\/([^?#]+)(?:[?#]|$)/i)
  if (!match) return null
  return match[1].replace(/\.[a-z0-9]+$/i, '')
}

const refreshCloudinaryImageUrl = (url, expiresIn = 60 * 60 * 24 * 30) => {
  if (!useCloudinary || !url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/')) return url
  if (!url.includes('/authenticated/')) return url

  const publicId = extractCloudinaryPublicId(url)
  if (!publicId) return url
  return generateSignedUrl(publicId, 'image', expiresIn)
}

const getCloudinaryTypeFromUrl = (url) =>
  (typeof url === 'string' && url.includes('/authenticated/')) ? 'authenticated' : 'upload'

const normalizeSidebar = (sidebar) => {
  if (!sidebar || typeof sidebar !== 'object') return sidebar
  return {
    ...sidebar,
    image: refreshCloudinaryImageUrl(sidebar.image)
  }
}

const normalizeScrapbook = (scrapbook) =>
  Array.isArray(scrapbook)
    ? scrapbook.map(entry => ({
        ...entry,
        url: refreshCloudinaryImageUrl(entry?.url)
      }))
    : []

const normalizeDiaryEntries = (diary) =>
  Array.isArray(diary)
    ? diary.map(entry => ({
        id: typeof entry?.id === 'string' ? entry.id : newId(),
        date: typeof entry?.date === 'string' ? entry.date : new Date().toISOString(),
        content: sanitizePlainText(entry?.content, 5000),
        author: sanitizePlainText(entry?.author ?? '', 120)
      }))
    : []

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174']

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // allow Cloudinary images
  contentSecurityPolicy: false                              // CSP handled per-route by Vercel
}))
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (!origin || allowedOrigins.includes(origin)) {
    cors({ origin: true, credentials: true })(req, res, next)
  } else {
    res.status(403).json({ error: `CORS: origin ${origin} not allowed` })
  }
})
app.use(express.json({ limit: '1mb' }))

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave:            false,
  saveUninitialized: false,
  proxy:             true,   // trust X-Forwarded-Proto from Render's proxy
  store:             MongoStore.create({
    mongoUrl:        process.env.MONGODB_URI,
    ttl:             24 * 60 * 60,  // 1 day in seconds
    autoRemove:      'native'
  }),
  cookie: {
    httpOnly: true,
    secure:   IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    maxAge:   24 * 60 * 60 * 1000
  }
}))

// ── Local uploads dir (dev fallback, no Cloudinary) ───────────────────────────
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

// ── ID generator ─────────────────────────────────────────────────────────────
const newId = () => Date.now().toString() + Math.floor(Math.random() * 1000)

// ── Folder-path validator ─────────────────────────────────────────────────────
const validateFolderPath = (folderPath) => {
  if (!folderPath || folderPath.trim() === '') return { valid: true, sanitized: '' }
  const cleaned = folderPath.trim().replace(/^\/+|\/+$/g, '')
  if (cleaned.includes('..') || cleaned.includes('//') || cleaned.includes('\\'))
    return { valid: false, error: 'Invalid folder path: contains dangerous characters' }
  const parts = cleaned.split('/').map(p => p.trim()).filter(p => p)
  for (const part of parts) {
    if (part === '.' || part === '..' || /[<>:"|?*\x00-\x1f]/.test(part))
      return { valid: false, error: 'Invalid folder path: contains invalid folder names' }
  }
  return { valid: true, sanitized: parts.join('/') }
}

const sanitizePlainText = (value, maxLength = 5000) =>
  sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} }).slice(0, maxLength)

const inlineStyleToImportant = (styleText) => {
  if (!styleText) return ''

  return styleText
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
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
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
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

const sanitizeRichHtml = (value) => {
  const sanitized = sanitizeHtml(String(value ?? ''), {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span',
      'strong', 'b', 'em', 'i', 'u',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',"figure","figcaption"
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel', 'class', 'data-page-id', 'style'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style'],
      '*': ['class', 'style']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      '*': (tagName, attribs) => {
        const nextAttribs = { ...attribs }

        if (nextAttribs.style) {
          const safeStyle = sanitizeInlineStyle(nextAttribs.style)
          if (!safeStyle) delete nextAttribs.style
          else nextAttribs.style = inlineStyleToImportant(safeStyle)
        }

        if (nextAttribs.target === '_blank') {
          nextAttribs.rel = 'noopener noreferrer'
        }

        return { tagName, attribs: nextAttribs }
      }
    }
  })

  return sanitized
}

const sanitizeSidebar = (sidebar) => {
  if (!sidebar || typeof sidebar !== 'object') {
    return { image: '', quote: '', infoFields: [] }
  }

  const safeInfoFields = Array.isArray(sidebar.infoFields)
    ? sidebar.infoFields.slice(0, 40).map(field => ({
        label: sanitizePlainText(field?.label, 120),
        value: sanitizePlainText(field?.value, 500)
      }))
    : []

  return {
    image: typeof sidebar.image === 'string' ? sidebar.image.trim().slice(0, 2000) : '',
    quote: sanitizePlainText(sidebar.quote, 2000),
    infoFields: safeInfoFields
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (req.session?.userId) next()
  else res.status(401).json({ error: 'Unauthorized' })
}

const requireAdmin = (req, res, next) => {
  if (req.session?.userId && req.session.role === 'admin') next()
  else res.status(403).json({ error: 'Forbidden - Admin access required' })
}

// Async-safe middleware wrapper
const asyncMw = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const requirePageEditor = asyncMw(async (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' })
  if (req.session.role === 'admin') return next()
  const page = await Page.findById(req.params.id)
  if (!page)                                      return res.status(404).json({ error: 'Page not found' })
  if (page.editors?.includes(req.session.userId)) return next()
  res.status(403).json({ error: 'Forbidden - You do not have permission to edit this page' })
})

const requireCharacterOwner = asyncMw(async (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' })
  if (req.session.role === 'admin') return next()
  const character = await Character.findById(req.params.id)
  if (!character)                               return res.status(404).json({ error: 'Character not found' })
  if (character.ownerId === req.session.userId) return next()
  res.status(403).json({ error: 'Forbidden - You do not have permission to access this character' })
})

// ── Multer ────────────────────────────────────────────────────────────────────
const memStorage = multer.memoryStorage()

const upload = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/
    if (ok.test(path.extname(file.originalname).toLowerCase()) && ok.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image files are allowed!'))
  }
})

const pdfUpload = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf')
      return cb(null, true)
    cb(new Error('Only PDF files are allowed!'))
  }
})

const backupUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const d = path.join(__dirname, 'temp-uploads')
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
      cb(null, d)
    },
    filename: (req, file, cb) => cb(null, `backup-${Date.now()}-${Math.round(Math.random() * 1e9)}.zip`)
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isZip = ['application/zip', 'application/x-zip-compressed', 'application/x-zip'].includes(file.mimetype)
    const extOk = path.extname(file.originalname).toLowerCase() === '.zip'
    if ((isZip || extOk) && file.originalname.includes('backup')) return cb(null, true)
    cb(new Error('Only backup ZIP files are allowed!'))
  }
})

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

app.post('/api/auth/register', requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(username))
      return res.status(400).json({ error: 'Username must be 3-32 characters, letters/numbers/underscores only' })
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    if (role && !['admin', 'user'].includes(role))
      return res.status(400).json({ error: 'Invalid role' })
    if (await User.findOne({ username })) return res.status(400).json({ error: 'Username already exists' })
    const user = await User.create({
      _id: newId(), username,
      password: await bcrypt.hash(password, 10),
      role: role || 'user',
      createdAt: new Date().toISOString()
    })
    res.status(201).json({ id: user.id, username: user.username, role: user.role })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // max 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes' }
})

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
    const user = await User.findOne({ username })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid credentials' })
    req.session.userId   = user.id
    req.session.username = user.username
    req.session.role     = user.role
    res.json({ user: { id: user.id, username: user.username, role: user.role } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    res.clearCookie('connect.sid')
    res.json({ message: 'Logged out successfully' })
  })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.session.userId, username: req.session.username, role: req.session.role } })
})

app.get('/api/auth/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().lean()
    res.json(users.map(({ password, _id, __v, ...u }) => ({ ...u, id: _id })))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.put('/api/auth/users/:userId/password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password is required' })
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    const user = await User.findByIdAndUpdate(req.params.userId, { password: await bcrypt.hash(password, 10) })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

app.delete('/api/auth/users/:userId', requireAdmin, async (req, res) => {
  try {
    if (req.params.userId === req.session.userId)
      return res.status(400).json({ error: 'Cannot delete your own account' })
    const user = await User.findByIdAndDelete(req.params.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// =============================================================================
// IMAGE / UPLOAD ENDPOINTS
// =============================================================================

app.get('/api/upload/sign', requireAuth, (req, res) => {
  if (!useCloudinary) return res.status(400).json({ error: 'Cloudinary not configured on this server' })
  const timestamp = Math.round(Date.now() / 1000)
  const params    = { timestamp, folder: 'wiki-uploads', type: 'upload' }
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET)
  res.json({ timestamp, signature, cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, folder: 'wiki-uploads', type: 'upload' })
})

app.post('/api/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    let imageUrl, publicId, filename, resourceType
    if (useCloudinary) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'wiki-uploads', resource_type: 'image', type: 'upload', unique_filename: true
      })
      publicId = result.public_id; resourceType = 'image'; imageUrl = result.secure_url; filename = result.public_id
    } else {
      filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer)
      imageUrl = `/uploads/${filename}`
    }
    const imageDoc = await Image.create({
      _id: newId(), name: req.file.originalname, url: imageUrl, filename,
      publicId: publicId || null, resourceType: resourceType || 'local',
      size: req.file.size, uploadedAt: new Date().toISOString(),
      ownerId: req.session.userId, ownerName: req.session.username || 'Unknown'
    })
    const responseUrl = useCloudinary ? imageUrl : `${process.env.BASE_URL || ''}/uploads/${filename}`
    res.json({ ...imageDoc.toJSON(), url: responseUrl })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

app.get('/api/images', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.role === 'admin'
    const query   = isAdmin ? {} : { ownerId: req.session.userId }
    const images  = await Image.find(query).lean()
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`
    res.json(images.map(img => {
      const url = (img.publicId && useCloudinary)
        ? refreshCloudinaryImageUrl(img.url)
        : (img.url?.startsWith('http') ? img.url : `${baseUrl}${img.url}`)
      return { ...img, id: img._id, _id: undefined, url }
    }))
  } catch (error) {
    console.error('Error reading images:', error)
    res.status(500).json({ error: 'Failed to read images' })
  }
})

app.delete('/api/images/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params
    const isAdmin = req.session.role === 'admin'
    const imageDoc = await Image.findOne({ $or: [{ filename }, { publicId: filename }] })
    if (imageDoc && !isAdmin && imageDoc.ownerId !== req.session.userId)
      return res.status(403).json({ error: 'Forbidden - You can only delete your own images' })
    if (imageDoc?.publicId && useCloudinary) {
      const cloudinaryType = getCloudinaryTypeFromUrl(imageDoc.url)
      await cloudinary.uploader.destroy(imageDoc.publicId, {
        type: cloudinaryType, resource_type: imageDoc.resourceType === 'raw' ? 'raw' : 'image'
      })
    } else {
      const fp = path.join(uploadsDir, filename)
      if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Image not found' })
      fs.unlinkSync(fp)
    }
    await Image.deleteOne({ $or: [{ filename }, { publicId: filename }] })
    res.json({ message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'Failed to delete image' })
  }
})

// =============================================================================
// PAGE ENDPOINTS
// =============================================================================

app.get('/api/pages', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.role === 'admin'
    // Admins receive all pages. Non-admins receive:
    // - public pages
    // - private pages where they are the owner or listed in `allowedUsers`
    let pages
    if (isAdmin) {
      pages = await Page.find().lean()
    } else {
      const userId = req.session.userId
      const query = {
        $or: [
          { visibility: 'public' },
          { visibility: 'private', ownerId: userId },
          { visibility: 'private', allowedUsers: userId }
        ]
      }
      pages = await Page.find(query).lean()
    }
    res.json(pages.map(d => ({ ...d, id: d._id, _id: undefined })))
  } catch (error) {
    console.error('Error getting pages:', error)
    res.status(500).json({ error: 'Failed to get pages' })
  }
})

app.get('/api/pages/my-editable', requireAuth, async (req, res) => {
  try {
    const query = req.session.role === 'admin' ? {} : { editors: req.session.userId }
    const pages = await Page.find(query).lean()
    res.json(pages.map(d => ({ ...d, id: d._id, _id: undefined })))
  } catch (error) {
    console.error('Error fetching editable pages:', error)
    res.status(500).json({ error: 'Failed to fetch editable pages' })
  }
})

app.get('/api/pages/:id', requireAuth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id)
    if (!page) return res.status(404).json({ error: 'Page not found' })
    const isAdmin = req.session.role === 'admin'
    // Visibility rules:
    // - public: anyone authenticated
    // - hidden: admins only
    // - private: owner or allowedUsers (or admins)
    if (page.visibility === 'public') {
      return res.json(page.toJSON())
    }

    if (page.visibility === 'hidden') {
      if (!isAdmin) return res.status(404).json({ error: 'Page not found' })
      return res.json(page.toJSON())
    }

    if (page.visibility === 'private') {
      const userId = req.session.userId
      const allowed = isAdmin || page.ownerId === userId || (Array.isArray(page.allowedUsers) && page.allowedUsers.includes(userId))
      if (!allowed) return res.status(404).json({ error: 'Page not found' })
      return res.json(page.toJSON())
    }

    // Fallback: deny
    res.status(404).json({ error: 'Page not found' })
  } catch (error) {
    console.error('Error getting page:', error)
    res.status(500).json({ error: 'Failed to get page' })
  }
})

app.post('/api/pages', requireAdmin, async (req, res) => {
  try {
    if (req.body.folderPath !== undefined) {
      const v = validateFolderPath(req.body.folderPath)
      if (!v.valid) return res.status(400).json({ error: v.error })
      req.body.folderPath = v.sanitized
    }
    // sanitize allowedUsers and ownerId (owner defaults to creating admin)
    const allowedUsers = Array.isArray(req.body.allowedUsers)
      ? req.body.allowedUsers.filter(u => typeof u === 'string').slice(0, 100)
      : []
    const ownerId = typeof req.body.ownerId === 'string' && req.body.ownerId
      ? req.body.ownerId
      : req.session.userId

    const page = await Page.create({
      _id: newId(),
      title: sanitizePlainText(req.body.title, 200),
      content: sanitizeRichHtml(req.body.content),
      folderPath: req.body.folderPath || '',
      visibility: ['public', 'hidden', 'private'].includes(req.body.visibility) ? req.body.visibility : 'public',
      ownerId,
      allowedUsers,
      customCSS: typeof req.body.customCSS === 'string' ? req.body.customCSS : '',
      sidebar: sanitizeSidebar(req.body.sidebar),
      editors: Array.isArray(req.body.editors)
        ? req.body.editors.filter(e => typeof e === 'string').slice(0, 100)
        : [],
      createdAt: new Date().toISOString()
    })
    res.status(201).json(page.toJSON())
  } catch (error) {
    console.error('Error creating page:', error)
    res.status(500).json({ error: 'Failed to create page' })
  }
})

app.put('/api/pages/:id', requirePageEditor, async (req, res) => {
  try {
    if (req.body.folderPath !== undefined) {
      const v = validateFolderPath(req.body.folderPath)
      if (!v.valid) return res.status(400).json({ error: v.error })
      req.body.folderPath = v.sanitized
    }

    const update = {}
    if (req.body.title !== undefined) update.title = sanitizePlainText(req.body.title, 200)
    if (req.body.content !== undefined) update.content = sanitizeRichHtml(req.body.content)
    if (req.body.folderPath !== undefined) update.folderPath = req.body.folderPath
    if (req.body.customCSS !== undefined) update.customCSS = typeof req.body.customCSS === 'string' ? req.body.customCSS : ''
    if (req.body.sidebar !== undefined) update.sidebar = sanitizeSidebar(req.body.sidebar)
    // Only admins may change visibility
    if (req.body.visibility !== undefined) {
      if (req.session.role !== 'admin') return res.status(403).json({ error: 'Forbidden - Only admins may change page visibility' })
      if (!['public', 'hidden', 'private'].includes(req.body.visibility)) return res.status(400).json({ error: 'Invalid visibility value' })
      update.visibility = req.body.visibility
    }

    // Only admins may change per-page ACLs or owner
    if (req.body.allowedUsers !== undefined) {
      if (req.session.role !== 'admin') return res.status(403).json({ error: 'Forbidden - Only admins may change allowed users' })
      update.allowedUsers = Array.isArray(req.body.allowedUsers)
        ? req.body.allowedUsers.filter(u => typeof u === 'string').slice(0, 100)
        : []
    }

    if (req.body.ownerId !== undefined) {
      if (req.session.role !== 'admin') return res.status(403).json({ error: 'Forbidden - Only admins may change owner' })
      update.ownerId = typeof req.body.ownerId === 'string' ? req.body.ownerId : ''
    }

    const page = await Page.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: 'after' })
    if (!page) return res.status(404).json({ error: 'Page not found' })
    res.json(page.toJSON())
  } catch (error) {
    console.error('Error updating page:', error)
    res.status(500).json({ error: 'Failed to update page' })
  }
})

app.delete('/api/pages/:id', requireAdmin, async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id)
    if (!page) return res.status(404).json({ error: 'Page not found' })
    res.json({ message: 'Page deleted successfully' })
  } catch (error) {
    console.error('Error deleting page:', error)
    res.status(500).json({ error: 'Failed to delete page' })
  }
})

app.post('/api/pages/:id/editors', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'User ID is required' })
    if (!(await User.findById(userId))) return res.status(404).json({ error: 'User not found' })
    const page = await Page.findById(req.params.id)
    if (!page) return res.status(404).json({ error: 'Page not found' })
    if (page.editors.includes(userId)) return res.status(400).json({ error: 'User is already an editor of this page' })
    page.editors.push(userId)
    await page.save()
    res.json({ message: 'Editor added successfully', editors: page.editors })
  } catch (error) {
    console.error('Error adding editor:', error)
    res.status(500).json({ error: 'Failed to add editor' })
  }
})

app.delete('/api/pages/:id/editors/:userId', requireAdmin, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id)
    if (!page) return res.status(404).json({ error: 'Page not found' })
    if (!page.editors.includes(req.params.userId))
      return res.status(404).json({ error: 'User is not an editor of this page' })
    page.editors = page.editors.filter(eid => eid !== req.params.userId)
    await page.save()
    res.json({ message: 'Editor removed successfully', editors: page.editors })
  } catch (error) {
    console.error('Error removing editor:', error)
    res.status(500).json({ error: 'Failed to remove editor' })
  }
})

// =============================================================================
// CHARACTER ENDPOINTS
// =============================================================================

app.get('/api/characters', async (req, res) => {
  try {
    const chars = await Character.find().lean()
    res.json(chars.map(c => ({
      id: c._id, name: c.name, title: c.title, content: c.content,
      image: c.image, ownerId: c.ownerId, ownerName: c.ownerName,
      customCSS: c.customCSS, sidebar: normalizeSidebar(c.sidebar), folderPath: c.folderPath, createdAt: c.createdAt
    })))
  } catch (error) {
    console.error('Error fetching characters:', error)
    res.status(500).json({ error: 'Failed to fetch characters' })
  }
})

app.get('/api/characters/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id)
    if (!character) return res.status(404).json({ error: 'Character not found' })
    const userId = req.session?.userId
    const isOwner = userId && character.ownerId === userId
    const isAdmin = req.session?.role === 'admin'
    if (isOwner || isAdmin) {
      const response = { ...character.toJSON() }
      response.sidebar = normalizeSidebar(response.sidebar)
      response.scrapbook = normalizeScrapbook(character.scrapbook)
      response.diary = normalizeDiaryEntries(character.diary)
      // characterSheet is stored as the direct secure_url from Cloudinary (no signed URL needed)
      if (!isAdmin) delete response.dmNotes
      return res.json(response)
    }
    const { _id, name, title, content, image, ownerId, ownerName, customCSS, sidebar, folderPath, createdAt, characterSheet } = character
    res.json({
      id: _id,
      name,
      title,
      content,
      image,
      ownerId,
      ownerName,
      customCSS,
      sidebar: normalizeSidebar(sidebar),
      diary: normalizeDiaryEntries(character.diary),
      scrapbook: normalizeScrapbook(character.scrapbook),
      characterSheet,
      folderPath,
      createdAt
    })
  } catch (error) {
    console.error('Error fetching character:', error)
    res.status(500).json({ error: 'Failed to fetch character' })
  }
})

app.post('/api/characters', requireAuth, async (req, res) => {
  try {
    console.log('POST /api/characters called by', { userId: req.session?.userId, username: req.session?.username })
    console.log('Character create payload preview:', { name: req.body.name, title: req.body.title, folderPath: req.body.folderPath })
    const user = await User.findById(req.session.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const sanitizedFolder = validateFolderPath(req.body.folderPath)
    if (!sanitizedFolder.valid) return res.status(400).json({ error: sanitizedFolder.error })

    const character = await Character.create({
      _id: newId(),
      name: sanitizePlainText(req.body.name || 'Unnamed Character', 120),
      title: sanitizePlainText(req.body.title, 200),
      content: sanitizeRichHtml(req.body.content),
      image: req.body.image || '',
      ownerId: req.session.userId,
      ownerName: user.username,
      folderPath: sanitizedFolder.sanitized || 'Characters',
      customCSS: req.body.customCSS || '',
      sidebar: sanitizeSidebar(req.body.sidebar),
      diary: [], inventory: [], scrapbook: [],
      characterSheet: '', dmNotes: '',
      createdAt: new Date().toISOString()
    })
    res.status(201).json(character.toJSON())
  } catch (error) {
    console.error('Error creating character:', error)
    res.status(500).json({ error: 'Failed to create character' })
  }
})

app.put('/api/characters/:id', requireCharacterOwner, async (req, res) => {
  try {
    const update = {}
    if (req.body.name !== undefined) update.name = sanitizePlainText(req.body.name, 120)
    if (req.body.title !== undefined) update.title = sanitizePlainText(req.body.title, 200)
    if (req.body.content !== undefined) update.content = sanitizeRichHtml(req.body.content)
    if (req.body.image !== undefined) update.image = typeof req.body.image === 'string' ? req.body.image : ''
    if (req.body.customCSS !== undefined) update.customCSS = typeof req.body.customCSS === 'string' ? req.body.customCSS : ''
    if (req.body.sidebar !== undefined) update.sidebar = sanitizeSidebar(req.body.sidebar)

    if (req.body.folderPath !== undefined) {
      const v = validateFolderPath(req.body.folderPath)
      if (!v.valid) return res.status(400).json({ error: v.error })
      update.folderPath = v.sanitized
    }

    const character = await Character.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: 'after' })
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.json(character.toJSON())
  } catch (error) {
    console.error('Error updating character:', error)
    res.status(500).json({ error: 'Failed to update character' })
  }
})

app.delete('/api/characters/:id', requireCharacterOwner, async (req, res) => {
  try {
    const character = await Character.findByIdAndDelete(req.params.id)
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.json({ message: 'Character deleted successfully' })
  } catch (error) {
    console.error('Error deleting character:', error)
    res.status(500).json({ error: 'Failed to delete character' })
  }
})

app.put('/api/characters/:id/diary', requireCharacterOwner, async (req, res) => {
  try {
    const character = await Character.findByIdAndUpdate(
      req.params.id, { $set: { diary: req.body.diary || [] } }, { returnDocument: 'after' }
    )
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.json({ diary: normalizeDiaryEntries(character.diary) })
  } catch (error) {
    console.error('Error updating diary:', error)
    res.status(500).json({ error: 'Failed to update diary' })
  }
})

app.post('/api/characters/:id/diary/public', async (req, res) => {
  try {
    const content = sanitizePlainText(req.body?.content, 5000)
    if (!content) return res.status(400).json({ error: 'Content is required' })

    const entry = {
      id: newId(),
      date: new Date().toISOString(),
      content,
      author: sanitizePlainText(req.body?.author ?? '', 120)
    }

    const character = await Character.findByIdAndUpdate(
      req.params.id,
      { $push: { diary: { $each: [entry], $slice: -500 } } },
      { returnDocument: 'after' }
    )
    if (!character) return res.status(404).json({ error: 'Character not found' })

    res.status(201).json({ entry, diary: normalizeDiaryEntries(character.diary) })
  } catch (error) {
    console.error('Error adding public diary entry:', error)
    res.status(500).json({ error: 'Failed to add diary entry' })
  }
})

app.post('/api/characters/:id/inventory', requireCharacterOwner, async (req, res) => {
  try {
    const newItem = { id: newId(), name: req.body.name || 'Unnamed Item', type: req.body.type || 'Misc', amount: req.body.amount || 1 }
    const character = await Character.findByIdAndUpdate(req.params.id, { $push: { inventory: newItem } }, { returnDocument: 'after' })
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.status(201).json(newItem)
  } catch (error) {
    console.error('Error adding inventory item:', error)
    res.status(500).json({ error: 'Failed to add item' })
  }
})

app.put('/api/characters/:id/inventory/:itemId', requireCharacterOwner, async (req, res) => {
  try {
    const character = await Character.findById(req.params.id)
    if (!character) return res.status(404).json({ error: 'Character not found' })
    const idx = character.inventory.findIndex(i => i.id === req.params.itemId)
    if (idx === -1) return res.status(404).json({ error: 'Item not found' })
    const item = character.inventory[idx]
    character.inventory[idx] = {
      ...item,
      name:   req.body.name   !== undefined ? req.body.name   : item.name,
      type:   req.body.type   !== undefined ? req.body.type   : item.type,
      amount: req.body.amount !== undefined ? req.body.amount : item.amount
    }
    character.markModified('inventory')
    await character.save()
    res.json(character.inventory[idx])
  } catch (error) {
    console.error('Error updating inventory item:', error)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

app.delete('/api/characters/:id/inventory/:itemId', requireCharacterOwner, async (req, res) => {
  try {
    const character = await Character.findByIdAndUpdate(
      req.params.id, { $pull: { inventory: { id: req.params.itemId } } }, { returnDocument: 'after' }
    )
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

app.put('/api/characters/:id/dm-notes', requireAdmin, async (req, res) => {
  try {
    const character = await Character.findByIdAndUpdate(
      req.params.id, { $set: { dmNotes: req.body.dmNotes || '' } }, { returnDocument: 'after' }
    )
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.json({ dmNotes: character.dmNotes })
  } catch (error) {
    console.error('Error updating DM notes:', error)
    res.status(500).json({ error: 'Failed to update DM notes' })
  }
})

app.put('/api/characters/:id/scrapbook', requireCharacterOwner, async (req, res) => {
  try {
    if (!Array.isArray(req.body.scrapbook)) return res.status(400).json({ error: 'Scrapbook must be an array' })
    const character = await Character.findByIdAndUpdate(
      req.params.id, { $set: { scrapbook: req.body.scrapbook } }, { returnDocument: 'after' }
    )
    if (!character) return res.status(404).json({ error: 'Character not found' })
    res.json({ scrapbook: character.scrapbook })
  } catch (error) {
    console.error('Error updating scrapbook:', error)
    res.status(500).json({ error: 'Failed to update scrapbook' })
  }
})

app.get('/api/characters/:id/character-sheet', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id)
    if (!character) return res.status(404).json({ error: 'Character not found' })
    if (!character.characterSheet && !character.characterSheetPublicId)
      return res.status(404).json({ error: 'No character sheet uploaded' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="character-sheet.pdf"')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.removeHeader('X-Frame-Options')
    const frameAncestors = ["'self'", ...allowedOrigins].join(' ')
    res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`)

    if (useCloudinary && character.characterSheetPublicId) {
      const pdfUrl = cloudinary.url(character.characterSheetPublicId, { resource_type: 'raw', secure: true })
      const upstream = await fetch(pdfUrl)
      if (!upstream.ok) return res.status(502).json({ error: 'Failed to fetch character sheet from storage' })
      const buffer = Buffer.from(await upstream.arrayBuffer())
      res.send(buffer)
    } else {
      const filename = character.characterSheet.split('/').pop()
      const filePath = path.join(uploadsDir, filename)
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character sheet file not found' })
      res.send(fs.readFileSync(filePath))
    }
  } catch (error) {
    console.error('Error serving character sheet:', error)
    res.status(500).json({ error: 'Failed to serve character sheet' })
  }
})

app.post('/api/characters/:id/character-sheet', requireCharacterOwner, pdfUpload.single('characterSheet'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const character = await Character.findById(req.params.id)
    if (!character) return res.status(404).json({ error: 'Character not found' })
    let sheetUrl, sheetPublicId
    if (useCloudinary) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'wiki-character-sheets', resource_type: 'raw', unique_filename: true
      })
      sheetPublicId = result.public_id
      sheetUrl = result.secure_url
    } else {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer)
      sheetUrl = `${process.env.BASE_URL || `http://localhost:${PORT}`}/uploads/${filename}`
    }
    character.characterSheet = sheetUrl
    character.characterSheetPublicId = sheetPublicId || null
    await character.save()
    res.json({ characterSheet: sheetUrl })
  } catch (error) {
    console.error('Error uploading character sheet:', error)
    res.status(500).json({ error: 'Failed to upload character sheet' })
  }
})

// =============================================================================
// MAP ENDPOINTS
// =============================================================================

app.get('/api/maps', requireAuth, async (req, res) => {
  try {
    const maps = await WikiMap.find().lean()
    res.json(maps.map(m => ({ ...m, id: m._id, _id: undefined })))
  } catch (error) {
    console.error('Error fetching maps:', error)
    res.status(500).json({ error: 'Failed to fetch maps' })
  }
})

app.get('/api/maps/:id', requireAuth, async (req, res) => {
  try {
    const map = await WikiMap.findById(req.params.id)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    res.json(map.toJSON())
  } catch (error) {
    console.error('Error fetching map:', error)
    res.status(500).json({ error: 'Failed to fetch map' })
  }
})

app.post('/api/maps', requireAdmin, async (req, res) => {
  try {
    const { name, imageUrl, description, width, height } = req.body
    if (!name || !imageUrl) return res.status(400).json({ error: 'Name and image URL are required' })
    const map = await WikiMap.create({
      _id: newId(), name, imageUrl,
      description: description || '',
      width: width || null, height: height || null,
      pins: [], createdAt: new Date().toISOString()
    })
    res.status(201).json(map.toJSON())
  } catch (error) {
    console.error('Error creating map:', error)
    res.status(500).json({ error: 'Failed to create map' })
  }
})

app.put('/api/maps/:id', requireAdmin, async (req, res) => {
  try {
    const { name, imageUrl, description, width, height, pins } = req.body
    const upd = { updatedAt: new Date().toISOString() }
    if (name        !== undefined) upd.name        = name
    if (imageUrl    !== undefined) upd.imageUrl    = imageUrl
    if (description !== undefined) upd.description = description
    if (width       !== undefined) upd.width       = width
    if (height      !== undefined) upd.height      = height
    if (pins        !== undefined) upd.pins        = pins
    const map = await WikiMap.findByIdAndUpdate(req.params.id, { $set: upd }, { returnDocument: 'after' })
    if (!map) return res.status(404).json({ error: 'Map not found' })
    res.json(map.toJSON())
  } catch (error) {
    console.error('Error updating map:', error)
    res.status(500).json({ error: 'Failed to update map' })
  }
})

app.delete('/api/maps/:id', requireAdmin, async (req, res) => {
  try {
    const map = await WikiMap.findByIdAndDelete(req.params.id)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    res.json({ message: 'Map deleted successfully' })
  } catch (error) {
    console.error('Error deleting map:', error)
    res.status(500).json({ error: 'Failed to delete map' })
  }
})

app.post('/api/maps/:mapId/pins', requireAdmin, async (req, res) => {
  try {
    const { name, description, linkedPageId, x, y } = req.body
    if (!name || x === undefined || y === undefined)
      return res.status(400).json({ error: 'Name, x, and y coordinates are required' })
    const map = await WikiMap.findById(req.params.mapId)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    const newPin = {
      id: newId(), name,
      description: description || '', linkedPageId: linkedPageId || null,
      x: parseFloat(x), y: parseFloat(y), createdAt: new Date().toISOString()
    }
    map.pins.push(newPin)
    map.markModified('pins')
    await map.save()
    res.status(201).json(newPin)
  } catch (error) {
    console.error('Error adding pin:', error)
    res.status(500).json({ error: 'Failed to add pin' })
  }
})

app.put('/api/maps/:mapId/pins/:pinId', requireAdmin, async (req, res) => {
  try {
    const map = await WikiMap.findById(req.params.mapId)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    const idx = map.pins.findIndex(p => p.id === req.params.pinId)
    if (idx === -1) return res.status(404).json({ error: 'Pin not found' })
    const { name, description, linkedPageId, x, y } = req.body
    const pin = map.pins[idx]
    map.pins[idx] = {
      ...pin,
      name:         name         !== undefined ? name          : pin.name,
      description:  description  !== undefined ? description   : pin.description,
      linkedPageId: linkedPageId !== undefined ? linkedPageId  : pin.linkedPageId,
      x:            x            !== undefined ? parseFloat(x) : pin.x,
      y:            y            !== undefined ? parseFloat(y) : pin.y,
      updatedAt:    new Date().toISOString()
    }
    map.markModified('pins')
    await map.save()
    res.json(map.pins[idx])
  } catch (error) {
    console.error('Error updating pin:', error)
    res.status(500).json({ error: 'Failed to update pin' })
  }
})

app.delete('/api/maps/:mapId/pins/:pinId', requireAdmin, async (req, res) => {
  try {
    const map = await WikiMap.findById(req.params.mapId)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    const origLen = map.pins.length
    map.pins = map.pins.filter(p => p.id !== req.params.pinId)
    if (map.pins.length === origLen) return res.status(404).json({ error: 'Pin not found' })
    map.markModified('pins')
    await map.save()
    res.json({ message: 'Pin deleted successfully' })
  } catch (error) {
    console.error('Error deleting pin:', error)
    res.status(500).json({ error: 'Failed to delete pin' })
  }
})

// =============================================================================
// BACKUP & RESTORE ENDPOINTS
// =============================================================================

app.post('/api/backup/create', requireAdmin, async (req, res) => {
  try {
    const [pages, users, characters, images, maps] = await Promise.all([
      Page.find().lean(), User.find().lean(), Character.find().lean(), Image.find().lean(), WikiMap.find().lean()
    ])
    const backupData = { version: '2.0', storage: 'mongodb', timestamp: new Date().toISOString(), data: { pages, users, characters, images, maps } }

    const backupDir = path.join(__dirname, 'temp-backup')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    fs.writeFileSync(path.join(backupDir, 'backup-data.json'), JSON.stringify(backupData, null, 2))

    const timestamp      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupFileName = `wiki-backup-${timestamp}.zip`
    const backupsDir     = path.join(__dirname, 'backups')
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true })
    const backupFilePath = path.join(backupsDir, backupFileName)

    const archiver = (await import('archiver')).default
    const output   = fs.createWriteStream(backupFilePath)
    const archive  = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      fs.rmSync(backupDir, { recursive: true, force: true })
      res.download(backupFilePath, backupFileName, err => {
        if (err) console.error('Error sending backup:', err)
        setTimeout(() => { if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath) }, 5000)
      })
    })
    archive.on('error', err => { throw err })
    archive.pipe(output)
    archive.directory(backupDir, false)
    archive.finalize()
  } catch (error) {
    console.error('Error creating backup:', error)
    res.status(500).json({ error: 'Failed to create backup', ...(IS_PRODUCTION ? {} : { details: error.message }) })
  }
})

app.post('/api/backup/restore', requireAdmin, backupUpload.single('backup'), async (req, res) => {
  const extractDir = path.join(__dirname, 'temp-restore')

  try {
    if (!req.file) return res.status(400).json({ error: 'No backup file uploaded' })
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
    fs.mkdirSync(extractDir, { recursive: true })

    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(req.file.path)
    const entries = zip.getEntries()

    if (entries.length === 0 || entries.length > 2000) {
      throw new Error('Invalid backup file: unexpected number of entries')
    }

    let totalExtractedBytes = 0
    const maxExtractedBytes = 200 * 1024 * 1024

    for (const entry of entries) {
      const entryName = entry.entryName.replace(/\\/g, '/')
      if (entryName.includes('\0') || entryName.startsWith('/') || entryName.split('/').includes('..')) {
        throw new Error('Invalid backup file: unsafe entry path')
      }

      const targetPath = path.resolve(extractDir, entryName)
      const relativePath = path.relative(extractDir, targetPath)
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error('Invalid backup file: path traversal detected')
      }

      if (entry.isDirectory) {
        fs.mkdirSync(targetPath, { recursive: true })
        continue
      }

      const data = entry.getData()
      totalExtractedBytes += data.length
      if (totalExtractedBytes > maxExtractedBytes) {
        throw new Error('Invalid backup file: extracted size too large')
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, data)
    }

    let backupJsonPath = path.join(extractDir, 'backup-data.json')
    if (!fs.existsSync(backupJsonPath)) {
      const entries = fs.readdirSync(extractDir)
      if (entries.length === 1 && fs.statSync(path.join(extractDir, entries[0])).isDirectory())
        backupJsonPath = path.join(extractDir, entries[0], 'backup-data.json')
    }
    if (!fs.existsSync(backupJsonPath)) throw new Error('Invalid backup file: missing backup-data.json')

    const backupData = JSON.parse(fs.readFileSync(backupJsonPath, 'utf8'))
    if (!backupData.data || !backupData.version) throw new Error('Invalid backup file format')

    const { pages = [], users = [], characters = [], images = [], maps = [] } = backupData.data

    const upsert = (Model, docs) =>
      Promise.all(docs.map(doc => {
        const { _id, id, __v, ...rest } = doc
        const docId = _id || id
        return Model.findByIdAndUpdate(docId, { _id: docId, ...rest }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true })
      }))

    await Promise.all([upsert(Page, pages), upsert(User, users), upsert(Character, characters), upsert(Image, images), upsert(WikiMap, maps)])

    res.json({
      message: 'Backup restored successfully',
      restoredData: { pages: pages.length, users: users.length, characters: characters.length, images: images.length, maps: maps.length }
    })
  } catch (error) {
    console.error('Error restoring backup:', error)
    res.status(500).json({ error: 'Failed to restore backup', ...(IS_PRODUCTION ? {} : { details: error.message }) })
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true })
  }
})

app.get('/api/backup/history', requireAdmin, (req, res) => {
  try {
    const backupsDir = path.join(__dirname, 'backups')
    if (!fs.existsSync(backupsDir)) return res.json([])
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.zip'))
      .map(f => { const s = fs.statSync(path.join(backupsDir, f)); return { name: f, size: s.size, created: s.birthtime, modified: s.mtime } })
      .sort((a, b) => b.created - a.created)
    res.json(files)
  } catch (error) {
    console.error('Error fetching backup history:', error)
    res.status(500).json({ error: 'Failed to fetch backup history' })
  }
})

app.post('/api/backup/clear-all', requireAdmin, async (req, res) => {
  try {
    const adminUser = await User.findOne({ role: 'admin' }).lean()

    await Promise.all([
      Page.deleteMany({}), Character.deleteMany({}),
      Image.deleteMany({}), WikiMap.deleteMany({}), User.deleteMany({})
    ])


    if (adminUser) {
      const { _id, __v, ...rest } = adminUser
      await User.create({ _id, ...rest })
    }

    res.json({ message: 'All wiki data has been cleared successfully', cleared: { pages: true, characters: true, images: true, maps: true } })
  } catch (error) {
    console.error('Error clearing data:', error)
    res.status(500).json({ error: 'Failed to clear data', ...(IS_PRODUCTION ? {} : { details: error.message }) })
  }
})

// =============================================================================
// STARTUP — connect to MongoDB first, then start listening
// =============================================================================

const seed = async () => {
  if ((await User.countDocuments()) === 0) {
    if (IS_PRODUCTION) {
      const username = process.env.BOOTSTRAP_ADMIN_USERNAME
      const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
      if (!username || !password || password.length < 12) {
        throw new Error('In production, BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD (>=12 chars) are required when no users exist')
      }
      await User.create({
        _id: '1', username,
        password: await bcrypt.hash(password, 10),
        role: 'admin', createdAt: new Date().toISOString()
      })
      console.log('Bootstrap admin created from environment variables')
    } else {
      await User.create({
        _id: '1', username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin', createdAt: new Date().toISOString()
      })
      console.log('Default admin created – username: admin, password: admin123')
    }
  }
  
}

// ── Health / uptime check ─────────────────────────────────────────────────────
app.get('/api/update', (req, res) => res.json({ status: true }))

connectDB()
  .then(seed)
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => { console.error('Failed to connect to MongoDB:', err.message); process.exit(1) })
