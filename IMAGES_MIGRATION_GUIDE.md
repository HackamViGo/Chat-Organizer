# 📸 ImagesPage Migration Guide - Vite to Next.js 14

**Оригинален файл:** `components/ImagesPage.tsx` (~1000+ lines)  
**Нов файл:** `src/components/features/images/ImagesPage.tsx` + `src/app/images/page.tsx`  
**Сложност:** 🔴 ВИСОКА (най-комплексен компонент в проекта)  
**Очаквано време:** 2-3 часа

---

## 📊 ПРЕГЛЕД НА ОРИГИНАЛЕН КОМПОНЕНТ

### Основни Features (10+):
1. **Upload System**
   - Drag & drop zone за файлове
   - File input fallback
   - Upload queue с progress bars
   - Multiple file upload
   - Preview преди upload

2. **Folder Management**
   - Sidebar със image folders
   - Icon picker (25+ icons)
   - Color picker за folders
   - Hover preview slideshow (auto-cycle през images)
   - Create/Delete/Select folders
   - URL-based folder selection (useSearchParams)

3. **Marquee Selection**
   - Right-click drag за multi-select
   - Visual selection rectangle
   - Click to toggle individual selection
   - Select all/Deselect all
   - Selection mode indicator

4. **Bulk Operations Bar**
   - Move selected images to folder
   - Delete multiple images
   - Convert multiple to AVIF
   - Cancel selection
   - Selected count display

5. **Filters & Search**
   - Format filter (All, PNG, JPG, AVIF, WebP)
   - Size filter (All, < 500KB, 500KB-2MB, > 2MB)
   - Date filter (All time, Last 7 days, Last 30 days)
   - Sort (Newest, Oldest, Largest, Smallest)
   - Real-time search bar

6. **Image Grid Display**
   - Responsive grid (1-6 columns based on screen)
   - Selection checkboxes (visible on hover)
   - Image preview thumbnails
   - File format badge
   - File size display
   - Right-click context menu

7. **Lightbox Modal**
   - Full-screen image view
   - Keyboard navigation (Arrow keys, Escape)
   - Previous/Next buttons
   - Slideshow mode (auto-advance)
   - Image info display
   - Close on outside click

8. **AVIF Conversion**
   - Browser-side conversion (Canvas API)
   - Quality slider
   - Original vs converted size comparison
   - Download converted image
   - Batch conversion support

9. **State Management**
   - Local state (useState, useRef)
   - IDB-KeyVal for persistence
   - useAppStore integration
   - Memoized computations (useMemo)
   - Callbacks (useCallback)

10. **URL Persistence**
    - Folder selection via URL params
    - Direct link to folders
    - Browser back/forward support

---

## 🔄 МИГРАЦИОНЕН ПЛАН

### СТЪПКА 1: Dependency Mapping

**Премахване:**
```typescript
// ❌ OLD
import { useSearchParams, useNavigate } from 'react-router-dom';
import { get, set, del, keys } from 'idb-keyval';
import { useAppStore } from '../store';
```

**Добавяне:**
```typescript
// ✅ NEW
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useImageStore } from '@/store/useImageStore';
import { useFolderStore } from '@/store/useFolderStore';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
```

---

### СТЪПКА 2: Store Enhancement

**Файл:** `src/store/useImageStore.ts`

**Текущо състояние:**
```typescript
// Базов store (създаден)
interface ImageStore {
  images: Image[];
  selectedImageId: string | null;
  isLoading: boolean;
  // ... basic CRUD
}
```

**Нужни допълнения:**
```typescript
interface ImageStore {
  images: Image[];
  selectedImageIds: Set<string>; // ✅ Bulk selection
  isLoading: boolean;
  uploadQueue: UploadItem[]; // ✅ Upload progress tracking
  
  // Bulk operations
  toggleImageSelection: (id: string) => void;
  selectAllImages: (imageIds: string[]) => void;
  clearSelection: () => void;
  
  // Upload queue
  addToUploadQueue: (file: File) => void;
  updateUploadProgress: (id: string, progress: number) => void;
  removeFromUploadQueue: (id: string) => void;
  
  // Supabase integration
  fetchImages: (userId: string, folderId?: string) => Promise<void>;
  uploadImage: (file: File, userId: string, folderId?: string) => Promise<Image>;
  deleteImages: (imageIds: string[]) => Promise<void>;
  moveImages: (imageIds: string[], folderId: string) => Promise<void>;
}
```

---

### СТЪПКА 3: Supabase Storage Setup

**Bucket Creation:**
```sql
-- Създай bucket 'images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);
```

**RLS Policies:**
```sql
-- Policy 1: Users can upload own images
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view own images
CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can delete own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Storage Structure:**
```
images/
  └── {user_id}/
      ├── original_filename_timestamp.png
      ├── photo_123456789.jpg
      └── ...
