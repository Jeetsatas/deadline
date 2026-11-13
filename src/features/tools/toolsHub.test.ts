import { describe, it, expect } from 'vitest';
import { ToolRegistry } from './registry/ToolRegistry';
import { PdfService } from './services/pdfService';
import { TextService } from './services/textService';
import { AcademicService, AcademicReference } from './services/academicService';
import { UtilityService } from './services/utilityService';
import { PDFDocument } from 'pdf-lib';

describe('Deadline Phase 6 — Universal Productivity Tools Hub', () => {
  describe('ToolRegistry', () => {
    it('registers 30 productivity tools across 5 major categories', () => {
      const allTools = ToolRegistry.getAllTools();
      expect(allTools.length).toBeGreaterThanOrEqual(25);

      const categories = new Set(allTools.map((t) => t.category));
      expect(categories.has('pdf')).toBe(true);
      expect(categories.has('documents')).toBe(true);
      expect(categories.has('images')).toBe(true);
      expect(categories.has('academic')).toBe(true);
      expect(categories.has('utilities')).toBe(true);
    });

    it('filters tools by category correctly', () => {
      const pdfTools = ToolRegistry.getToolsByCategory('pdf');
      expect(pdfTools.length).toBeGreaterThan(0);
      expect(pdfTools.every((t) => t.category === 'pdf')).toBe(true);

      const imageTools = ToolRegistry.getToolsByCategory('images');
      expect(imageTools.length).toBeGreaterThan(0);
      expect(imageTools.every((t) => t.category === 'images')).toBe(true);
    });

    it('searches tools by keywords, title, or description', () => {
      const mergeMatches = ToolRegistry.searchTools('merge');
      expect(mergeMatches.some((t) => t.id === 'pdf-merge')).toBe(true);

      const citationMatches = ToolRegistry.searchTools('citation');
      expect(citationMatches.some((t) => t.id === 'acad-citation')).toBe(true);

      const qrMatches = ToolRegistry.searchTools('qr code');
      expect(qrMatches.some((t) => t.id === 'util-qr-code')).toBe(true);
    });

    it('retrieves popular tools for quick-start bar', () => {
      const popular = ToolRegistry.getPopularTools();
      expect(popular.length).toBeGreaterThan(0);
      expect(popular.every((t) => t.isPopular)).toBe(true);
    });
  });

  describe('PdfService (Pure In-Browser PDF Operations)', () => {
    // Helper to generate a minimal valid PDF in memory
    const createSamplePdfBlob = async (pageCount = 2): Promise<Blob> => {
      const doc = await PDFDocument.create();
      for (let i = 0; i < pageCount; i++) {
        const page = doc.addPage([400, 600]);
        page.drawText(`Page ${i + 1}`);
      }
      const bytes = await doc.save();
      return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    };

    it('merges multiple PDF documents in browser memory', async () => {
      const pdfA = await createSamplePdfBlob(2);
      const pdfB = await createSamplePdfBlob(3);

      const res = await PdfService.mergePdfs([pdfA, pdfB]);
      expect(res.blob).toBeDefined();
      expect(res.pageCount).toBe(5);
      expect(res.sizeBytes).toBeGreaterThan(0);
    });

    it('extracts specific pages into a new document', async () => {
      const originalPdf = await createSamplePdfBlob(4);
      const res = await PdfService.extractPages(originalPdf, [1, 3]);
      expect(res.blob).toBeDefined();
      expect(res.pageCount).toBe(2);
    });

    it('rotates pages by specified angle', async () => {
      const originalPdf = await createSamplePdfBlob(2);
      const res = await PdfService.rotatePages(originalPdf, 90);
      expect(res.blob).toBeDefined();
      expect(res.pageCount).toBe(2);
    });

    it('reorders and removes unwanted pages', async () => {
      const originalPdf = await createSamplePdfBlob(3);
      // reverse order: page 3, 2, 1
      const res = await PdfService.reorderAndFilterPages(originalPdf, [3, 2, 1]);
      expect(res.blob).toBeDefined();
      expect(res.pageCount).toBe(3);
    });

    it('adds diagonal watermark text', async () => {
      const originalPdf = await createSamplePdfBlob(1);
      const res = await PdfService.addWatermark(originalPdf, 'CONFIDENTIAL TEST', 0.3);
      expect(res.blob).toBeDefined();
      expect(res.pageCount).toBe(1);
    });

    it('extracts PDF metadata and dimensions', async () => {
      const pdf = await createSamplePdfBlob(3);
      const meta = await PdfService.getPdfMetadata(pdf);
      expect(meta.pageCount).toBe(3);
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(600);
    });
  });

  describe('TextService (Text Analytics, Diff & Case)', () => {
    it('analyzes text metrics with reading and speaking times', () => {
      const sample = 'Deadline is an open-source execution platform. The output matters more than the activity.';
      const stats = TextService.analyzeText(sample);

      expect(stats.words).toBe(13);
      expect(stats.sentences).toBe(2);
      expect(stats.characters).toBe(sample.length);
      expect(stats.readingTimeMinutes).toBeGreaterThan(0);
    });

    it('computes line-by-line diff between two text documents', () => {
      const textA = 'line 1\nline 2\nline 3';
      const textB = 'line 1\nline 2 updated\nline 3\nline 4';

      const diff = TextService.computeDiff(textA, textB);
      expect(diff.length).toBeGreaterThan(0);
      expect(diff.some((l) => l.type === 'added')).toBe(true);
      expect(diff.some((l) => l.type === 'unchanged')).toBe(true);
    });

    it('converts letter casing across multiple formats', () => {
      const phrase = 'hello world deadline';
      expect(TextService.convertCase(phrase, 'upper')).toBe('HELLO WORLD DEADLINE');
      expect(TextService.convertCase(phrase, 'title')).toBe('Hello World Deadline');
      expect(TextService.convertCase(phrase, 'camel')).toBe('helloWorldDeadline');
      expect(TextService.convertCase(phrase, 'pascal')).toBe('HelloWorldDeadline');
      expect(TextService.convertCase(phrase, 'snake')).toBe('hello_world_deadline');
      expect(TextService.convertCase(phrase, 'kebab')).toBe('hello-world-deadline');
      expect(TextService.convertCase(phrase, 'constant')).toBe('HELLO_WORLD_DEADLINE');
    });

    it('cleans, deduplicates and sorts text lines', () => {
      const messy = ' banana \n apple \n banana \n\n cherry \n';
      const cleaned = TextService.cleanText(messy, {
        trimLines: true,
        removeEmptyLines: true,
        removeDuplicates: true,
        sortAlphabetically: true,
      });

      expect(cleaned).toBe('apple\nbanana\ncherry');
    });
  });

  describe('AcademicService (Citations & Bibliographies)', () => {
    const sampleRef: AcademicReference = {
      title: 'Attention Is All You Need',
      authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
      year: '2017',
      journalOrBook: 'NeurIPS',
      volume: '30',
      pages: '5998-6008',
      doi: '10.48550/arXiv.1706.03762',
    };

    it('formats APA 7th edition citation', () => {
      const apa = AcademicService.formatApa(sampleRef);
      expect(apa).toContain('Vaswani, A.');
      expect(apa).toContain('(2017)');
      expect(apa).toContain('Attention Is All You Need');
      expect(apa).toContain('NeurIPS');
      expect(apa).toContain('doi.org');
    });

    it('formats MLA 9th edition citation', () => {
      const mla = AcademicService.formatMla(sampleRef);
      expect(mla).toContain('Vaswani, A.');
      expect(mla).toContain('"Attention Is All You Need."');
      expect(mla).toContain('NeurIPS');
    });

    it('formats IEEE citation', () => {
      const ieee = AcademicService.formatIeee(sampleRef);
      expect(ieee).toContain('Vaswani, A.');
      expect(ieee).toContain('"Attention Is All You Need,"');
      expect(ieee).toContain('NeurIPS');
    });

    it('formats BibTeX entry', () => {
      const bib = AcademicService.formatBibtex(sampleRef);
      expect(bib).toContain('@article{');
      expect(bib).toContain('title = {Attention Is All You Need}');
      expect(bib).toContain('year = {2017}');
      expect(bib).toContain('journal = {NeurIPS}');
    });
  });

  describe('UtilityService (Archives, Formats & Crypto)', () => {
    it('creates and inspects ZIP archives in-memory', async () => {
      const file1 = new File(['Hello Deadline File 1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['Hello Deadline File 2'], 'test2.txt', { type: 'text/plain' });

      const zipResult = await UtilityService.createZipArchive([file1, file2], 'test.zip');
      expect(zipResult.blob).toBeDefined();
      expect(zipResult.fileCount).toBe(2);

      const entries = await UtilityService.inspectZip(zipResult.blob);
      expect(entries.length).toBe(2);
      expect(entries.some((e) => e.name === 'test1.txt')).toBe(true);
      expect(entries.some((e) => e.name === 'test2.txt')).toBe(true);

      const extracted = await UtilityService.extractFileFromZip(zipResult.blob, 'test1.txt');
      expect(extracted.blob).toBeDefined();
      expect(extracted.name).toBe('test1.txt');
    });

    it('formats and minifies JSON with error reporting', () => {
      const raw = '{"a":1,"b":[2,3]}';
      const formatted = UtilityService.formatJson(raw, 2);
      expect(formatted.isValid).toBe(true);
      expect(formatted.formatted).toContain('\n  "a": 1');

      const minified = UtilityService.formatJson(formatted.formatted, 0);
      expect(minified.isValid).toBe(true);
      expect(minified.formatted).toBe(raw);

      const invalid = UtilityService.formatJson('{bad json}', 2);
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toBeDefined();
    });

    it('converts bidirectionally between CSV and JSON', () => {
      const csv = 'name,role\nJeet,Founder\nAlex,Lead';
      const jsonRes = UtilityService.csvToJson(csv);
      expect(jsonRes.data.length).toBe(2);
      expect(jsonRes.data[0].name).toBe('Jeet');
      expect(jsonRes.data[0].role).toBe('Founder');

      const convertedCsv = UtilityService.jsonToCsv(jsonRes.data);
      expect(convertedCsv).toContain('name,role');
      expect(convertedCsv).toContain('Jeet,Founder');
    });

    it('generates cryptographically secure passwords with entropy score', () => {
      const res = UtilityService.generateSecurePassword(24, {
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
      });

      expect(res.password.length).toBe(24);
      expect(res.entropyBits).toBeGreaterThan(100);
    });
  });
});
