# 🚀 Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Build Success
- [x] `npm run build` completed successfully
- [x] Production server running on http://localhost:3000
- [x] No TypeScript errors
- [x] No ESLint errors
- [x] All API routes working

### 2. Environment Variables Required

Create these in Vercel Dashboard → Project → Settings → Environment Variables:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (if using AI features)
OPENAI_API_KEY=your_openai_key
```

---

## 🚀 Deploy to Vercel

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub:**
```bash
cd d:\mega-pack
git init
git add .
git commit -m "Initial commit - AI Chat Organizer"
git remote add origin https://github.com/YOUR_USERNAME/mega-pack.git
git push -u origin main
```

2. **Connect to Vercel:**
- Go to https://vercel.com/new
- Click "Import Git Repository"
- Select your GitHub repo
- Vercel auto-detects Next.js project

3. **Configure:**
- Framework Preset: **Next.js**
- Root Directory: `./`
- Build Command: `npm run build` (auto-detected)
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install` (auto-detected)

4. **Add Environment Variables:**
- Click "Environment Variables"
- Add all required variables from `.env.local`

5. **Deploy:**
- Click "Deploy"
- Wait 2-3 minutes
- Get your URL: `https://your-project.vercel.app`

---

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd d:\mega-pack
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? Select your account
# - Link to existing project? N
# - What's your project's name? mega-pack
# - In which directory is your code located? ./
# - Want to modify settings? N

# Deploy to production
vercel --prod
```

---

## 🔧 Post-Deployment

### 1. Update Extension URLs

**Files to update:**

**extension/background.js:**
```javascript
// Line 1 - Change from:
const API_BASE_URL = 'http://localhost:3000';

// To:
const API_BASE_URL = 'https://your-project.vercel.app';
```

**extension/popup.js:**
```javascript
// Line 1 - Change from:
const API_BASE_URL = 'http://localhost:3000';

// To:
const API_BASE_URL = 'https://your-project.vercel.app';
```

**extension/popup.html:**
```html
<!-- Line ~130 - Change footer link -->
<a href="https://your-project.vercel.app" target="_blank">
  Open Web App →
</a>
```

### 2. Update CORS Settings (if needed)

If extension has CORS issues, add to `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ];
}
```

### 3. Test Extension Connection

1. Update extension URLs (as above)
2. Reload extension in `chrome://extensions/`
3. Test on ChatGPT:
   - Hover menu → saves to production DB
   - Context menu → saves to production
   - Check https://your-project.vercel.app/chats

---

## 🎯 Vercel Project Settings

### Build & Development Settings
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

### Root Directory
- `.` (root)

### Node.js Version
- **18.x** (recommended)
- **20.x** (also supported)

### Environment Variables
Add in Vercel Dashboard:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY (optional)
```

---

## 🔍 Verify Deployment

### Check these URLs work:
- ✅ `https://your-project.vercel.app` - Home page
- ✅ `https://your-project.vercel.app/chats` - Chats page
- ✅ `https://your-project.vercel.app/settings` - Settings page
- ✅ `https://your-project.vercel.app/api/chats` - API endpoint
- ✅ `https://your-project.vercel.app/api/folders` - API endpoint

### Test API Endpoints:
```bash
# Test GET folders
curl https://your-project.vercel.app/api/folders

# Test POST chat (with auth)
curl -X POST https://your-project.vercel.app/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test","platform":"ChatGPT","url":"https://test.com"}'
```

---

## 📊 Vercel Dashboard

After deployment, monitor:
- **Analytics:** User traffic, page views
- **Logs:** Runtime logs for debugging
- **Deployments:** Deployment history
- **Settings:** Environment variables, domains

**Your Vercel URL:** Add custom domain in Settings → Domains

---

## 🐛 Troubleshooting

### Build fails on Vercel:
1. Check build logs in Vercel dashboard
2. Verify all dependencies in `package.json`
3. Check Node.js version compatibility
4. Ensure `.env.local` variables are in Vercel

### Extension can't connect:
1. Verify API URLs updated in extension files
2. Check CORS settings in `next.config.js`
3. Verify Supabase RLS policies allow extension origin
4. Check Network tab in browser DevTools

### Database errors:
1. Verify Supabase environment variables
2. Check Supabase connection in Vercel logs
3. Verify database migrations ran
4. Check RLS policies in Supabase

---

## 🎉 Success!

After deployment:
1. ✅ Site live on Vercel
2. ✅ Extension connected to production
3. ✅ Database working
4. ✅ API endpoints responding

**Next Steps:**
- Share extension with users
- Monitor usage in Vercel Analytics
- Publish to Chrome Web Store
- Add custom domain (optional)

---

## 📝 Quick Commands Reference

```bash
# Local testing
npm run build        # Production build
npm start           # Production server (localhost:3000)

# Vercel deployment
vercel              # Deploy to preview
vercel --prod       # Deploy to production

# Check deployment status
vercel ls           # List deployments
vercel logs         # View logs
```

---

**Ready to deploy!** 🚀

Current status:
- ✅ Build successful
- ✅ Production server running (localhost:3000)
- ✅ Ready for Vercel deployment