```

---

### СТЪПКА 4: API Route Enhancement

**Файл:** `src/app/api/upload/route.ts`

**Текуща версия - БАЗОВА:**
```typescript
// ✅ Работи, но без advanced features
export async function POST(request: Request) {
  // 1. Auth check
  // 2. Parse FormData
  // 3. Upload to Supabase Storage
  // 4. Save to images table
  // 5. Return URL
}
```

**Нужни подобрения:**
```typescript
export async function POST(request: Request) {
  // ... existing code ...
  
  // ✅ ADD: Folder support
  const folderId = formData.get('folderId') as string | null;
  
  // ✅ ADD: File validation
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }
  
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  
  // ✅ ADD: Unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${user.id}/${timestamp}_${sanitizedName}`;
  
  // ... upload & save ...
  
  // ✅ ADD: Return more metadata
  return NextResponse.json({
    id: imageRecord.id,
    url: publicUrl,
    path: fileName,
    size: file.size,
    type: file.type,
    created_at: imageRecord.created_at,
  });
}
```

---

### СТЪПКА 5: Component Migration

**Файл:** `src/components/features/images/ImagesPage.tsx`

#### 5.1. Router & Search Params
```typescript
// ❌ OLD
import { useSearchParams, useNavigate } from 'react-router-dom';
const [searchParams, setSearchParams] = useSearchParams();
const navigate = useNavigate();

// ✅ NEW
import { useSearchParams, useRouter } from 'next/navigation';
const searchParams = useSearchParams();
const router = useRouter();
const selectedFolderId = searchParams.get('folder');

// Update URL:
router.push(`/images?folder=${folderId}`);
```

#### 5.2. State Management
```typescript
// ❌ OLD
const { images, folders, addImage, deleteImage, addFolder, updateFolder, addToast } = useAppStore();

// ✅ NEW
const { 
  images, 
  selectedImageIds, 
  isLoading,
  fetchImages,
  uploadImage,
  deleteImages,
  toggleImageSelection,
  clearSelection 
} = useImageStore();

const { folders, addFolder, updateFolder, deleteFolder } = useFolderStore();
```

#### 5.3. Upload Handler
```typescript
// ❌ OLD (IDB-KeyVal)
const handleUpload = async (files: File[]) => {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const img = { id: crypto.randomUUID(), url, folderId, ... };
    await set(`image_${img.id}`, img);
    addImage(img);
  }
};

// ✅ NEW (Supabase Storage)
const handleUpload = async (files: File[]) => {
  for (const file of files) {
    try {
      setUploadQueue(prev => [...prev, { id: file.name, file, progress: 0 }]);
      
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolderId) formData.append('folderId', selectedFolderId);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const uploadedImage = await response.json();
      await fetchImages(user!.id, selectedFolderId || undefined);
      
      setUploadQueue(prev => prev.filter(item => item.file !== file));
    } catch (error) {
      console.error('Upload error:', error);
    }
  }
};
```

#### 5.4. Delete Handler
```typescript
// ❌ OLD
const handleDelete = async (imageIds: string[]) => {
  for (const id of imageIds) {
    await del(`image_${id}`);
    deleteImage(id);
  }
};

// ✅ NEW
const handleDeleteSelected = async () => {
  const idsToDelete = Array.from(selectedImageIds);
  
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Delete from Storage
    const imagesToDelete = images.filter(img => idsToDelete.includes(img.id));
    const pathsToDelete = imagesToDelete.map(img => img.path);
    
    await supabase.storage.from('images').remove(pathsToDelete);
    
    // Delete from DB
    await supabase.from('images').delete().in('id', idsToDelete);
    
    // Update store
    await fetchImages(user!.id, selectedFolderId || undefined);
    clearSelection();
  } catch (error) {
    console.error('Delete error:', error);
  }
};
```

#### 5.5. Features to Preserve (Copy-Paste)
Тези функции може да се копират ДИРЕКТНО от оригинала (не се променят):

✅ **Marquee Selection Logic:**
```typescript
// Цялата marquee логика е browser-side, не зависи от storage
const handleMouseDown = (e: React.MouseEvent) => { /* ... */ };
const handleMouseMove = (e: React.MouseEvent) => { /* ... */ };
const handleMouseUp = () => { /* ... */ };
```

✅ **Lightbox Component:**
```typescript
// Lightbox е pure UI component
const Lightbox = ({ image, onClose, onPrev, onNext }) => { /* ... */ };
```

✅ **AVIF Conversion:**
```typescript
// Canvas API конверсия е browser-side
const convertToAVIF = async (imageUrl: string, quality: number) => {
  const img = new Image();
  img.src = imageUrl;
  await img.decode();
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/avif', quality);
  });
  
  return blob;
};
```

✅ **Filters & Sort Logic:**
```typescript
// Filtering е client-side, работи с масив
const filteredImages = useMemo(() => {
  let result = images.filter(img => 
    selectedFolderId ? img.folderId === selectedFolderId : true
  );
  
  // Format filter
  if (formatFilter !== 'all') {
    result = result.filter(img => img.url.endsWith(formatFilter));
  }
  
  // Size filter
  // Date filter
  // Sort
  
  return result;
}, [images, selectedFolderId, formatFilter, /* ... */]);
```

---

### СТЪПКА 6: Page Wrapper

**Файл:** `src/app/images/page.tsx`

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ImagesPage from '@/components/features/images/ImagesPage';

export default async function ImagesRoute() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  // Optional: Fetch initial data server-side
  const { data: images } = await supabase
    .from('images')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  return <ImagesPage initialImages={images || []} />;
}
```

