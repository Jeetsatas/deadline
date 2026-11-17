import React, { useState } from 'react';
import { ToolDefinition } from '../../types/ToolTypes';
import { AcademicService, AcademicReference } from '../../services/academicService';
import { ToolWorkspaceShell } from '../ToolWorkspaceShell';
import { Button } from '@/components/ui/Button';
import {
  GraduationCap,
  BookOpen,
  Search,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface AcademicToolsWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
}

export const AcademicToolsWorkspace: React.FC<AcademicToolsWorkspaceProps> = ({ tool, onBack }) => {
  const [ref, setRef] = useState<AcademicReference>({
    title: 'Attention Is All You Need',
    authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'Uszkoreit, J.', 'Jones, L.'],
    year: '2017',
    journalOrBook: 'Advances in Neural Information Processing Systems',
    volume: '30',
    pages: '5998-6008',
    doi: '10.48550/arXiv.1706.03762',
    url: 'https://arxiv.org/abs/1706.03762',
  });

  const [doiInput, setDoiInput] = useState('10.1038/s41586-020-2649-2');
  const [isLoadingDoi, setIsLoadingDoi] = useState(false);
  const [doiError, setDoiError] = useState<string | null>(null);

  const [copiedStyle, setCopiedStyle] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState('citations.txt');

  const handleCopy = (text: string, style: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStyle(style);
    setTimeout(() => setCopiedStyle(null), 2000);
  };

  const handleLookupDoi = async () => {
    if (!doiInput.trim()) return;
    setIsLoadingDoi(true);
    setDoiError(null);

    try {
      const fetched = await AcademicService.lookupDoi(doiInput.trim());
      setRef(fetched);
      const bib = AcademicService.formatBibtex(fetched);
      setOutputBlob(new Blob([bib], { type: 'text/plain;charset=utf-8' }));
      setOutputFilename(`${fetched.title.slice(0, 20).replace(/\s+/g, '_')}.bib`);
    } catch (err) {
      setDoiError((err as Error).message || 'Failed to fetch DOI metadata from Crossref.');
    } finally {
      setIsLoadingDoi(false);
    }
  };

  const apaCitation = AcademicService.formatApa(ref);
  const mlaCitation = AcademicService.formatMla(ref);
  const ieeeCitation = AcademicService.formatIeee(ref);
  const bibtexCitation = AcademicService.formatBibtex(ref);

  const handleExportAll = () => {
    const fullText = `ACADEMIC CITATIONS\n\nTitle: ${ref.title}\nAuthors: ${ref.authors.join(', ')}\nYear: ${ref.year || 'N/A'}\n\n--- APA (7th Edition) ---\n${apaCitation}\n\n--- MLA (9th Edition) ---\n${mlaCitation}\n\n--- IEEE ---\n${ieeeCitation}\n\n--- BibTeX ---\n${bibtexCitation}\n`;
    setOutputBlob(new Blob([fullText], { type: 'text/plain;charset=utf-8' }));
    setOutputFilename(`${ref.title.slice(0, 24).replace(/\s+/g, '_')}_citations.txt`);
  };

  return (
    <ToolWorkspaceShell
      tool={tool}
      onBack={onBack}
      outputBlob={outputBlob}
      outputFilename={outputFilename}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields & DOI lookup */}
        <div className="lg:col-span-6 space-y-6">
          {/* DOI Quick Lookup */}
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Fetch by DOI (Crossref API)
            </h3>
            <p className="text-xs text-muted-foreground">
              DOI lookup sends the DOI to the external Crossref API to retrieve publication metadata:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={doiInput}
                onChange={(e) => setDoiInput(e.target.value)}
                placeholder="e.g. 10.1038/s41586-020-2649-2"
                className="flex-1 px-3 py-2 text-xs font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                onClick={handleLookupDoi}
                disabled={isLoadingDoi || !doiInput.trim()}
                className="shrink-0 flex items-center gap-1.5"
              >
                {isLoadingDoi ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3.5 w-3.5" />
                    Lookup
                  </>
                )}
              </Button>
            </div>
            {doiError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{doiError}</span>
              </div>
            )}
          </div>

          {/* Reference Metadata Fields */}
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Publication Metadata
            </h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
              <input
                type="text"
                value={ref.title}
                onChange={(e) => setRef({ ...ref, title: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Authors (comma separated)
              </label>
              <input
                type="text"
                value={ref.authors.join(', ')}
                onChange={(e) =>
                  setRef({
                    ...ref,
                    authors: e.target.value.split(',').map((a) => a.trim()).filter(Boolean),
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Year</label>
                <input
                  type="text"
                  value={ref.year || ''}
                  onChange={(e) => setRef({ ...ref, year: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Volume</label>
                <input
                  type="text"
                  value={ref.volume || ''}
                  onChange={(e) => setRef({ ...ref, volume: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Issue</label>
                <input
                  type="text"
                  value={ref.issue || ''}
                  onChange={(e) => setRef({ ...ref, issue: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Journal / Book / Conference</label>
                <input
                  type="text"
                  value={ref.journalOrBook || ''}
                  onChange={(e) => setRef({ ...ref, journalOrBook: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Pages</label>
                <input
                  type="text"
                  value={ref.pages || ''}
                  onChange={(e) => setRef({ ...ref, pages: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">DOI / URL</label>
              <input
                type="text"
                value={ref.doi || ref.url || ''}
                onChange={(e) => setRef({ ...ref, doi: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-background border border-border rounded-lg"
              />
            </div>

            <Button onClick={handleExportAll} className="w-full mt-2">
              Prepare All Citations for Export
            </Button>
          </div>
        </div>

        {/* Right Column: Formatted Output Formats */}
        <div className="lg:col-span-6 space-y-4">
          {/* APA */}
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">APA 7th Edition</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(apaCitation, 'apa')}
                className="text-xs h-7"
              >
                {copiedStyle === 'apa' ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedStyle === 'apa' ? 'Copied' : 'Copy APA'}
              </Button>
            </div>
            <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border leading-relaxed font-sans">
              {apaCitation}
            </p>
          </div>

          {/* MLA */}
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">MLA 9th Edition</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(mlaCitation, 'mla')}
                className="text-xs h-7"
              >
                {copiedStyle === 'mla' ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedStyle === 'mla' ? 'Copied' : 'Copy MLA'}
              </Button>
            </div>
            <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border leading-relaxed font-sans">
              {mlaCitation}
            </p>
          </div>

          {/* IEEE */}
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">IEEE</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(ieeeCitation, 'ieee')}
                className="text-xs h-7"
              >
                {copiedStyle === 'ieee' ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedStyle === 'ieee' ? 'Copied' : 'Copy IEEE'}
              </Button>
            </div>
            <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border leading-relaxed font-mono">
              {ieeeCitation}
            </p>
          </div>

          {/* BibTeX */}
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">BibTeX Entry</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(bibtexCitation, 'bibtex')}
                className="text-xs h-7"
              >
                {copiedStyle === 'bibtex' ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedStyle === 'bibtex' ? 'Copied' : 'Copy BibTeX'}
              </Button>
            </div>
            <pre className="text-xs text-foreground bg-background p-3 rounded-lg border border-border leading-relaxed font-mono overflow-x-auto whitespace-pre">
              {bibtexCitation}
            </pre>
          </div>
        </div>
      </div>
    </ToolWorkspaceShell>
  );
};
