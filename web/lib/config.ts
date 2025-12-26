export const config = {
  image: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: "webp" as const,
  },
  imessageAttachment: {
    // Resize ratio: 0.5 = 50% of original size, 1.0 = no resize
    resizeRatio: 0.5,
    quality: 70,
    format: "webp" as const,
  },
  upload: {
    maxFileSizeMB: 10,
  },
}




