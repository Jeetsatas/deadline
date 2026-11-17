import { LucideIcon } from 'lucide-react';

export type ToolCategory =
  | 'pdf'
  | 'documents'
  | 'images'
  | 'academic'
  | 'utilities'
  | 'writing';

export type ProcessingMode = 'browser_local' | 'local_bridge' | 'ai_assisted' | 'external_api';

export interface ToolDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  processingMode: ProcessingMode;
  acceptedFormats?: string[];
  outputFormat?: string;
  isPopular?: boolean;
  isNew?: boolean;
  badge?: string;
  keywords: string[];
}

export interface ToolExecutionResult {
  success: boolean;
  filename?: string;
  data?: Blob | string | ArrayBuffer;
  previewUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}
