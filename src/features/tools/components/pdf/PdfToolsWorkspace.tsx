import React, { useState } from 'react';
import { ToolDefinition } from '../../types/ToolTypes';
import { PdfService, PdfMetadataResult } from '../../services/pdfService';
import { ToolWorkspaceShell } from '../ToolWorkspaceShell';
import { Button } from '@/components/ui/Button';
import {
  UploadCloud,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface PdfToolsWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
}

export const PdfToolsWorkspace: React.FC<PdfToolsWorkspaceProps> = ({ tool, onBack }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState('output.pdf');
  const [metadataResult, setMetadataResult] = useState<PdfMetadataResult | null>(null);

  // Tool specific configs
  const [pageRangeInput, setPageRangeInput] = useState('1, 2-3');
  const [rotationAngle, setRotationAngle] = useState(90);
  const [pageSequenceInput, setPageSequenceInput] = useState('');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL DRAFT');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
    setOutputBlob(null);

    // If metadata tool, immediately read
    if (tool.id === 'pdf-metadata' && newFiles[0]) {
      try {
        setIsProcessing(true);
        const meta = await PdfService.getPdfMetadata(newFiles[0]);
        setMetadataResult(meta);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setOutputBlob(null);
  };

  const moveFile = (idx: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const copy = [...prev];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
    setOutputBlob(null);
  };

  const handleExecute = async () => {
    setIsProcessing(true);
    setError(null);
    setOutputBlob(null);

    try {
      if (tool.id === 'pdf-merge') {
        if (files.length < 2) {
          throw new Error('Please select at least 2 PDF files to merge.');
        }
        const res = await PdfService.mergePdfs(files);
        setOutputBlob(res.blob);
        setOutputFilename('merged_document.pdf');
      } else if (tool.id === 'pdf-split') {
        if (!files[0]) throw new Error('Please upload a PDF to split.');
        // Parse page numbers / ranges
        const pages: number[] = [];
        pageRangeInput.split(',').forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = start; i <= end; i++) pages.push(i);
            }
          } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num)) pages.push(num);
          }
        });

        if (pages.length === 0) throw new Error('Please provide valid page numbers.');
        const res = await PdfService.extractPages(files[0], pages);
        setOutputBlob(res.blob);
        setOutputFilename(`split_${files[0].name}`);
      } else if (tool.id === 'pdf-rotate') {
        if (!files[0]) throw new Error('Please upload a PDF to rotate.');
        const res = await PdfService.rotatePages(files[0], rotationAngle);
        setOutputBlob(res.blob);
        setOutputFilename(`rotated_${files[0].name}`);
      } else if (tool.id === 'pdf-organize') {
        if (!files[0]) throw new Error('Please upload a PDF to reorganize.');
        const seq = pageSequenceInput
          .split(',')
          .map((n) => parseInt(n.trim(), 10))
          .filter((n) => !isNaN(n));
        if (seq.length === 0) throw new Error('Please enter the desired page sequence.');
        const res = await PdfService.reorderAndFilterPages(files[0], seq);
        setOutputBlob(res.blob);
        setOutputFilename(`reordered_${files[0].name}`);
      } else if (tool.id === 'pdf-images-to-pdf') {
        if (files.length === 0) throw new Error('Please upload at least one image.');
        const res = await PdfService.imagesToPdf(files);
        setOutputBlob(res.blob);
        setOutputFilename('images_bundle.pdf');
      } else if (tool.id === 'pdf-watermark') {
        if (!files[0]) throw new Error('Please upload a PDF to watermark.');
        if (!watermarkText.trim()) throw new Error('Watermark text cannot be empty.');
        const res = await PdfService.addWatermark(files[0], watermarkText.trim(), watermarkOpacity);
        setOutputBlob(res.blob);
        setOutputFilename(`watermarked_${files[0].name}`);
      }
    } catch (err) {
      setError((err as Error).message || 'Processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWorkspaceShell
      tool={tool}
      onBack={onBack}
      outputBlob={outputBlob}
      outputFilename={outputFilename}
      outputSummary={`Processed via ${tool.name}`}
    >
      {/* Upload Zone */}
      <div className="space-y-4">
        <label className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-all text-center">
          <input
            type="file"
            multiple={tool.id === 'pdf-merge' || tool.id === 'pdf-images-to-pdf'}
            accept={tool.acceptedFormats?.join(',')}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="p-3 rounded-xl bg-card border border-border shadow-xs text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground block">
              Click or drag files here to begin
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Supported: {tool.acceptedFormats?.join(', ')} • 100% processed in local browser RAM
            </span>
          </div>
        </label>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
              <span>Selected Files ({files.length})</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="hover:text-destructive transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/70 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {tool.id === 'pdf-merge' && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveFile(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFile(idx, 'down')}
                          disabled={idx === files.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive cursor-pointer ml-1"
                      title="Remove file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool-Specific Controls */}
        {files.length > 0 && (
          <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
            {tool.id === 'pdf-split' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Pages to Extract (e.g. 1, 3, 5-8)
                </label>
                <input
                  type="text"
                  value={pageRangeInput}
                  onChange={(e) => setPageRangeInput(e.target.value)}
                  placeholder="1, 2-4, 7"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {tool.id === 'pdf-rotate' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Rotation Angle
                </label>
                <div className="flex items-center gap-2">
                  {[90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotationAngle(deg)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        rotationAngle === deg
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <RotateCw className="h-3.5 w-3.5 inline mr-1" /> {deg}° Clockwise
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool.id === 'pdf-organize' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Target Page Sequence (e.g. 3, 1, 2, 5)
                </label>
                <input
                  type="text"
                  value={pageSequenceInput}
                  onChange={(e) => setPageSequenceInput(e.target.value)}
                  placeholder="3, 1, 2, 4"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {tool.id === 'pdf-watermark' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}

            {tool.id !== 'pdf-metadata' && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={handleExecute}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" /> Execute {tool.name}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Metadata Display */}
        {metadataResult && tool.id === 'pdf-metadata' && (
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4 text-xs">
            <h4 className="text-sm font-bold text-foreground">PDF Document Properties</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Total Pages</span>
                <span className="font-bold text-base text-foreground font-mono">
                  {metadataResult.pageCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground block">File Size</span>
                <span className="font-bold text-base text-foreground font-mono">
                  {(metadataResult.fileSizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Title</span>
                <span className="font-semibold text-foreground truncate block">
                  {metadataResult.title || 'Untitled'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Author</span>
                <span className="font-semibold text-foreground truncate block">
                  {metadataResult.author || 'None specified'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Creator / Application</span>
                <span className="font-semibold text-foreground truncate block">
                  {metadataResult.creator || 'None specified'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Producer</span>
                <span className="font-semibold text-foreground truncate block">
                  {metadataResult.producer || 'None specified'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {outputBlob && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span className="font-semibold">
                Operation completed successfully! Output size: {(outputBlob.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Ready for download or saving to Deliverable Vault
            </span>
          </div>
        )}
      </div>
    </ToolWorkspaceShell>
  );
};
