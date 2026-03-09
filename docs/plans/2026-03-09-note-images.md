# Note Images Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional header image to notes with camera capture in PWA mode, client-side resize, and Convex file storage.

**Architecture:** Images stored in Convex's built-in `_storage` table. Notes reference images via `imageId: Id<"_storage">`. Client resizes images (max 1920px, JPEG 0.85) before uploading via presigned URL. Mobile PWA uses native `accept="image/*"` for camera access.

**Tech Stack:** Convex file storage (built-in), Canvas API (resize), no external libraries.

**Design doc:** `docs/plans/2026-03-09-note-images-design.md`

---

### Task 1: Schema — add imageId to notes

**Files:**
- Modify: `convex/schema.ts:18-24`

**Step 1: Add imageId field to notes table**

Replace the notes table definition (lines 18-24) with:

```typescript
  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
```

**Step 2: Verify schema pushes**

Run: `cd /Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest && pnpm convex dev` (should push schema without errors, then Ctrl+C)

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add imageId field to notes schema"
```

---

### Task 2: Backend — upload URL + image handling in CRUD

**Files:**
- Modify: `convex/notes.ts`

**Step 1: Add generateUploadUrl mutation**

Add at the top of `convex/notes.ts`, after the imports:

```typescript
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
```

**Step 2: Update create mutation to accept optional imageId**

Change the `create` mutation args and handler:

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("notes", {
      userId: user._id,
      title: args.title,
      content: args.content,
      imageId: args.imageId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

**Step 3: Update update mutation to accept optional imageId**

Change the `update` mutation args and handler. When a new imageId is provided, delete the old storage file:

```typescript
export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) throw new Error("Not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;

    // Handle image: replace or remove
    if (args.imageId !== undefined) {
      // Delete old image if replacing
      if (note.imageId) await ctx.storage.delete(note.imageId);
      updates.imageId = args.imageId;
    } else if (args.removeImage) {
      if (note.imageId) await ctx.storage.delete(note.imageId);
      updates.imageId = undefined;
    }

    await ctx.db.patch(args.id, updates);
  },
});
```

**Step 4: Update remove mutation to delete storage file**

Change the `remove` handler to also delete the image:

```typescript
export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) throw new Error("Not found");
    // Delete image from storage if exists
    if (note.imageId) await ctx.storage.delete(note.imageId);
    await ctx.db.delete(args.id);
  },
});
```

**Step 5: Add getImageUrl query**

Add at the bottom of `convex/notes.ts`:

```typescript
export const getImageUrl = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});
```

**Step 6: Verify types compile**

Run: `cd /Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest && pnpm tsc --noEmit`

**Step 7: Commit**

```bash
git add convex/notes.ts
git commit -m "feat: add image upload URL, imageId to CRUD, storage cleanup"
```

---

### Task 3: Client-side image resize utility

**Files:**
- Create: `src/lib/imageResize.ts`

**Step 1: Create the resize utility**

Create `src/lib/imageResize.ts`:

```typescript
const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class ImageTooLargeError extends Error {
  constructor() {
    super("Image must be under 5MB");
    this.name = "ImageTooLargeError";
  }
}

/**
 * Resize an image file to max 1920px wide, output as JPEG blob.
 * Throws ImageTooLargeError if original file exceeds 5MB.
 */
export async function resizeImage(file: File): Promise<Blob> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageTooLargeError();
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate new dimensions
  let newWidth = width;
  let newHeight = height;
  if (width > MAX_WIDTH) {
    newWidth = MAX_WIDTH;
    newHeight = Math.round((height * MAX_WIDTH) / width);
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  // Convert to JPEG blob
  return await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
}
```

**Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/imageResize.ts
git commit -m "feat: add client-side image resize utility"
```

---

### Task 4: Image upload hook

**Files:**
- Create: `src/hooks/useImageUpload.ts`

**Step 1: Create the upload hook**

This hook encapsulates the full flow: file input → resize → upload → get storage ID.

Create `src/hooks/useImageUpload.ts`:

