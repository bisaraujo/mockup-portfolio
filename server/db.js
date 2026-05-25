import mongoose from 'mongoose'

// ── Connection ────────────────────────────────────────────────────────────────
export const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set')
  }
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB Atlas')
}

// Shared toJSON transform: expose _id as id, hide __v
const transform = (_doc, ret) => {
  ret.id = ret._id
  delete ret._id
  delete ret.__v
  return ret
}

// ── User ──────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  _id:       { type: String },
  username:  { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 32 },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false })

userSchema.set('toJSON', { transform })
export const User = mongoose.model('User', userSchema)

// ── Page ──────────────────────────────────────────────────────────────────────
const pageSchema = new mongoose.Schema({
  _id:        { type: String },
  title:      { type: String, default: '' },
  content:    { type: String, default: '' },
  folderPath: { type: String, default: '' },
  // Visibility determines who can read the page: 'public' = everyone authenticated,
  // 'hidden' = admins only (used to protect pages placed in Hidden folders),
  // 'private' = per-user access control: only the `ownerId` or users listed in
  // `allowedUsers` (or admins) may read the page.
  visibility: { type: String, enum: ['public', 'hidden', 'private'], default: 'public' },
  // Owner (single user id) and per-page ACL for private pages
  ownerId:    { type: String, default: '' },
  allowedUsers:{ type: [String], default: [] },
  customCSS:  { type: String, default: '' },
  editors:    { type: [String], default: [] },
  sidebar:    { type: mongoose.Schema.Types.Mixed, default: () => ({ image: '', quote: '', infoFields: [] }) },
  createdAt:  { type: String, default: () => new Date().toISOString() }
}, { versionKey: false })

pageSchema.set('toJSON', { transform })
export const Page = mongoose.model('Page', pageSchema)

// ── Character ─────────────────────────────────────────────────────────────────
const characterSchema = new mongoose.Schema({
  _id:                   { type: String },
  name:                  { type: String, default: 'Unnamed Character' },
  title:                 { type: String, default: '' },
  content:               { type: String, default: '' },
  image:                 { type: String, default: '' },
  ownerId:               { type: String, required: true },
  ownerName:             { type: String, default: '' },
  folderPath:            { type: String, default: 'Characters' },
  customCSS:             { type: String, default: '' },
  sidebar:               { type: mongoose.Schema.Types.Mixed, default: () => ({ image: '', quote: '', infoFields: [] }) },
  diary:                 { type: Array, default: [] },
  inventory:             { type: Array, default: [] },
  scrapbook:             { type: Array, default: [] },
  characterSheet:        { type: String, default: '' },
  characterSheetPublicId:{ type: String, default: null },
  dmNotes:               { type: String, default: '' },
  createdAt:             { type: String, default: () => new Date().toISOString() }
}, { versionKey: false })

characterSchema.set('toJSON', { transform })
export const Character = mongoose.model('Character', characterSchema)

// ── Image ─────────────────────────────────────────────────────────────────────
const imageSchema = new mongoose.Schema({
  _id:          { type: String },
  name:         { type: String, default: '' },
  url:          { type: String, default: '' },
  filename:     { type: String, default: '' },
  publicId:     { type: String, default: null },
  resourceType: { type: String, default: 'local' },
  size:         { type: Number, default: 0 },
  uploadedAt:   { type: String, default: () => new Date().toISOString() },
  ownerId:      { type: String, default: '' },
  ownerName:    { type: String, default: '' }
}, { versionKey: false })

imageSchema.set('toJSON', { transform })
export const Image = mongoose.model('Image', imageSchema)

// ── Map ───────────────────────────────────────────────────────────────────────
const mapSchema = new mongoose.Schema({
  _id:         { type: String },
  name:        { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  description: { type: String, default: '' },
  width:       { type: Number, default: null },
  height:      { type: Number, default: null },
  pins:        { type: Array, default: [] },
  createdAt:   { type: String, default: () => new Date().toISOString() },
  updatedAt:   { type: String, default: null }
}, { versionKey: false })

mapSchema.set('toJSON', { transform })
export const WikiMap = mongoose.model('WikiMap', mapSchema)
