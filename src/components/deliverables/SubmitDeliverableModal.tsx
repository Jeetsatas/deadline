import React, { useState } from 'react';
import { Deadline, SubmissionFormat } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { CheckCircle2, Globe, Github, FileText, UploadCloud, AlertCircle } from 'lucide-react';

interface SubmitDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadline: Deadline;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  isOpen,
  onClose,
  deadline,
}) => {
  const { submitFinalDeliverable } = useDeadlineStore();

  const [title, setTitle] = useState(`${deadline.title} — Final Deliverable`);
  const [summary, setSummary] = useState('');
  const [submissionFormat, setSubmissionFormat] = useState<SubmissionFormat>('url');
  const [resourceUri, setResourceUri] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceUri.trim() && !fileName.trim()) {
      setError('Please provide a submission link or file reference.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFinalDeliverable(deadline.id, {
        title: title.trim(),
        expectedOutput: deadline.expectedOutput,
        summary: summary.trim() || `Delivered final output for ${deadline.title}`,
        deliverableType: deadline.deliverableType,
        submissionFormat,
        resourceUri: resourceUri.trim() || fileName.trim(),
        status: 'submitted',
        fileMetadata: fileName
          ? {
              filename: fileName,
              filesize: fileSize || '1.2 MB',
              filetype: submissionFormat,
            }
          : undefined,
        verificationNotes: verificationNotes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      console.error('Submission failed', err);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Final Deliverable"
      description="Mark this deadline as completed by recording the finished deliverable."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Core expected deliverable reminder */}
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs">
          <span className="font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider block mb-1">
            Required Output:
          </span>
          <p className="font-medium text-foreground">{deadline.expectedOutput}</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Deliverable Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Calculator App v1.0 Production Release"
        />

        {/* Format Selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Submission Format *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'url', label: 'Live URL', icon: Globe },
              { id: 'repository', label: 'Code Repo', icon: Github },
              { id: 'document', label: 'Document', icon: FileText },
              { id: 'file_ref', label: 'File Archive', icon: UploadCloud },
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = submissionFormat === fmt.id;
              return (
                <button
                  type="button"
                  key={fmt.id}
                  onClick={() => setSubmissionFormat(fmt.id as SubmissionFormat)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                      : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* URI or File Reference */}
        {submissionFormat === 'file_ref' ? (
          <div className="space-y-2">
            <Input
              label="File Name or Reference Path *"
              placeholder="e.g. calculator_final_build.zip or s3://assets/deliverables/..."
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <Input
              label="Approximate File Size (optional)"
              placeholder="e.g. 4.2 MB"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
            />
          </div>
        ) : (
          <Input
            label="Resource URL / Link *"
            placeholder={
              submissionFormat === 'repository'
                ? 'https://github.com/username/project-repo'
                : 'https://app.deadline.dev or https://docs.google.com/...'
            }
            value={resourceUri}
            onChange={(e) => setResourceUri(e.target.value)}
          />
        )}

        <Textarea
          label="Execution Summary & Delivery Notes"
          placeholder="Summarize what was built, key highlights, or instructions to test and verify the deliverable."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
        />

        <Input
          label="Verification / Acceptance Criteria Notes (Optional)"
          placeholder="e.g. All unit tests passed, deployed to production cluster."
          value={verificationNotes}
          onChange={(e) => setVerificationNotes(e.target.value)}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Complete & Submit Deliverable
          </Button>
        </div>
      </form>
    </Modal>
  );
};