```typescript
import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { resizeImage, ImageTooLargeError } from "@/lib/imageResize";

interface UseImageUploadReturn {
  /** Trigger the file input dialog */
  pickImage: () => void;
  /** Whether an upload is in progress */
  uploading: boolean;
  /** Error message if upload failed */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
  /** Hidden file input element to render */
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    type: "file";
    accept: "image/*";
    capture: "environment";
    className: "hidden";
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

export function useImageUpload(
  onUploaded: (imageId: Id<"_storage">) => void,
): UseImageUploadReturn {
  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        // 1. Resize
        const blob = await resizeImage(file);

        // 2. Get upload URL
        const uploadUrl = await generateUploadUrl();

        // 3. Upload
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        if (!response.ok) throw new Error("Upload failed");

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };

        // 4. Callback
        onUploaded(storageId);
      } catch (err) {
        if (err instanceof ImageTooLargeError) {
          setError(err.message);
        } else {
          setError("Failed to upload image. Please try again.");
        }
      } finally {
        setUploading(false);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [generateUploadUrl, onUploaded],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const pickImage = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return {
    pickImage,
    uploading,
    error,
    clearError: () => setError(null),
    inputProps: {
      ref: inputRef,
      type: "file" as const,
      accept: "image/*" as const,
      capture: "environment" as const,
      className: "hidden" as const,
      onChange,
    },
  };
}
```

**Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add src/hooks/useImageUpload.ts
git commit -m "feat: add useImageUpload hook"
```

---

### Task 5: Image URL hook

**Files:**
- Create: `src/hooks/useImageUrl.ts`

**Step 1: Create hook to get image URL from storage ID**

Create `src/hooks/useImageUrl.ts`:

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/** Returns the CDN URL for a Convex storage ID, or null if no imageId. */
export function useImageUrl(imageId: Id<"_storage"> | undefined): string | null | undefined {
  return useQuery(
    api.notes.getImageUrl,
    imageId ? { imageId } : "skip",
  );
}
```

**Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add src/hooks/useImageUrl.ts
git commit -m "feat: add useImageUrl hook"
```

---

### Task 6: Update NoteDialog — image upload UI

**Files:**
- Modify: `src/routes/Notes.tsx`

This is the largest task. The NoteDialog component needs:
- A `pendingImageId` state for newly uploaded images
- Image preview above the content area
- "Add Image" button + "Remove" button
- Pass imageId through to create/update mutations

**Step 1: Add imports**

Add to the existing imports in `Notes.tsx`:

```typescript
import { Camera, X } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useImageUrl } from "@/hooks/useImageUrl";
import { Id } from "../../convex/_generated/dataModel";
```

Note: `Camera` and `X` are new lucide icons. `Id` may already be imported — check and don't duplicate.

**Step 2: Update NoteDialogProps interface**

The `initial` prop should include optional imageId:

```typescript
interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id: Id<"notes">; title: string; content: string; imageId?: Id<"_storage"> };
}
```

**Step 3: Update NoteDialog component**

Inside the `NoteDialog` function, add image state and the upload hook:

```typescript
function NoteDialog({ open, onOpenChange, initial }: NoteDialogProps) {
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Image state
  const [pendingImageId, setPendingImageId] = useState<Id<"_storage"> | undefined>(
    initial?.imageId,
  );
  const [imageRemoved, setImageRemoved] = useState(false);

  const imageUpload = useImageUpload((imageId) => {
    setPendingImageId(imageId);
    setImageRemoved(false);
  });

  // The effective imageId to display (pending upload or existing)
  const displayImageId = imageRemoved ? undefined : pendingImageId;
  const imageUrl = useImageUrl(displayImageId);

  const isEdit = !!initial;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTitle(initial?.title ?? "");
      setContent(initial?.content ?? "");
      setPreview(false);
      setPendingImageId(initial?.imageId);
      setImageRemoved(false);
    }
    onOpenChange(next);
  };

  const handleRemoveImage = () => {
    setPendingImageId(undefined);
    setImageRemoved(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateNote({
          id: initial.id,
          title,
          content,
          ...(pendingImageId && pendingImageId !== initial.imageId
            ? { imageId: pendingImageId }
            : {}),
          ...(imageRemoved ? { removeImage: true } : {}),
        });
      } else {
        await createNote({ title, content, imageId: pendingImageId });
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };
```

**Step 4: Add image UI in the dialog JSX**

Inside the dialog's `<div className="space-y-4 py-2">`, add the image section BEFORE the title input:

```tsx
{/* Image upload */}
<div className="space-y-2">
  {imageUrl ? (
    <div className="relative">
      <img
        src={imageUrl}
        alt="Note image"
        className="h-40 w-full rounded-md object-cover"
      />
      <Button
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 size-7"
        onClick={handleRemoveImage}
      >
        <X className="size-4" />
      </Button>
    </div>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={imageUpload.pickImage}
      disabled={imageUpload.uploading}
    >
      <Camera className="size-4" />
      {imageUpload.uploading ? "Uploading…" : "Add Image"}
    </Button>
  )}
  {imageUpload.error && (
    <p className="text-sm text-destructive">{imageUpload.error}</p>
  )}
  {/* Hidden file input */}
  <input {...imageUpload.inputProps} />
</div>
```

**Step 5: Update openEdit to pass imageId**

In the `Notes` component, update `openEdit`:

```typescript
const openEdit = (note: { _id: Id<"notes">; title: string; content: string; imageId?: Id<"_storage"> }) => {
  setEditing({ id: note._id, title: note.title, content: note.content, imageId: note.imageId });
};
```

And update the `editing` state type:

```typescript
const [editing, setEditing] = useState<{
  id: Id<"notes">;
  title: string;
  content: string;
  imageId?: Id<"_storage">;
} | null>(null);
```

**Step 6: Verify it compiles**

Run: `pnpm tsc --noEmit`

**Step 7: Commit**

```bash
git add src/routes/Notes.tsx
git commit -m "feat: add image upload/remove UI to note dialog"
```

---

### Task 7: Note card thumbnails

**Files:**
- Modify: `src/routes/Notes.tsx`

**Step 1: Create NoteCardImage component**

Add a small component inside `Notes.tsx` (before the `Notes` function) that renders a thumbnail:

```typescript
function NoteCardImage({ imageId }: { imageId: Id<"_storage"> }) {
  const url = useImageUrl(imageId);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="h-36 w-full rounded-t-lg object-cover"
    />
  );
}
```

**Step 2: Add thumbnail to note cards**

In the notes grid `.map()`, update the Card to show the image above CardHeader:

```tsx
<Card
  key={note._id}
  className="group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md"
  onClick={() => openEdit(note)}
