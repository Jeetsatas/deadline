export interface TextStatistics {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumberOriginal?: number;
  lineNumberModified?: number;
}

export class TextService {
  /**
   * Computes comprehensive text metrics.
   */
  static analyzeText(text: string): TextStatistics {
    if (!text) {
      return {
        characters: 0,
        charactersNoSpaces: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        readingTimeMinutes: 0,
        speakingTimeMinutes: 0,
      };
    }

    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s+/g, '').length;

    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;

    // Sentence splitting by . ! ?
    const sentences = trimmed
      ? (trimmed.match(/[.!?]+(?:\s+|$)/g) || []).length || 1
      : 0;

    // Paragraph splitting by newline blocks
    const paragraphs = trimmed
      ? trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
      : 0;

    // Standard reading speed ~200 WPM, speaking ~130 WPM
    const readingTimeMinutes = +(words / 200).toFixed(1);
    const speakingTimeMinutes = +(words / 130).toFixed(1);

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      readingTimeMinutes,
      speakingTimeMinutes,
    };
  }

  /**
   * Computes a line-by-line difference between two text blocks.
   */
  static computeDiff(original: string, modified: string): DiffLine[] {
    const origLines = original.split(/\r?\n/);
    const modLines = modified.split(/\r?\n/);

    const result: DiffLine[] = [];
    let i = 0;
    let j = 0;

    while (i < origLines.length || j < modLines.length) {
      if (i < origLines.length && j < modLines.length && origLines[i] === modLines[j]) {
        result.push({
          type: 'unchanged',
          text: origLines[i],
          lineNumberOriginal: i + 1,
          lineNumberModified: j + 1,
        });
        i++;
        j++;
      } else if (
        i < origLines.length &&
        (!modLines.includes(origLines[i]) || origLines.indexOf(modLines[j]) === -1)
      ) {
        result.push({
          type: 'removed',
          text: origLines[i],
          lineNumberOriginal: i + 1,
        });
        i++;
      } else if (j < modLines.length) {
        result.push({
          type: 'added',
          text: modLines[j],
          lineNumberModified: j + 1,
        });
        j++;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Converts text between various casing conventions.
   */
  static convertCase(
    text: string,
    targetCase:
      | 'upper'
      | 'lower'
      | 'title'
      | 'sentence'
      | 'camel'
      | 'kebab'
      | 'snake'
      | 'pascal'
      | 'constant'
  ): string {
    if (!text) return '';

    switch (targetCase) {
      case 'upper':
        return text.toUpperCase();

      case 'lower':
        return text.toLowerCase();

      case 'title':
        return text.replace(
          /\b\w+/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
        );

      case 'sentence':
        return text.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());

      case 'camel': {
        const words = text.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) || [];
        return words
          .map((w, idx) => (idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
          .join('');
      }

      case 'pascal': {
        const words = text.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) || [];
        return words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
      }

      case 'kebab': {
        const words = text.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) || [];
        return words.map((w) => w.toLowerCase()).join('-');
      }

      case 'snake': {
        const words = text.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) || [];
        return words.map((w) => w.toLowerCase()).join('_');
      }

      case 'constant': {
        const words = text.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) || [];
        return words.map((w) => w.toUpperCase()).join('_');
      }

      default:
        return text;
    }
  }

  /**
   * Cleans text (deduplicate lines, remove empty lines, trim lines, sort lines).
   */
  static cleanText(
    text: string,
    options: {
      removeDuplicates?: boolean;
      removeEmptyLines?: boolean;
      trimLines?: boolean;
      sortAlphabetically?: boolean;
      reverseLines?: boolean;
    }
  ): string {
    let lines = text.split(/\r?\n/);

    if (options.trimLines) {
      lines = lines.map((l) => l.trim());
    }

    if (options.removeEmptyLines) {
      lines = lines.filter((l) => l.length > 0);
    }

    if (options.removeDuplicates) {
      lines = Array.from(new Set(lines));
    }

    if (options.sortAlphabetically) {
      lines.sort((a, b) => a.localeCompare(b));
    }

    if (options.reverseLines) {
      lines.reverse();
    }

    return lines.join('\n');
  }
}
