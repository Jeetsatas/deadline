import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PdfMetadataResult {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  pages: PdfPageInfo[];
}

export class PdfService {
  private static async toArrayBuffer(
    input: File | Blob | ArrayBuffer | Uint8Array
  ): Promise<ArrayBuffer | Uint8Array> {
    if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
      return input;
    }
    if (typeof (input as Blob).arrayBuffer === 'function') {
      return await (input as Blob).arrayBuffer();
    }
    return input as unknown as ArrayBuffer;
  }

  /**
   * Merges multiple PDF files in the provided order into a single PDF document.
   */
  static async mergePdfs(
    files: (File | Blob | ArrayBuffer)[]
  ): Promise<{ blob: Blob; bytes: Uint8Array; pageCount: number; sizeBytes: number }> {
    if (!files || files.length === 0) {
      throw new Error('At least one PDF file is required to merge.');
    }

    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;

    for (const file of files) {
      const buffer = await this.toArrayBuffer(file);
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      totalPages += copiedPages.length;
    }

    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
    return { blob, bytes: mergedBytes, pageCount: totalPages, sizeBytes: mergedBytes.byteLength };
  }

  /**
   * Splits a PDF by extracting specified pages (1-indexed) into a new PDF document.
   */
  static async extractPages(
    file: File | Blob | ArrayBuffer,
    pageNumbers: number[]
  ): Promise<{ blob: Blob; bytes: Uint8Array; pageCount: number }> {
    const buffer = await this.toArrayBuffer(file);
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const totalPages = srcDoc.getPageCount();
    // Convert 1-indexed to 0-indexed and filter valid indices
    const indices = pageNumbers
      .map((p) => p - 1)
      .filter((i) => i >= 0 && i < totalPages);

    if (indices.length === 0) {
      throw new Error('No valid page numbers provided for extraction.');
    }

    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const bytes = await newDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return { blob, bytes, pageCount: copiedPages.length };
  }

  /**
   * Rotates all or specified pages (1-indexed) by a given angle in degrees (90, 180, 270).
   */
  static async rotatePages(
    file: File | Blob | ArrayBuffer,
    rotationAngle = 90,
    targetPages?: number[]
  ): Promise<{ blob: Blob; bytes: Uint8Array; pageCount: number }> {
    const buffer = await this.toArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    const targetSet = targetPages ? new Set(targetPages.map((p) => p - 1)) : null;

    pages.forEach((page, idx) => {
      if (!targetSet || targetSet.has(idx)) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rotationAngle) % 360));
      }
    });

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return { blob, bytes, pageCount: pages.length };
  }

  /**
   * Reorders and/or deletes pages. Expects an array of 1-indexed page numbers in target sequence.
   */
  static async reorderAndFilterPages(
    file: File | Blob | ArrayBuffer,
    targetPageSequence: number[]
  ): Promise<{ blob: Blob; bytes: Uint8Array; pageCount: number }> {
    const buffer = await this.toArrayBuffer(file);
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const total = srcDoc.getPageCount();
    const indices = targetPageSequence
      .map((p) => p - 1)
      .filter((i) => i >= 0 && i < total);

    if (indices.length === 0) {
      throw new Error('Target page sequence cannot be empty.');
    }

    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const bytes = await newDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return { blob, bytes, pageCount: copiedPages.length };
  }

  /**
   * Converts a collection of images (JPG / PNG) into a cleanly formatted PDF document.
   */
  static async imagesToPdf(
    imageFiles: File[]
  ): Promise<{ blob: Blob; bytes: Uint8Array; pageCount: number }> {
    if (!imageFiles || imageFiles.length === 0) {
      throw new Error('At least one image is required.');
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of imageFiles) {
      const buffer = await file.arrayBuffer();
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

      let embeddedImage;
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(buffer);
      } else {
        embeddedImage = await pdfDoc.embedJpg(buffer);
      }

      const { width, height } = embeddedImage.scale(1);

      // Create page matching image dimensions (or standard A4/letter with scaling)
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return { blob, bytes, pageCount: imageFiles.length };
  }

  /**
   * Adds a diagonal watermark text to every page of the PDF document.
   */
  static async addWatermark(
    file: File | Blob | ArrayBuffer,
    watermarkText: string,
    opacity = 0.25,
    fontSize = 48
  ): Promise<{ blob: Blob; bytes: Uint8Array; pageCount: number }> {
    const buffer = await this.toArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      page.drawText(watermarkText, {
        x: width / 2 - textWidth / 2,
        y: height / 2 - textHeight / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(45),
      });
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return { blob, bytes, pageCount: pages.length };
  }

  /**
   * Reads PDF metadata and page metrics.
   */
  static async getPdfMetadata(file: File | Blob | ArrayBuffer): Promise<PdfMetadataResult> {
    const buffer = await this.toArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    const pageInfos: PdfPageInfo[] = pages.map((p, idx) => ({
      pageNumber: idx + 1,
      width: Math.round(p.getWidth()),
      height: Math.round(p.getHeight()),
      rotation: p.getRotation().angle,
    }));

    return {
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer(),
      creationDate: pdfDoc.getCreationDate(),
      modificationDate: pdfDoc.getModificationDate(),
      pageCount: pages.length,
      fileSizeBytes: buffer.byteLength,
      width: pageInfos[0]?.width || 0,
      height: pageInfos[0]?.height || 0,
      pages: pageInfos,
    };
  }
}
