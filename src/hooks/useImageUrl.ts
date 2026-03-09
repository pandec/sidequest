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
