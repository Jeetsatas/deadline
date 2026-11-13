export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageFilterOptions {
  brightness?: number; // 0 - 200 (100 is normal)
  contrast?: number; // 0 - 200 (100 is normal)
  grayscale?: number; // 0 - 100
  sepia?: number; // 0 - 100
  invert?: number; // 0 - 100
  blur?: number; // 0 - 20 (px)
}

export class ImageService {
  /**
   * Loads an image file into an HTMLImageElement in memory.
   */
  static loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load image: ${err}`));
      };
      img.src = objectUrl;
    });
  }

  /**
   * Resizes an image to the given width and height with optional format and quality.
   */
  static async resizeImage(
    file: File | Blob,
    targetWidth: number,
    targetHeight: number,
    format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality = 0.92
  ): Promise<{ blob: Blob; width: number; height: number; sizeBytes: number }> {
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(targetWidth));
    canvas.height = Math.max(1, Math.round(targetHeight));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context.');

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode canvas to image blob.'))),
        format,
        quality
      );
    });

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      sizeBytes: blob.size,
    };
  }

  /**
   * Crops an image using the specified rectangle coordinates.
   */
  static async cropImage(
    file: File | Blob,
    crop: ImageCropRect,
    format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality = 0.92
  ): Promise<{ blob: Blob; width: number; height: number; sizeBytes: number }> {
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(crop.width));
    canvas.height = Math.max(1, Math.round(crop.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context.');

    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode cropped blob.'))),
        format,
        quality
      );
    });

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      sizeBytes: blob.size,
    };
  }

  /**
   * Compresses an image by adjusting format and quality compression parameters.
   */
  static async compressImage(
    file: File | Blob,
    quality = 0.75,
    format: 'image/jpeg' | 'image/webp' | 'image/png' = 'image/jpeg'
  ): Promise<{ blob: Blob; originalSizeBytes: number; compressedSizeBytes: number; reductionPct: number }> {
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context.');

    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to compress image.'))),
        format,
        quality
      );
    });

    const origSize = file.size;
    const compSize = blob.size;
    const reduction = origSize > 0 ? Math.round(((origSize - compSize) / origSize) * 100) : 0;

    return {
      blob,
      originalSizeBytes: origSize,
      compressedSizeBytes: compSize,
      reductionPct: reduction,
    };
  }

  /**
   * Rotates and/or flips an image.
   */
  static async rotateAndFlip(
    file: File | Blob,
    rotationAngle = 90,
    flipHorizontal = false,
    flipVertical = false
  ): Promise<{ blob: Blob; width: number; height: number }> {
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');

    const radians = (rotationAngle * Math.PI) / 180;
    const isSideways = rotationAngle === 90 || rotationAngle === 270;

    canvas.width = isSideways ? img.naturalHeight : img.naturalWidth;
    canvas.height = isSideways ? img.naturalWidth : img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context.');

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to rotate image.'))), 'image/png');
    });

    return { blob, width: canvas.width, height: canvas.height };
  }

  /**
   * Applies CSS / Canvas visual filters (brightness, contrast, grayscale, sepia, invert, blur).
   */
  static async applyFilters(
    file: File | Blob,
    filters: ImageFilterOptions
  ): Promise<{ blob: Blob; width: number; height: number }> {
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context.');

    const filterStrings: string[] = [];
    if (filters.brightness !== undefined) filterStrings.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== undefined) filterStrings.push(`contrast(${filters.contrast}%)`);
    if (filters.grayscale !== undefined) filterStrings.push(`grayscale(${filters.grayscale}%)`);
    if (filters.sepia !== undefined) filterStrings.push(`sepia(${filters.sepia}%)`);
    if (filters.invert !== undefined) filterStrings.push(`invert(${filters.invert}%)`);
    if (filters.blur !== undefined && filters.blur > 0) filterStrings.push(`blur(${filters.blur}px)`);

    ctx.filter = filterStrings.length > 0 ? filterStrings.join(' ') : 'none';
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to filter image.'))), 'image/png');
    });

    return { blob, width: canvas.width, height: canvas.height };
  }

  /**
   * Analyzes an image and extracts a dominant color palette.
   */
  static async extractColorPalette(file: File | Blob, maxColors = 6): Promise<string[]> {
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    // Scale down for rapid sampling
    const sampleSize = 64;
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    const colorBuckets: Record<string, number> = {};

    for (let i = 0; i < imageData.length; i += 16) {
      const r = Math.round(imageData[i] / 32) * 32;
      const g = Math.round(imageData[i + 1] / 32) * 32;
      const b = Math.round(imageData[i + 2] / 32) * 32;
      const a = imageData[i + 3];

      if (a > 128) {
        // Quantized hex
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        colorBuckets[hex] = (colorBuckets[hex] || 0) + 1;
      }
    }

    const sorted = Object.entries(colorBuckets)
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex);

    return sorted.slice(0, maxColors);
  }
}
