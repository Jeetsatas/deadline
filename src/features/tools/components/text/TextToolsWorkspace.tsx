import React, { useState, useMemo } from 'react';
import { ToolDefinition } from '../../types/ToolTypes';
import { TextService, TextStatistics, DiffLine } from '../../services/textService';
import { ToolWorkspaceShell } from '../ToolWorkspaceShell';
import { Button } from '@/components/ui/Button';
import {
  Type,
  FileCode,
  GitCompare,
  CaseSensitive,
  AlignLeft,
  Copy,
  Check,
  Download,
  Clock,
  Mic,
  AlignJustify,
} from 'lucide-react';

interface TextToolsWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
}

export const TextToolsWorkspace: React.FC<TextToolsWorkspaceProps> = ({ tool, onBack }) => {
  // Common Text States
  const [inputText, setInputText] = useState(
    tool.id === 'doc-markdown-editor'
      ? `# Project Deliverable Report\n\n## Overview\nThis is a live **markdown** preview document.\n\n### Key Deliverables\n- Executive Summary\n- Implementation Architecture\n- Verification Test Run\n\n> "The output matters more than the activity."\n\n\`\`\`typescript\nconst status = "delivered";\n\`\`\`\n`
      : ''
  );
  const [copied, setCopied] = useState(false);

  // Diff states
  const [diffOriginal, setDiffOriginal] = useState('// Original Implementation\nconst port = 3000;\nconst host = "localhost";\nstartServer(port, host);');
  const [diffModified, setDiffModified] = useState('// Updated Implementation\nconst port = 8080;\nconst host = "0.0.0.0";\nconst ssl = true;\nstartSecureServer(port, host, ssl);');
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  // Cleaner options
  const [cleanTrim, setCleanTrim] = useState(true);
  const [cleanRemoveEmpty, setCleanRemoveEmpty] = useState(true);
  const [cleanDedupe, setCleanDedupe] = useState(true);
  const [cleanSort, setCleanSort] = useState(false);
  const [cleanReverse, setCleanReverse] = useState(false);

  // Output blob
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState('document.txt');

  // Text analysis memoized
  const stats: TextStatistics = useMemo(() => {
    return TextService.analyzeText(inputText);
  }, [inputText]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    setOutputBlob(blob);
    setOutputFilename(filename);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCaseConvert = (
    c: 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'kebab' | 'snake' | 'constant'
  ) => {
    const converted = TextService.convertCase(inputText, c);
    setInputText(converted);
    const blob = new Blob([converted], { type: 'text/plain;charset=utf-8' });
    setOutputBlob(blob);
    setOutputFilename(`converted_${c}.txt`);
  };

  const handleCleanExecute = () => {
    const cleaned = TextService.cleanText(inputText, {
      trimLines: cleanTrim,
      removeEmptyLines: cleanRemoveEmpty,
      removeDuplicates: cleanDedupe,
      sortAlphabetically: cleanSort,
      reverseLines: cleanReverse,
    });
    setInputText(cleaned);
    const blob = new Blob([cleaned], { type: 'text/plain;charset=utf-8' });
    setOutputBlob(blob);
    setOutputFilename('cleaned_text.txt');
  };

  const handleComputeDiff = () => {
    const result = TextService.computeDiff(diffOriginal, diffModified);
    setDiffLines(result);
    const diffReport = result
      .map((l) => `${l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  '}${l.text}`)
      .join('\n');
    setOutputBlob(new Blob([diffReport], { type: 'text/plain;charset=utf-8' }));
    setOutputFilename('diff_comparison.patch');
  };

  // Simple Markdown Parser for Preview
  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold text-foreground mt-4 mb-2 pb-1 border-b border-border">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-semibold text-foreground mt-3 mb-1">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-medium text-foreground mt-2 mb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-2">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-foreground text-sm my-0.5">
            {line.replace('- ', '')}
          </li>
        );
      }
      if (line.startsWith('```')) {
        return <div key={idx} className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded mt-2">{line}</div>;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-sm text-foreground my-1">{line}</p>;
    });
  };

  return (
    <ToolWorkspaceShell
      tool={tool}
      onBack={onBack}
      outputBlob={outputBlob}
      outputFilename={outputFilename}
    >
      {/* 1. Word & Character Counter Tool */}
      {tool.id === 'doc-word-counter' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-card/60 border border-border rounded-xl">
              <span className="text-[11px] text-muted-foreground block">Words</span>
              <span className="text-2xl font-bold text-foreground">{stats.words}</span>
            </div>
            <div className="p-3.5 bg-card/60 border border-border rounded-xl">
              <span className="text-[11px] text-muted-foreground block">Characters</span>
              <span className="text-2xl font-bold text-foreground">{stats.characters}</span>
            </div>
            <div className="p-3.5 bg-card/60 border border-border rounded-xl">
              <span className="text-[11px] text-muted-foreground block">No Spaces</span>
              <span className="text-2xl font-bold text-foreground">{stats.charactersNoSpaces}</span>
            </div>
            <div className="p-3.5 bg-card/60 border border-border rounded-xl">
              <span className="text-[11px] text-muted-foreground block">Sentences</span>
              <span className="text-2xl font-bold text-foreground">{stats.sentences}</span>
            </div>
            <div className="p-3.5 bg-card/60 border border-border rounded-xl">
              <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                <Clock className="h-3 w-3" /> Read Time
              </span>
              <span className="text-2xl font-bold text-foreground">{stats.readingTimeMinutes} min</span>
            </div>
            <div className="p-3.5 bg-card/60 border border-border rounded-xl">
              <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                <Mic className="h-3 w-3" /> Speak Time
              </span>
              <span className="text-2xl font-bold text-foreground">{stats.speakingTimeMinutes} min</span>
            </div>
          </div>

          {/* Text Area */}
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Type or paste your text below for live analysis
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(inputText)}
                  disabled={!inputText}
                  className="text-xs h-7"
                >
                  {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputText('')}
                  disabled={!inputText}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setOutputBlob(new Blob([e.target.value], { type: 'text/plain;charset=utf-8' }));
                setOutputFilename('analyzed_text.txt');
              }}
              placeholder="Paste article, assignment, manuscript, or memo here..."
              rows={14}
              className="w-full p-4 text-sm bg-background border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* 2. Markdown Editor & Live Preview */}
      {tool.id === 'doc-markdown-editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-3 flex flex-col h-[560px]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <FileCode className="h-4 w-4 text-primary" /> Markdown Source
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadText(inputText, 'document.md')}
                className="text-xs h-7"
              >
                <Download className="h-3 w-3 mr-1" /> Save .md
              </Button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setOutputBlob(new Blob([e.target.value], { type: 'text/markdown;charset=utf-8' }));
                setOutputFilename('document.md');
              }}
              rows={20}
              className="flex-1 w-full p-3 text-sm bg-background border border-border rounded-lg font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
            />
          </div>

          <div className="border border-border rounded-xl p-4 bg-card/60 flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <span className="text-xs font-semibold text-muted-foreground">Synchronized Live Preview</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(inputText)}
                className="text-xs h-7"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy Markdown
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 bg-background rounded-lg border border-border space-y-2">
              {renderMarkdown(inputText)}
            </div>
          </div>
        </div>
      )}

      {/* 3. Text Diff Comparison */}
      {tool.id === 'doc-text-diff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Original Text</label>
              <textarea
                value={diffOriginal}
                onChange={(e) => setDiffOriginal(e.target.value)}
                rows={10}
                className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Modified Text</label>
              <textarea
                value={diffModified}
                onChange={(e) => setDiffModified(e.target.value)}
                rows={10}
                className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <Button onClick={handleComputeDiff} className="w-full flex items-center justify-center gap-2">
            <GitCompare className="h-4 w-4" /> Compare &amp; Highlight Differences
          </Button>

          {diffLines.length > 0 && (
            <div className="border border-border rounded-xl p-4 bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold">Diff Report</h4>
                <div className="flex gap-3 text-xs font-mono">
                  <span className="text-emerald-500">
                    +{diffLines.filter((l) => l.type === 'added').length} additions
                  </span>
                  <span className="text-red-500">
                    -{diffLines.filter((l) => l.type === 'removed').length} deletions
                  </span>
                </div>
              </div>
              <div className="bg-background rounded-lg border border-border overflow-hidden font-mono text-xs">
                {diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-1 flex items-start gap-3 border-b border-border/40 last:border-b-0 ${
                      line.type === 'added'
                        ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                        : line.type === 'removed'
                        ? 'bg-red-500/10 text-red-400 line-through'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="w-6 shrink-0 opacity-50 select-none">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Text Case Converter */}
      {tool.id === 'doc-case-converter' && (
        <div className="space-y-6">
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <CaseSensitive className="h-4 w-4 text-primary" /> Enter Text to Convert
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(inputText)}
                disabled={!inputText}
                className="text-xs h-7"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter or paste text here to convert casing..."
              rows={8}
              className="w-full p-3 text-sm bg-background border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground block">Select Target Case:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('upper')}>
                  UPPERCASE
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('lower')}>
                  lowercase
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('title')}>
                  Title Case
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('sentence')}>
                  Sentence case
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('camel')}>
                  camelCase
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('pascal')}>
                  PascalCase
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('snake')}>
                  snake_case
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('kebab')}>
                  kebab-case
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCaseConvert('constant')}>
                  CONSTANT_CASE
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Text Cleaner & Formatter */}
      {tool.id === 'doc-text-cleaner' && (
        <div className="space-y-6">
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-primary" /> Messy Text / List
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(inputText)}
                disabled={!inputText}
                className="text-xs h-7"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste unstructured lists, dirty logs, or duplicate text..."
              rows={10}
              className="w-full p-3 text-sm bg-background border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border rounded-lg text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanTrim}
                  onChange={(e) => setCleanTrim(e.target.checked)}
                  className="rounded border-border"
                />
                Trim Whitespace
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanRemoveEmpty}
                  onChange={(e) => setCleanRemoveEmpty(e.target.checked)}
                  className="rounded border-border"
                />
                Remove Empty Lines
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanDedupe}
                  onChange={(e) => setCleanDedupe(e.target.checked)}
                  className="rounded border-border"
                />
                Remove Duplicates
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanSort}
                  onChange={(e) => setCleanSort(e.target.checked)}
                  className="rounded border-border"
                />
                Sort A-Z Alphabetically
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanReverse}
                  onChange={(e) => setCleanReverse(e.target.checked)}
                  className="rounded border-border"
                />
                Reverse Lines
              </label>
            </div>

            <Button onClick={handleCleanExecute} className="w-full flex items-center justify-center gap-2">
              <AlignJustify className="h-4 w-4" /> Run Cleaner Routine
            </Button>
          </div>
        </div>
      )}
    </ToolWorkspaceShell>
  );
};