---

## ✅ TESTING CHECKLIST

### Upload Testing:
- [ ] Single image upload (PNG)
- [ ] Multiple images upload (drag & drop)
- [ ] Upload to specific folder
- [ ] Upload progress display
- [ ] Error handling (large file, invalid type)
- [ ] Preview thumbnails show correctly

### Folder Testing:
- [ ] Create folder με icon picker
- [ ] Select folder from sidebar
- [ ] Hover preview slideshow works
- [ ] Delete empty folder
- [ ] Delete folder με images (cascade или prevent?)
- [ ] URL persistence (?folder=xxx)

### Selection Testing:
- [ ] Click checkbox to select single image
- [ ] Right-click drag marquee selection
- [ ] Select all button
- [ ] Clear selection
- [ ] Selection count display
- [ ] Selected state visual indicator

### Bulk Operations:
- [ ] Move multiple images to folder
- [ ] Delete multiple images
- [ ] Convert multiple to AVIF
- [ ] Operations με loading states

### Lightbox Testing:
- [ ] Click image opens lightbox
- [ ] Arrow keys navigation
- [ ] Previous/Next buttons
- [ ] Slideshow auto-advance
- [ ] Close on Escape
- [ ] Close on outside click

### Filters Testing:
- [ ] Format filter (PNG, JPG, WebP, AVIF)
- [ ] Size filter categories
- [ ] Date range filter
- [ ] Sort options (newest, oldest, largest, smallest)
- [ ] Search bar filtering
- [ ] Combined filters work together

### Supabase Storage:
- [ ] Images upload to correct path (user_id/filename)
- [ ] Public URLs accessible
- [ ] RLS policies enforce user isolation
- [ ] Delete removes from storage
- [ ] Database records sync със storage

---

## 🚨 COMMON PITFALLS

### 1. **URL Object Memory Leak**
```typescript
// ❌ BAD - Memory leak με createObjectURL
const url = URL.createObjectURL(file);
// Забравяш да извикаш URL.revokeObjectURL(url)

// ✅ GOOD - Използвай Supabase URL
const { data } = await supabase.storage.from('images').getPublicUrl(path);
const url = data.publicUrl;
```

### 2. **Auth State Edge Cases**
```typescript
// ❌ BAD - Не проверяваш user
const { data: { user } } = await supabase.auth.getUser();
await uploadImage(user.id); // ❌ може да е null!

// ✅ GOOD
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  router.push('/auth/signin');
  return;
}
await uploadImage(user.id);
```

### 3. **Selection State Bug**
```typescript
// ❌ BAD - Set mutation
selectedImageIds.add(id); // ❌ React не ре-рендва!

// ✅ GOOD
setSelectedImageIds(prev => new Set([...prev, id]));
```

### 4. **Marquee Coordinates**
```typescript
// ❌ BAD - Забравяш scroll offset
const rect = { 
  left: startX, 
  top: startY, 
  width: currentX - startX 
};

// ✅ GOOD - Включи scroll
const rect = {
  left: startX,
  top: startY + window.scrollY,
  width: currentX - startX,
  height: currentY - startY + window.scrollY,
};
```

---

## 📦 FILES STRUCTURE

```
src/
├── app/
│   └── images/
│       └── page.tsx (Server Component wrapper)
├── components/
│   └── features/
│       └── images/
│           ├── ImagesPage.tsx (Main component - 1000+ lines)
│           ├── UploadZone.tsx (Optional: Extract upload UI)
│           ├── ImageGrid.tsx (Optional: Extract grid)
│           ├── Lightbox.tsx (Optional: Extract lightbox)
│           └── FolderSidebar.tsx (Optional: Extract sidebar)
├── store/
│   └── useImageStore.ts (Enhanced με bulk ops)
└── app/api/
    └── upload/
        └── route.ts (Enhanced με validation)
```

---

## 🎯 SUMMARY

**Главни промени:**
1. ✅ react-router-dom → next/navigation
2. ✅ idb-keyval → Supabase (Storage + DB)
3. ✅ useAppStore → useImageStore + useFolderStore
4. ✅ Upload logic → /api/upload route
5. ✅ URL persistence → searchParams
6. ⚠️ Запазват се БЕЗ ПРОМЕНИ: Marquee, Lightbox, AVIF, Filters

**Оценка за сложност:**
- **Lines of code:** ~1000+
- **New code:** ~200 lines (Supabase integration)
- **Modified code:** ~100 lines (routing, store)
- **Preserved code:** ~700 lines (UI logic)
- **Време:** 2-3 часа

**Success Criteria:**
✅ All 10 features work identically  
✅ No browser errors  
✅ Supabase Storage + DB in sync  
✅ Performance не се влошава  
✅ Mobile responsive  

---

**Ready to migrate? Start με СТЪПКА 1!** 🚀
