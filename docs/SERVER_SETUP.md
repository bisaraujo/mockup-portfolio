# Wiki Server Setup

This project now includes a server backend for storing images.

## Setup

1. **Install all dependencies** (main project + server):
   ```bash
   npm run setup
   ```

   Or manually:
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

2. **Start both client and server**:
   ```bash
   npm run start:all
   ```

   Or start them separately:
   ```bash
   # Terminal 1 - Client
   npm run dev

   # Terminal 2 - Server
   npm run server:dev
   ```

## Server Details

- **Port**: 3001
- **Uploads Directory**: `server/uploads/`
- **Data Directory**: `server/data/`
- **Max File Size**: 5MB
- **Allowed Formats**: JPEG, JPG, PNG, GIF, WebP

## API Endpoints

### Images
- `POST /api/upload` - Upload an image
- `GET /api/images` - Get all uploaded images
- `DELETE /api/images/:filename` - Delete an image
- `GET /uploads/:filename` - Access uploaded image files

### Pages
- `GET /api/pages` - Get all pages
- `GET /api/pages/:id` - Get a specific page
- `POST /api/pages` - Create a new page
- `PUT /api/pages/:id` - Update a page
- `DELETE /api/pages/:id` - Delete a page

## How It Works

1. **Images**: When you upload an image, it's sent to the server and saved in `server/uploads/` folder
2. **Pages**: All page data (content, titles, categories, custom CSS) is saved in `server/data/pages.json`
3. **Server URLs**: Images are served from `http://localhost:3001/uploads/`
4. **Cache**: Pages are also cached in browser localStorage for offline access

## Benefits Over Browser-Only Storage

- ✓ No 5MB localStorage limit
- ✓ Pages persist even after clearing browser data
- ✓ Can be accessed from any device (if server is accessible)
- ✓ Shareable URLs for images
- ✓ Better performance (no large base64 strings)
- ✓ Central data storage for all users

## Production Deployment

For production, you'll need to:
1. Deploy the server to a hosting service (Heroku, Railway, Vercel, etc.)
2. Update `VITE_API_URL` in `.env` to your server URL
3. Configure CORS on the server for your domain
4. Consider using cloud storage (AWS S3, Cloudinary, etc.) instead of local disk