>
  {note.imageId && <NoteCardImage imageId={note.imageId} />}
  <CardHeader>
    {/* ... existing CardTitle and CardDescription ... */}
  </CardHeader>
  {/* ... rest unchanged ... */}
</Card>
```

Note: Added `overflow-hidden` to Card className so the rounded image corners clip properly.

**Step 3: Update the note type annotation in the map**

Update the type in `notes.map()`:

```typescript
notes.map((note: { _id: Id<"notes">; title: string; content: string; updatedAt: number; imageId?: Id<"_storage"> }) => {
```

**Step 4: Also update the CSV export map type**

Update the type annotation in the CSV export `notes.map()` to include `imageId`:

```typescript
notes.map((n: { title: string; content: string; _creationTime: number; updatedAt: number; imageId?: Id<"_storage"> }) => ({
```

(We don't export imageId to CSV — just need the type to match.)

**Step 5: Verify it compiles and test visually**

Run: `pnpm tsc --noEmit`

Then start the app (`pnpm dev` + `pnpm convex dev` in separate terminals) and:
1. Create a note with an image — should show thumbnail on card
2. Edit the note — should show image preview with remove button
3. Remove the image — should disappear from card
4. Create a note without image — should look normal (no broken UI)
5. Test on mobile/emulator — file picker should offer camera option

**Step 6: Commit**

```bash
git add src/routes/Notes.tsx
git commit -m "feat: add image thumbnails to note cards"
```

---

### Task 8: Update CLAUDE.md and design doc

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/plans/2026-03-09-note-images-design.md`

**Step 1: Add image info to CLAUDE.md**

In the file structure section, note that notes now support images. In the Convex Patterns or Common Tasks section, add a brief note:

```markdown
### Image uploads

Notes support optional header images via Convex file storage:
- `convex/notes.ts` has `generateUploadUrl` mutation
- `src/hooks/useImageUpload.ts` handles resize + upload flow
- `src/hooks/useImageUrl.ts` resolves storage ID → CDN URL
- `src/lib/imageResize.ts` client-side resize (max 1920px, JPEG 0.85)
- Images limited to 5MB before resize
```

**Step 2: Mark design doc as DONE**

Add to bottom of `docs/plans/2026-03-09-note-images-design.md`:

```markdown
## DONE

Implemented in Tasks 1-7. All features working:
- Schema updated with imageId
- Backend CRUD handles image lifecycle
- Client-side resize utility
- Upload/remove UI in note dialog
- Thumbnails on note cards
- Camera capture on mobile PWA
```

**Step 3: Commit**

```bash
git add CLAUDE.md docs/plans/2026-03-09-note-images-design.md
git commit -m "docs: update CLAUDE.md and mark image design as done"
```
