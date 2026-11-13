export interface AcademicReference {
  title: string;
  authors: string[];
  year?: string;
  journalOrBook?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
}

export class AcademicService {
  /**
   * Generates APA 7th edition citation string.
   */
  static formatApa(ref: AcademicReference): string {
    const authorsStr = ref.authors.length > 0 ? ref.authors.join(', ') : 'Anonymous';
    const yearStr = ref.year ? `(${ref.year})` : '(n.d.)';
    const titleStr = ref.title ? `${ref.title}.` : '';
    const journalStr = ref.journalOrBook ? `${ref.journalOrBook}` : '';
    const volIssue = [ref.volume ? `${ref.volume}` : '', ref.issue ? `(${ref.issue})` : ''].join('');
    const pagesStr = ref.pages ? `, ${ref.pages}.` : '.';
    const doiStr = ref.doi ? ` https://doi.org/${ref.doi.replace(/^https?:\/\/doi\.org\//, '')}` : ref.url ? ` ${ref.url}` : '';

    return `${authorsStr} ${yearStr}. ${titleStr} ${journalStr}${volIssue ? `, ${volIssue}` : ''}${pagesStr}${doiStr}`.trim();
  }

  /**
   * Generates MLA 9th edition citation string.
   */
  static formatMla(ref: AcademicReference): string {
    const authorsStr = ref.authors.length > 0 ? `${ref.authors[0]}, et al.` : 'Anonymous.';
    const titleStr = ref.title ? `"${ref.title}."` : '';
    const containerStr = ref.journalOrBook ? `${ref.journalOrBook}, ` : '';
    const volStr = ref.volume ? `vol. ${ref.volume}, ` : '';
    const noStr = ref.issue ? `no. ${ref.issue}, ` : '';
    const yearStr = ref.year ? `${ref.year}, ` : '';
    const pagesStr = ref.pages ? `pp. ${ref.pages}.` : '';
    const doiStr = ref.doi ? ` https://doi.org/${ref.doi.replace(/^https?:\/\/doi\.org\//, '')}` : '';

    return `${authorsStr} ${titleStr} ${containerStr}${volStr}${noStr}${yearStr}${pagesStr}${doiStr}`.trim();
  }

  /**
   * Generates IEEE citation string.
   */
  static formatIeee(ref: AcademicReference): string {
    const authorsStr = ref.authors.length > 0 ? ref.authors.join(' and ') : 'Anonymous';
    const titleStr = ref.title ? `"${ref.title},"` : '';
    const journalStr = ref.journalOrBook ? `${ref.journalOrBook}, ` : '';
    const volStr = ref.volume ? `vol. ${ref.volume}, ` : '';
    const noStr = ref.issue ? `no. ${ref.issue}, ` : '';
    const pagesStr = ref.pages ? `pp. ${ref.pages}, ` : '';
    const yearStr = ref.year ? `${ref.year}.` : '';
    const doiStr = ref.doi ? ` doi: ${ref.doi.replace(/^https?:\/\/doi\.org\//, '')}.` : '';

    return `${authorsStr}, ${titleStr} ${journalStr}${volStr}${noStr}${pagesStr}${yearStr}${doiStr}`.trim();
  }

  /**
   * Generates BibTeX citation block.
   */
  static formatBibtex(ref: AcademicReference): string {
    const firstAuthor = (ref.authors[0] || 'ref').split(/\s+/).pop()?.toLowerCase() || 'ref';
    const cleanYear = ref.year || '2026';
    const key = `${firstAuthor}${cleanYear}`;

    return `@article{${key},
  title = {${ref.title || 'Untitled'}},
  author = {${ref.authors.join(' and ')}},
  journal = {${ref.journalOrBook || 'Journal'}},
  year = {${cleanYear}}${ref.volume ? `,\n  volume = {${ref.volume}}` : ''}${ref.issue ? `,\n  number = {${ref.issue}}` : ''}${ref.pages ? `,\n  pages = {${ref.pages}}` : ''}${ref.doi ? `,\n  doi = {${ref.doi}}` : ''}
}`;
  }

  /**
   * Looks up DOI metadata from Crossref public open API.
   */
  static async lookupDoi(doi: string): Promise<AcademicReference> {
    const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//, '');
    if (!cleanDoi) {
      throw new Error('Please enter a valid DOI identifier (e.g. 10.1038/s41586-020-2649-2).');
    }

    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`DOI lookup failed (HTTP ${res.status}). Verify the DOI exists.`);
    }

    const data = await res.json();
    const message = data.message;

    const authors = (message.author || []).map(
      (a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(' ')
    );

    const title = Array.isArray(message.title) ? message.title[0] : message.title || '';
    const container = Array.isArray(message['container-title'])
      ? message['container-title'][0]
      : message['container-title'] || '';

    const year = message.created?.['date-parts']?.[0]?.[0]?.toString() || '';

    return {
      title,
      authors: authors.length > 0 ? authors : ['Unknown Author'],
      journalOrBook: container,
      year,
      volume: message.volume,
      issue: message.issue,
      pages: message.page,
      doi: cleanDoi,
      url: message.URL,
      publisher: message.publisher,
    };
  }
}
