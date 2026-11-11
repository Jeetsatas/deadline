import React, { useState, useEffect } from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Priority, DeliverableType, ReferenceLink } from '@/types';
import { Target, Link2, Plus, Trash2, Calendar, Clock } from 'lucide-react';

export const CreateDeadlineModal: React.FC = () => {
  const {
    isCreateModalOpen,
    closeCreateModal,
    createDeadline,
    updateDeadline,
    editingDeadline,
  } = useDeadlineStore();

  const isEditing = Boolean(editingDeadline);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [minimumAcceptableOutput, setMinimumAcceptableOutput] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [priority, setPriority] = useState<Priority>('high');
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('prototype');
  const [tags, setTags] = useState('');
  const [referenceLinks, setReferenceLinks] = useState<{ title: string; url: string }[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When editing, populate existing values; otherwise set smart defaults
  useEffect(() => {
    if (editingDeadline) {
      setTitle(editingDeadline.title);
      setDescription(editingDeadline.description);
      setExpectedOutput(editingDeadline.expectedOutput);
      setMinimumAcceptableOutput(editingDeadline.minimumAcceptableOutput || '');
      setDeadlineDate(editingDeadline.deadlineDate);
      setDeadlineTime(editingDeadline.deadlineTime);
      setPriority(editingDeadline.priority);
      setDeliverableType(editingDeadline.deliverableType);
      setTags(editingDeadline.tags?.join(', ') || '');
      setReferenceLinks(
        editingDeadline.referenceLinks.map((l) => ({ title: l.title, url: l.url }))
      );
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');

      setTitle('');
      setDescription('');
      setExpectedOutput('');
      setMinimumAcceptableOutput('');
      setDeadlineDate(`${yyyy}-${mm}-${dd}`);
      setDeadlineTime('18:00');
      setPriority('high');
      setDeliverableType('prototype');
      setTags('');
      setReferenceLinks([]);
    }
    setErrors({});
  }, [editingDeadline, isCreateModalOpen]);

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    setReferenceLinks([
      ...referenceLinks,
      {
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`,
      },
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (index: number) => {
    setReferenceLinks(referenceLinks.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Project title is required';
    if (!expectedOutput.trim())
      errs.expectedOutput = 'Please define the expected deliverable output';
    if (!deadlineDate) errs.deadlineDate = 'Deadline date is required';
    if (!deadlineTime) errs.deadlineTime = 'Deadline time is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const links: ReferenceLink[] = referenceLinks.map((l, idx) => ({
        id: `ref_${Date.now()}_${idx}`,
        title: l.title,
        url: l.url,
        createdAt: new Date().toISOString(),
      }));

      if (isEditing && editingDeadline) {
        await updateDeadline(editingDeadline.id, {
          title: title.trim(),
          description: description.trim(),
          expectedOutput: expectedOutput.trim(),
          minimumAcceptableOutput: minimumAcceptableOutput.trim() || undefined,
          deadlineDate,
          deadlineTime,
          priority,
          deliverableType,
          tags: parsedTags,
          referenceLinks: links,
        });
      } else {
        await createDeadline({
          title: title.trim(),
          description: description.trim(),
          expectedOutput: expectedOutput.trim(),
          minimumAcceptableOutput: minimumAcceptableOutput.trim() || undefined,
          deadlineDate,
          deadlineTime,
          dueDateTime: `${deadlineDate}T${deadlineTime}:00.000Z`,
          priority,
          status: 'in_progress',
          progress: 0,
          deliverableType,
          milestones: [],
          referenceLinks: links,
          attachments: [],
          tags: parsedTags,
          notes: '',
        });
      }
      closeCreateModal();
    } catch (err) {
      console.error('Failed to save deadline', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={closeCreateModal}
      title={isEditing ? 'Edit Deadline' : 'Create New Deadline'}
      description="Define the target deliverable, completion criteria and delivery timeframe."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Project Title */}
        <Input
          label="Project Title *"
          placeholder="e.g., Calculator Application, Series A Pitch Deck, Thesis Chapter"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          autoFocus
        />

        {/* Deliverable Expected Output (Crucial philosophy callout) */}
        <div className="space-y-1.5 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <Target className="h-3.5 w-3.5" />
            <span>Expected Output * (The Deliverable)</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Describe the tangible result in plain language. Output matters more than activity.
          </p>
          <Textarea
            placeholder="e.g. A working calculator prototype hosted on Vercel with clean arithmetic keyboard shortcuts and unit tests."
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            error={errors.expectedOutput}
            rows={2}
          />
        </div>

        {/* Minimum Acceptable Output (MVP) */}
        <div>
          <Input
            label="Minimum Acceptable Output (Optional MVP)"
            placeholder="e.g., Basic calculator supporting +, -, *, / without history tape"
            value={minimumAcceptableOutput}
            onChange={(e) => setMinimumAcceptableOutput(e.target.value)}
            helperText="The lowest acceptable output that still satisfies the core requirement if time runs tight."
          />
        </div>

        {/* Description */}
        <Textarea
          label="Project Description (Context)"
          placeholder="Why are you building this? Who is it for? Any specific grading or client instructions?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        {/* Date, Time, Priority, Type Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Deadline Date *
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.deadlineDate && (
              <p className="text-xs text-red-500 mt-1">{errors.deadlineDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              <Clock className="inline h-3.5 w-3.5 mr-1" />
              Deadline Time *
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.deadlineTime && (
              <p className="text-xs text-red-500 mt-1">{errors.deadlineTime}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="critical">Critical (Highest Urgency)</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Deliverable Category
            </label>
            <select
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}
              className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="prototype">Working Prototype</option>
              <option value="software">Software Feature / App</option>
              <option value="presentation">Presentation / Pitch Deck</option>
              <option value="assignment">College Assignment</option>
              <option value="research_paper">Research Paper / Thesis</option>
              <option value="report">Report / Document</option>
              <option value="video">Video / Demo Reel</option>
              <option value="design">Design / Graphic Assets</option>
              <option value="other">Other Deliverable</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <Input
          label="Tags (comma-separated)"
          placeholder="college, prototype, react, semester-exam"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        {/* Reference Links Section */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Link2 className="inline h-3.5 w-3.5 mr-1" />
            Reference Links (Optional)
          </label>

          {referenceLinks.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {referenceLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border/60 text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold text-foreground">{link.title}: </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {link.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Title (e.g., Spec Doc)"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="h-8 flex-1 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground"
            />
            <input
              type="text"
              placeholder="https://..."
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="h-8 flex-2 rounded-md border border-input bg-background/50 px-2.5 text-xs text-foreground"
            />
            <Button type="button" size="sm" variant="outline" onClick={handleAddLink}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button type="button" variant="ghost" onClick={closeCreateModal}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Deadline'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
