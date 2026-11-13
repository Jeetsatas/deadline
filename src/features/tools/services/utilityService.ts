import JSZip from 'jszip';
import QRCode from 'qrcode';

export interface ZipEntryInfo {
  name: string;
  sizeBytes: number;
  isDirectory: boolean;
  date: Date;
}

export class UtilityService {
  /**
   * Creates a ZIP archive from multiple files in browser memory.
   */
  static async createZipArchive(
    files: File[],
    archiveName = 'archive.zip'
  ): Promise<{ blob: Blob; filename: string; sizeBytes: number; fileCount: number }> {
    const zip = new JSZip();

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      zip.file(file.name, buffer);
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const safeName = archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`;

    return {
      blob,
      filename: safeName,
      sizeBytes: blob.size,
      fileCount: files.length,
    };
  }

  /**
   * Inspects and lists entries inside a ZIP archive.
   */
  static async inspectZip(file: File | Blob): Promise<ZipEntryInfo[]> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const entries: ZipEntryInfo[] = [];

    contents.forEach((relativePath, zipEntry) => {
      entries.push({
        name: relativePath,
        sizeBytes: (zipEntry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0,
        isDirectory: zipEntry.dir,
        date: zipEntry.date,
      });
    });

    return entries;
  }

  /**
   * Extracts a specific file from a ZIP archive.
   */
  static async extractFileFromZip(
    zipFile: File | Blob,
    filePath: string
  ): Promise<{ blob: Blob; name: string }> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    const target = contents.file(filePath);

    if (!target) {
      throw new Error(`File "${filePath}" not found in ZIP archive.`);
    }

    const blob = await target.async('blob');
    const name = filePath.split('/').pop() || 'extracted_file';
    return { blob, name };
  }

  /**
   * Generates a QR Code as Data URL and Blob.
   */
  static async generateQrCode(
    content: string,
    options: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      margin?: number;
      scale?: number;
      color?: { dark?: string; light?: string };
    } = {}
  ): Promise<{ dataUrl: string; blob: Blob }> {
    if (!content) {
      throw new Error('Content is required for QR code generation.');
    }

    const dataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      margin: options.margin || 2,
      scale: options.scale || 8,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#ffffff',
      },
    });

    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });

    return { dataUrl, blob };
  }

  /**
   * Formats or minifies JSON with error reporting.
   */
  static formatJson(
    rawJson: string,
    indent = 2
  ): { formatted: string; isValid: boolean; error?: string } {
    try {
      const parsed = JSON.parse(rawJson);
      const formatted = indent === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
      return { formatted, isValid: true };
    } catch (e) {
      return { formatted: rawJson, isValid: false, error: (e as Error).message };
    }
  }

  /**
   * Converts CSV string to JSON array.
   */
  static csvToJson(csv: string): { data: Record<string, string>[]; jsonString: string } {
    const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { data: [], jsonString: '[]' };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          insideQuotes = !insideQuotes;
        } else if (c === ',' && !insideQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result.map((r) => r.replace(/^"+|"+$/g, ''));
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);

    const data: Record<string, string>[] = rows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] || '';
      });
      return obj;
    });

    return {
      data,
      jsonString: JSON.stringify(data, null, 2),
    };
  }

  /**
   * Converts JSON array to CSV string.
   */
  static jsonToCsv(jsonInput: string | Record<string, unknown>[]): string {
    const arr = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
    if (!Array.isArray(arr) || arr.length === 0) return '';

    const headers = Array.from(
      new Set(arr.flatMap((item) => (typeof item === 'object' && item ? Object.keys(item) : [])))
    );

    const escapeValue = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeValue).join(',');
    const rowLines = arr.map((item) => {
      return headers.map((h) => escapeValue(item[h])).join(',');
    });

    return [headerLine, ...rowLines].join('\n');
  }

  /**
   * Generates a cryptographically strong password or secret token.
   */
  static generateSecurePassword(
    lengthOrOptions:
      | number
      | {
          length?: number;
          includeUppercase?: boolean;
          includeLowercase?: boolean;
          includeNumbers?: boolean;
          includeSymbols?: boolean;
          avoidAmbiguous?: boolean;
        } = 16,
    maybeOptions: {
      length?: number;
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSymbols?: boolean;
      avoidAmbiguous?: boolean;
    } = {}
  ): { password: string; entropyBits: number } {
    let length = 16;
    let opts: {
      length?: number;
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSymbols?: boolean;
      avoidAmbiguous?: boolean;
    } = maybeOptions;

    if (typeof lengthOrOptions === 'number') {
      length = lengthOrOptions;
    } else if (typeof lengthOrOptions === 'object') {
      opts = lengthOrOptions;
      length = opts.length || 16;
    }

    length = Math.max(6, Math.min(128, length));
    let charset = '';

    const lower = opts.avoidAmbiguous ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    const upper = opts.avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = opts.avoidAmbiguous ? '23456789' : '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (opts.includeLowercase !== false) charset += lower;
    if (opts.includeUppercase !== false) charset += upper;
    if (opts.includeNumbers !== false) charset += nums;
    if (opts.includeSymbols) charset += symbols;

    if (!charset) charset = lower + nums;

    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }

    const entropyBits = Math.round(length * Math.log2(charset.length));
    return { password, entropyBits };
  }
}
