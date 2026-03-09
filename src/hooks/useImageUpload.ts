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
