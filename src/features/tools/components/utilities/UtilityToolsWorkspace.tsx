import React, { useState } from 'react';
import { ToolDefinition } from '../../types/ToolTypes';
import { UtilityService, ZipEntryInfo } from '../../services/utilityService';
import { ToolWorkspaceShell } from '../ToolWorkspaceShell';
import { Button } from '@/components/ui/Button';
import {
  Archive,
  FolderArchive,
  QrCode,
  Braces,
  KeyRound,
  Calculator,
  UploadCloud,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
  Folder,
} from 'lucide-react';

interface UtilityToolsWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
}

export const UtilityToolsWorkspace: React.FC<UtilityToolsWorkspaceProps> = ({ tool, onBack }) => {
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState('output.txt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. ZIP Create states
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [archiveName, setArchiveName] = useState('project_deliverables.zip');

  // 2. ZIP Inspect states
  const [inspectedEntries, setInspectedEntries] = useState<ZipEntryInfo[]>([]);
  const [inspectedZipFile, setInspectedZipFile] = useState<File | null>(null);

  // 3. QR Code states
  const [qrText, setQrText] = useState('https://deadline.app');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrCorrection, setQrCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  // 4. JSON Formatter states
  const [jsonInput, setJsonInput] = useState('{\n  "project": "Deadline",\n  "status": "ready",\n  "features": ["ai", "ide", "tools"]\n}');
  const [jsonIndent, setJsonIndent] = useState(2);
  const [jsonStatus, setJsonStatus] = useState<{ isValid: boolean; message: string } | null>(null);

  // 5. CSV <-> JSON states
  const [csvJsonMode, setCsvJsonMode] = useState<'csv2json' | 'json2csv'>('csv2json');
  const [dataInput, setDataInput] = useState('name,role,department\nJeet,Founder,Engineering\nSarah,Designer,Product\nAlex,Lead,Research');
  const [dataOutput, setDataOutput] = useState('');

  // 6. Base64 states
  const [base64Mode, setBase64Mode] = useState<'encode' | 'decode'>('encode');
  const [base64Input, setBase64Input] = useState('Deadline Universal Productivity Hub');
  const [base64Output, setBase64Output] = useState('');

  // 7. Password generator states
  const [pwLength, setPwLength] = useState(16);
  const [pwUpper, setPwUpper] = useState(true);
  const [pwLower, setPwLower] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // 8. Calculator states
  const [calcPctA, setCalcPctA] = useState(25);
  const [calcPctB, setCalcPctB] = useState(200);
  const [calcDataBytes, setCalcDataBytes] = useState(1048576);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ZIP Creator
  const handleZipFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setZipFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
  };

  const handleCreateZip = async () => {
    if (zipFiles.length === 0) {
      setError('Please add at least one file to archive.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const res = await UtilityService.createZipArchive(zipFiles, archiveName);
      setOutputBlob(res.blob);
      setOutputFilename(res.filename);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ZIP Inspector
  const handleInspectZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setInspectedZipFile(file);
    setIsProcessing(true);
    setError(null);
    try {
      const entries = await UtilityService.inspectZip(file);
      setInspectedEntries(entries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractSingle = async (entryName: string) => {
    if (!inspectedZipFile) return;
    try {
      const res = await UtilityService.extractFileFromZip(inspectedZipFile, entryName);
      setOutputBlob(res.blob);
      setOutputFilename(res.name);
      // Auto download
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // QR Code generator
  const handleGenerateQr = async () => {
    if (!qrText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await UtilityService.generateQrCode(qrText, {
        errorCorrectionLevel: qrCorrection,
        scale: 8,
      });
      setQrDataUrl(res.dataUrl);
      setOutputBlob(res.blob);
      setOutputFilename('qr_code.png');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // JSON Formatter
  const handleFormatJson = (minify = false, indent = jsonIndent) => {
    const res = UtilityService.formatJson(jsonInput, minify ? 0 : indent);
    setJsonStatus({ isValid: res.isValid, message: res.error || (minify ? 'Valid JSON Minified' : 'Valid JSON Formatted') });
    if (res.isValid) {
      setJsonInput(res.formatted);
      setOutputBlob(new Blob([res.formatted], { type: 'application/json' }));
      setOutputFilename('formatted.json');
    }
  };

  // CSV <-> JSON
  const handleConvertData = () => {
    setError(null);
    try {
      if (csvJsonMode === 'csv2json') {
        const json = UtilityService.csvToJson(dataInput);
        setDataOutput(json.jsonString);
        setOutputBlob(new Blob([json.jsonString], { type: 'application/json' }));
        setOutputFilename('converted.json');
      } else {
        const csv = UtilityService.jsonToCsv(dataInput);
        setDataOutput(csv);
        setOutputBlob(new Blob([csv], { type: 'text/csv' }));
        setOutputFilename('converted.csv');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Base64 & URL
  const handleBase64Transform = () => {
    setError(null);
    try {
      if (base64Mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(base64Input)));
        setBase64Output(encoded);
        setOutputBlob(new Blob([encoded], { type: 'text/plain' }));
        setOutputFilename('encoded_base64.txt');
      } else {
        const decoded = decodeURIComponent(escape(atob(base64Input)));
        setBase64Output(decoded);
        setOutputBlob(new Blob([decoded], { type: 'text/plain' }));
        setOutputFilename('decoded_text.txt');
      }
    } catch (err) {
      setError('Invalid base64 string or character encoding issue: ' + (err as Error).message);
    }
  };

  // Password Generator
  const handleGeneratePassword = () => {
    const res = UtilityService.generateSecurePassword(pwLength, {
      includeUppercase: pwUpper,
      includeLowercase: pwLower,
      includeNumbers: pwNumbers,
      includeSymbols: pwSymbols,
    });
    setGeneratedPassword(res.password);
    setOutputBlob(new Blob([res.password], { type: 'text/plain' }));
    setOutputFilename('credentials.txt');
  };

  return (
    <ToolWorkspaceShell
      tool={tool}
      onBack={onBack}
      outputBlob={outputBlob}
      outputFilename={outputFilename}
    >
      {/* 1. ZIP Archive Creator */}
      {tool.id === 'util-zip-create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Archive className="h-4 w-4 text-primary" /> Create .ZIP Archive
            </h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Archive File Name</label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
              />
            </div>

            <label className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-background/50 hover:bg-primary/5">
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Add Files to Archive</span>
              <span className="text-xs text-muted-foreground mt-1">Select one or multiple files</span>
              <input type="file" multiple className="hidden" onChange={handleZipFilesChange} />
            </label>

            <Button
              onClick={handleCreateZip}
              disabled={isProcessing || zipFiles.length === 0}
              className="w-full flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Generate ZIP ({zipFiles.length} files)
            </Button>
          </div>

          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground">Files Queued ({zipFiles.length})</h4>
              {zipFiles.length > 0 && (
                <button onClick={() => setZipFiles([])} className="text-xs text-red-500 hover:underline">
                  Clear All
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
              {zipFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground shrink-0 ml-2">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
              {zipFiles.length === 0 && (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  No files added yet. Select files on the left to pack into ZIP.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ZIP Inspector & Extractor */}
      {tool.id === 'util-zip-inspect' && (
        <div className="space-y-6">
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-primary" /> Inspect &amp; Extract ZIP Archives
            </h3>
            <label className="border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-background/50">
              <FolderArchive className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Select .ZIP Archive to Inspect</span>
              <span className="text-xs text-muted-foreground mt-1">Processed entirely in browser memory</span>
              <input type="file" accept=".zip" className="hidden" onChange={handleInspectZipFile} />
            </label>
          </div>

          {inspectedEntries.length > 0 && (
            <div className="border border-border rounded-xl p-5 bg-card/60 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Archive Contents ({inspectedEntries.length} items)
              </h4>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {inspectedEntries.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item.isDirectory ? (
                        <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate font-mono">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-muted-foreground font-mono">
                        {(item.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                      {!item.isDirectory && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtractSingle(item.name)}
                          className="h-6 text-[11px] px-2"
                        >
                          Extract
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. QR Code Generator */}
      {tool.id === 'util-qr-code' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" /> QR Code Settings
            </h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Target Content (URL or Text)</label>
              <textarea
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder="https://yourwebsite.com or custom text payload"
                rows={4}
                className="w-full p-3 text-xs bg-background border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Error Correction Level</label>
              <div className="grid grid-cols-4 gap-2">
                {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
                  <Button
                    key={lvl}
                    variant={qrCorrection === lvl ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setQrCorrection(lvl)}
                    className="text-xs"
                  >
                    Level {lvl}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerateQr} className="w-full flex items-center justify-center gap-2">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Generate High-Res QR Code
            </Button>
          </div>

          <div className="border border-border rounded-xl p-5 bg-card/60 flex flex-col items-center justify-center min-h-[320px]">
            {qrDataUrl ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-white rounded-xl shadow inline-block border border-border">
                  <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 object-contain" />
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{qrText}</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Click Generate to preview your QR code</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. JSON Formatter & Validator */}
      {tool.id === 'util-json-formatter' && (
        <div className="space-y-4">
          <div className="border border-border rounded-xl p-4 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Braces className="h-4 w-4 text-primary" /> JSON Input &amp; Output
              </label>
              <div className="flex gap-2">
                <Button
                  variant={jsonIndent === 2 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setJsonIndent(2);
                    handleFormatJson(false, 2);
                  }}
                  className="text-xs h-7"
                >
                  Pretty 2 sp
                </Button>
                <Button
                  variant={jsonIndent === 4 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setJsonIndent(4);
                    handleFormatJson(false, 4);
                  }}
                  className="text-xs h-7"
                >
                  Pretty 4 sp
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleFormatJson(true)} className="text-xs h-7">
                  Minify
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCopy(jsonInput)} className="text-xs h-7">
                  {copied ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={15}
              className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />

            {jsonStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  jsonStatus.isValid
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                    : 'bg-red-500/10 border border-red-500/30 text-red-500'
                }`}
              >
                {jsonStatus.isValid ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{jsonStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. CSV <-> JSON Converter */}
      {tool.id === 'util-csv-json' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={csvJsonMode === 'csv2json' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCsvJsonMode('csv2json');
                setDataInput('name,role,department\nJeet,Founder,Engineering\nSarah,Designer,Product');
                setDataOutput('');
              }}
            >
              CSV &rarr; JSON
            </Button>
            <Button
              variant={csvJsonMode === 'json2csv' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCsvJsonMode('json2csv');
                setDataInput('[\n  {"name": "Jeet", "role": "Founder"},\n  {"name": "Sarah", "role": "Designer"}\n]');
                setDataOutput('');
              }}
            >
              JSON &rarr; CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Input {csvJsonMode === 'csv2json' ? 'CSV' : 'JSON'}
              </label>
              <textarea
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                rows={12}
                className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">
                  Output {csvJsonMode === 'csv2json' ? 'JSON' : 'CSV'}
                </label>
                {dataOutput && (
                  <Button variant="outline" size="sm" onClick={() => handleCopy(dataOutput)} className="text-xs h-6 px-2">
                    {copied ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copy
                  </Button>
                )}
              </div>
              <textarea
                value={dataOutput}
                readOnly
                placeholder="Converted data will appear here..."
                rows={12}
                className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg"
              />
            </div>
          </div>

          <Button onClick={handleConvertData} className="w-full flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" /> Run Conversion
          </Button>
        </div>
      )}

      {/* 6. Base64 & URL Encoder */}
      {tool.id === 'util-base64' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={base64Mode === 'encode' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setBase64Mode('encode')}
            >
              Encode to Base64
            </Button>
            <Button
              variant={base64Mode === 'decode' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setBase64Mode('decode')}
            >
              Decode from Base64
            </Button>
          </div>

          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {base64Mode === 'encode' ? 'Raw Text Input' : 'Base64 Encoded Input'}
              </label>
              <textarea
                value={base64Input}
                onChange={(e) => setBase64Input(e.target.value)}
                rows={4}
                className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg"
              />
            </div>

            <Button onClick={handleBase64Transform} className="w-full">
              Transform
            </Button>

            {base64Output && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground">Result</label>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(base64Output)} className="text-xs h-6 px-2">
                    {copied ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} Copy
                  </Button>
                </div>
                <textarea
                  value={base64Output}
                  readOnly
                  rows={4}
                  className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Password & Token Generator */}
      {tool.id === 'util-password' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="border border-border rounded-xl p-6 bg-card/60 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Cryptographic Key &amp; Password Generator
            </h3>

            {/* Generated Output Display */}
            <div className="p-4 bg-background border border-border rounded-xl flex items-center justify-between">
              <span className="font-mono text-base font-semibold text-primary truncate pr-2">
                {generatedPassword || 'Click Generate Below'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(generatedPassword)}
                disabled={!generatedPassword}
                className="shrink-0 text-xs h-8"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Length</span>
                  <span className="font-mono font-semibold">{pwLength} characters</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={pwLength}
                  onChange={(e) => setPwLength(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pwUpper}
                    onChange={(e) => setPwUpper(e.target.checked)}
                    className="rounded border-border"
                  />
                  Uppercase Letters (A-Z)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pwLower}
                    onChange={(e) => setPwLower(e.target.checked)}
                    className="rounded border-border"
                  />
                  Lowercase Letters (a-z)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pwNumbers}
                    onChange={(e) => setPwNumbers(e.target.checked)}
                    className="rounded border-border"
                  />
                  Numbers (0-9)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pwSymbols}
                    onChange={(e) => setPwSymbols(e.target.checked)}
                    className="rounded border-border"
                  />
                  Symbols (!@#$%^&amp;*)
                </label>
              </div>
            </div>

            <Button onClick={handleGeneratePassword} className="w-full flex items-center justify-center gap-2">
              <KeyRound className="h-4 w-4" /> Generate Secure Password
            </Button>
          </div>
        </div>
      )}

      {/* 8. Calculator & Unit Converter */}
      {tool.id === 'util-calc' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Percentage Calculator */}
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Percentage Calculator
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">What is {calcPctA}% of {calcPctB}?</span>
                <div className="p-3 bg-background rounded-lg border border-border font-mono font-semibold text-sm text-primary">
                  {((calcPctA / 100) * calcPctB).toFixed(2)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    value={calcPctA}
                    onChange={(e) => setCalcPctA(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Total Amount</label>
                  <input
                    type="number"
                    value={calcPctB}
                    onChange={(e) => setCalcPctB(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Byte Data Converter */}
          <div className="border border-border rounded-xl p-5 bg-card/60 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Storage &amp; Data Size Converter
            </h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Bytes</label>
              <input
                type="number"
                value={calcDataBytes}
                onChange={(e) => setCalcDataBytes(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-background border border-border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-background rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground block">Kilobytes (KB)</span>
                <span className="font-mono font-semibold">{(calcDataBytes / 1024).toFixed(2)} KB</span>
              </div>
              <div className="p-3 bg-background rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground block">Megabytes (MB)</span>
                <span className="font-mono font-semibold">{(calcDataBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="p-3 bg-background rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground block">Gigabytes (GB)</span>
                <span className="font-mono font-semibold">{(calcDataBytes / (1024 * 1024 * 1024)).toFixed(3)} GB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs flex items-center gap-2 mt-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </ToolWorkspaceShell>
  );
};
