import React, { useState, useEffect } from 'react';
import { ToolDefinition } from '../../types/ToolTypes';
import { ImageService, ImageFilterOptions } from '../../services/imageService';
import { ToolWorkspaceShell } from '../ToolWorkspaceShell';
import { Button } from '@/components/ui/Button';
import {
  UploadCloud,
  Sliders,
  Check,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  AlertCircle,
  Copy,
  Layers,
} from 'lucide-react';

interface ImageToolsWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
}

export const ImageToolsWorkspace: React.FC<ImageToolsWorkspaceProps> = ({ tool, onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Original image dimensions
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Results
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState('processed_image.png');
  const [outputPreviewUrl, setOutputPreviewUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reductionPct: number;
  } | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Resize options
  const [targetWidth, setTargetWidth] = useState(800);
  const [targetHeight, setTargetHeight] = useState(600);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Crop options
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(400);
  const [cropH, setCropH] = useState(400);

  // Compress options
  const [compressQuality, setCompressQuality] = useState(75);
  const [selectedFormat, setSelectedFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/jpeg');

  // Rotate & Flip
  const [rotationAngle, setRotationAngle] = useState(90);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Filters
  const [filterBrightness, setFilterBrightness] = useState(100);
  const [filterContrast, setFilterContrast] = useState(100);
  const [filterGrayscale, setFilterGrayscale] = useState(0);
  const [filterSepia, setFilterSepia] = useState(0);
  const [filterInvert, setFilterInvert] = useState(0);
  const [filterBlur, setFilterBlur] = useState(0);

  useEffect(() => {
    if (outputBlob) {
      const url = URL.createObjectURL(outputBlob);
      setOutputPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOutputPreviewUrl(null);
    }
  }, [outputBlob]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
    setOutputBlob(null);
    setCompressionStats(null);
    setExtractedPalette([]);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    try {
      const img = await ImageService.loadImage(selectedFile);
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setTargetWidth(img.naturalWidth);
      setTargetHeight(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setCropW(Math.min(img.naturalWidth, 400));
      setCropH(Math.min(img.naturalHeight, 400));

      if (tool.id === 'img-palette') {
        const colors = await ImageService.extractColorPalette(selectedFile, 8);
        setExtractedPalette(colors);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (lockAspectRatio && aspectRatio > 0) {
      setTargetHeight(Math.max(1, Math.round(val / aspectRatio)));
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (lockAspectRatio && aspectRatio > 0) {
      setTargetWidth(Math.max(1, Math.round(val * aspectRatio)));
    }
  };

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const handleExecute = async () => {
    if (!file) {
      setError('Please select an image file first.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOutputBlob(null);

    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    try {
      if (tool.id === 'img-resize') {
        const res = await ImageService.resizeImage(file, targetWidth, targetHeight, selectedFormat);
        const ext = selectedFormat === 'image/jpeg' ? 'jpg' : selectedFormat === 'image/webp' ? 'webp' : 'png';
        setOutputBlob(res.blob);
        setOutputFilename(`${baseName}_resized_${targetWidth}x${targetHeight}.${ext}`);
      } else if (tool.id === 'img-crop') {
        const res = await ImageService.cropImage(
          file,
          { x: cropX, y: cropY, width: cropW, height: cropH },
          'image/png'
        );
        setOutputBlob(res.blob);
        setOutputFilename(`${baseName}_cropped.${res.blob.type.includes('png') ? 'png' : 'jpg'}`);
      } else if (tool.id === 'img-compress') {
        const res = await ImageService.compressImage(file, compressQuality / 100, selectedFormat);
        const ext = selectedFormat === 'image/jpeg' ? 'jpg' : selectedFormat === 'image/webp' ? 'webp' : 'png';
        setOutputBlob(res.blob);
        setOutputFilename(`${baseName}_compressed_${compressQuality}pct.${ext}`);
        setCompressionStats({
          originalSize: res.originalSizeBytes,
          compressedSize: res.compressedSizeBytes,
          reductionPct: res.reductionPct,
        });
      } else if (tool.id === 'img-format') {
        const res = await ImageService.resizeImage(
          file,
          naturalDimensions.width,
          naturalDimensions.height,
          selectedFormat,
          0.95
        );
        const ext = selectedFormat === 'image/jpeg' ? 'jpg' : selectedFormat === 'image/webp' ? 'webp' : 'png';
        setOutputBlob(res.blob);
        setOutputFilename(`${baseName}_converted.${ext}`);
      } else if (tool.id === 'img-rotate-flip') {
        const res = await ImageService.rotateAndFlip(file, rotationAngle, flipH, flipV);
        setOutputBlob(res.blob);
        setOutputFilename(`${baseName}_oriented.png`);
      } else if (tool.id === 'img-filters') {
        const filters: ImageFilterOptions = {
          brightness: filterBrightness,
          contrast: filterContrast,
          grayscale: filterGrayscale,
          sepia: filterSepia,
          invert: filterInvert,
          blur: filterBlur,
        };
        const res = await ImageService.applyFilters(file, filters);
        setOutputBlob(res.blob);
        setOutputFilename(`${baseName}_filtered.png`);
      } else if (tool.id === 'img-palette') {
        const colors = await ImageService.extractColorPalette(file, 8);
        setExtractedPalette(colors);
        const jsonStr = JSON.stringify({ image: file.name, palette: colors }, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        setOutputBlob(blob);
        setOutputFilename(`${baseName}_palette.json`);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to process image.');
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
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Parameters */}
        <div className="lg:col-span-6 space-y-6">
          {/* File Upload Dropzone */}
          <div className="border border-border rounded-xl p-5 bg-card/60">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-primary" />
              Upload Source Image
            </h3>

            {!file ? (
              <label className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-background/50 hover:bg-primary/5">
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-3 animate-pulse" />
                <span className="text-sm font-medium">Click or drag image file here</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Supports PNG, JPG, JPEG, and WebP (Processed entirely in browser memory)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded bg-background flex items-center justify-center overflow-hidden border border-border shrink-0">
                    {previewUrl && <img src={previewUrl} alt="Thumbnail" className="w-full h-full object-cover" />}
                  </div>
                  <div className="truncate text-left">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB &bull; {naturalDimensions.width} &times; {naturalDimensions.height} px
                    </p>
                  </div>
                </div>
                <label className="text-xs font-medium text-primary hover:underline cursor-pointer ml-3 shrink-0">
                  Replace
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Configuration Controls based on Tool ID */}
          {file && (
            <div className="border border-border rounded-xl p-5 bg-card/60 space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Tool Configuration
              </h3>

              {/* Tool: img-resize */}
              {tool.id === 'img-resize' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Target Width (px)</label>
                      <input
                        type="number"
                        min="1"
                        max="8000"
                        value={targetWidth}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Target Height (px)</label>
                      <input
                        type="number"
                        min="1"
                        max="8000"
                        value={targetHeight}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="lockAspect"
                      checked={lockAspectRatio}
                      onChange={(e) => setLockAspectRatio(e.target.checked)}
                      className="rounded border-border"
                    />
                    <label htmlFor="lockAspect" className="text-xs text-muted-foreground cursor-pointer">
                      Lock Aspect Ratio ({aspectRatio.toFixed(2)} : 1)
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Output Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) =>
                        setSelectedFormat(e.target.value as 'image/png' | 'image/jpeg' | 'image/webp')
                      }
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                    >
                      <option value="image/png">PNG (Lossless with Alpha)</option>
                      <option value="image/jpeg">JPEG (Compact)</option>
                      <option value="image/webp">WebP (Modern Optimized)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tool: img-crop */}
              {tool.id === 'img-crop' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Specify crop bounds inside image ({naturalDimensions.width} &times; {naturalDimensions.height}):
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Start X (px)</label>
                      <input
                        type="number"
                        min="0"
                        max={naturalDimensions.width - 1}
                        value={cropX}
                        onChange={(e) => setCropX(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Start Y (px)</label>
                      <input
                        type="number"
                        min="0"
                        max={naturalDimensions.height - 1}
                        value={cropY}
                        onChange={(e) => setCropY(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Crop Width (px)</label>
                      <input
                        type="number"
                        min="1"
                        max={naturalDimensions.width - cropX}
                        value={cropW}
                        onChange={(e) => setCropW(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Crop Height (px)</label>
                      <input
                        type="number"
                        min="1"
                        max={naturalDimensions.height - cropY}
                        value={cropH}
                        onChange={(e) => setCropH(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const side = Math.min(naturalDimensions.width, naturalDimensions.height);
                        setCropX(0);
                        setCropY(0);
                        setCropW(side);
                        setCropH(side);
                      }}
                    >
                      1:1 Square Preset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCropX(0);
                        setCropY(0);
                        setCropW(naturalDimensions.width);
                        setCropH(Math.round(naturalDimensions.width * (9 / 16)));
                      }}
                    >
                      16:9 Landscape Preset
                    </Button>
                  </div>
                </div>
              )}

              {/* Tool: img-compress */}
              {tool.id === 'img-compress' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-muted-foreground">Compression Quality</span>
                      <span className="font-mono font-semibold">{compressQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={compressQuality}
                      onChange={(e) => setCompressQuality(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                      <span>Maximum Compression</span>
                      <span>Balanced</span>
                      <span>Highest Quality</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Target Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) =>
                        setSelectedFormat(e.target.value as 'image/png' | 'image/jpeg' | 'image/webp')
                      }
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                    >
                      <option value="image/jpeg">JPEG (Best for photos)</option>
                      <option value="image/webp">WebP (Modern compression)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tool: img-format */}
              {tool.id === 'img-format' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Convert to Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) =>
                        setSelectedFormat(e.target.value as 'image/png' | 'image/jpeg' | 'image/webp')
                      }
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                    >
                      <option value="image/png">PNG (.png) — Lossless with transparency</option>
                      <option value="image/jpeg">JPEG (.jpg) — Highly compatible compressed format</option>
                      <option value="image/webp">WebP (.webp) — Next-gen high compression format</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tool: img-rotate-flip */}
              {tool.id === 'img-rotate-flip' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Rotation Angle</label>
                    <div className="flex gap-2">
                      {[90, 180, 270].map((deg) => (
                        <Button
                          key={deg}
                          variant={rotationAngle === deg ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setRotationAngle(deg)}
                          className="flex items-center gap-1.5"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          {deg}&deg;
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant={flipH ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setFlipH(!flipH)}
                      className="flex items-center gap-1.5"
                    >
                      <FlipHorizontal className="h-3.5 w-3.5" />
                      Flip Horizontal
                    </Button>
                    <Button
                      variant={flipV ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setFlipV(!flipV)}
                      className="flex items-center gap-1.5"
                    >
                      <FlipVertical className="h-3.5 w-3.5" />
                      Flip Vertical
                    </Button>
                  </div>
                </div>
              )}

              {/* Tool: img-filters */}
              {tool.id === 'img-filters' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Brightness</span>
                      <span className="font-mono">{filterBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={filterBrightness}
                      onChange={(e) => setFilterBrightness(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Contrast</span>
                      <span className="font-mono">{filterContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={filterContrast}
                      onChange={(e) => setFilterContrast(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Grayscale</span>
                      <span className="font-mono">{filterGrayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterGrayscale}
                      onChange={(e) => setFilterGrayscale(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Sepia</span>
                      <span className="font-mono">{filterSepia}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterSepia}
                      onChange={(e) => setFilterSepia(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Blur</span>
                      <span className="font-mono">{filterBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={filterBlur}
                      onChange={(e) => setFilterBlur(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterBrightness(100);
                      setFilterContrast(100);
                      setFilterGrayscale(0);
                      setFilterSepia(0);
                      setFilterInvert(0);
                      setFilterBlur(0);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}

              {/* Action Button */}
              {tool.id !== 'img-palette' && (
                <Button
                  onClick={handleExecute}
                  disabled={isProcessing}
                  className="w-full mt-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Image in Browser...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Apply &amp; Process Image
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Live / Output Preview */}
        <div className="lg:col-span-6 space-y-6">
          <div className="border border-border rounded-xl p-5 bg-card/60 min-h-[400px] flex flex-col">
            <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span>Preview &amp; Results</span>
              {compressionStats && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                  {compressionStats.reductionPct}% smaller
                </span>
              )}
            </h3>

            {/* Compression Telemetry */}
            {compressionStats && (
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/30 rounded-lg text-center text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Original</span>
                  <span className="font-semibold">{(compressionStats.originalSize / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Compressed</span>
                  <span className="font-semibold">{(compressionStats.compressedSize / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Saved</span>
                  <span className="font-semibold text-emerald-500">
                    {((compressionStats.originalSize - compressionStats.compressedSize) / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            )}

            {/* Color Palette Display */}
            {tool.id === 'img-palette' && extractedPalette.length > 0 && (
              <div className="space-y-4 mb-4">
                <p className="text-xs text-muted-foreground">
                  Extracted {extractedPalette.length} dominant colors. Click any swatch to copy HEX code:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {extractedPalette.map((hex) => (
                    <div
                      key={hex}
                      onClick={() => copyToClipboard(hex)}
                      className="group cursor-pointer rounded-lg border border-border overflow-hidden hover:scale-105 transition-transform"
                    >
                      <div className="h-16 w-full" style={{ backgroundColor: hex }} />
                      <div className="p-2 bg-background flex items-center justify-between text-xs font-mono">
                        <span>{hex}</span>
                        {copiedHex === hex ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Canvas / View */}
            <div className="flex-1 rounded-lg border border-border bg-black/5 dark:bg-white/5 flex items-center justify-center p-4 overflow-hidden relative min-h-[250px]">
              {outputPreviewUrl ? (
                <img
                  src={outputPreviewUrl}
                  alt="Processed Output"
                  className="max-h-[360px] max-w-full object-contain rounded shadow"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[360px] max-w-full object-contain rounded shadow"
                  style={
                    tool.id === 'img-filters'
                      ? {
                          filter: `brightness(${filterBrightness}%) contrast(${filterContrast}%) grayscale(${filterGrayscale}%) sepia(${filterSepia}%) blur(${filterBlur}px)`,
                        }
                      : {}
                  }
                />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No image loaded</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Upload an image on the left to see live rendering</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolWorkspaceShell>
  );
};
