# Note Images — Design

## Goal

Add optional header image to notes with camera capture support in PWA mode.

## Architecture

Single image per note, stored via Convex built-in file storage. Client-side resize before upload. Native OS picker handles camera vs library choice on mobile.

## Schema Change

Add to `notes` table in `convex/schema.ts`:

```typescript
imageId: v.optional(v.id("_storage"))
```

No new tables needed — `_storage` is Convex's built-in file storage table.

## Upload Flow

1. User clicks "Add Image" button in note create/edit dialog
2. `<input type="file" accept="image/*">` opens native picker (camera option on mobile)
3. Client resizes image: max 1920px wide, JPEG at 0.85 quality (canvas API)
4. Client calls `generateUploadUrl` mutation → gets presigned URL
5. Client POSTs resized blob to presigned URL → gets storage ID
6. Storage ID saved with note on create/update

## Display

- **Note cards (grid):** Thumbnail at top of card (~150px tall, object-cover)
- **Edit dialog:** Image preview above markdown content area
- **Image URL:** Retrieved via `ctx.storage.getUrl(imageId)` in Convex query

## Remove / Replace

- "Remove image" button in edit dialog → deletes storage file, clears `imageId`
- Uploading new image → deletes old storage file, stores new one

## Constraints

- 5MB max file size (enforced client-side before resize)
- Client-side resize: max 1920px wide, JPEG 0.85 quality
- No external libraries — uses canvas API + fetch
- Camera capture via native `accept="image/*"` attribute (no WebRTC needed)

## Files to Modify

- `convex/schema.ts` — add `imageId` field to notes
- `convex/notes.ts` — add `generateUploadUrl` mutation, update create/update/remove/list to handle imageId, add `getImageUrl` query
- `src/routes/Notes.tsx` — image upload UI in dialog, thumbnails on cards, remove/replace buttons
- `src/lib/imageResize.ts` — new file for client-side image resize utility
- `src/hooks/useImageUpload.ts` — new file for upload hook
- `src/hooks/useImageUrl.ts` — new file for image URL resolution hook

## DONE

Implemented in Tasks 1-7. All features working:
- Schema updated with imageId
- Backend CRUD handles image lifecycle (upload, replace, delete)
- Client-side resize utility (max 1920px, JPEG 0.85)
- Upload/remove UI in note dialog
- Thumbnails on note cards
- Camera capture on mobile PWA
