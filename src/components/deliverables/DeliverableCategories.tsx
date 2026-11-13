import React from 'react';
import { DeliverableVaultCategory } from '@/types';
import {
  FolderGit2,
  FileText,
  Presentation,
  Code2,
  Image as ImageIcon,
  Video,
  Globe,
  Layers,
} from 'lucide-react';

interface DeliverableCategoriesProps {
  selectedCategory: DeliverableVaultCategory;
  onSelectCategory: (cat: DeliverableVaultCategory) => void;
  counts: Record<DeliverableVaultCategory, number>;
}

export const DeliverableCategories: React.FC<DeliverableCategoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  counts,
}) => {
  const categories: {
    id: DeliverableVaultCategory;
    label: string;
    icon: React.ElementType;
  }[] = [
    { id: 'all', label: 'All Deliverables', icon: Layers },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'presentations', label: 'Presentations', icon: Presentation },
    { id: 'software', label: 'Software & Code', icon: Code2 },
    { id: 'graphics', label: 'Images & Graphics', icon: ImageIcon },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'links', label: 'Links & References', icon: Globe },
    { id: 'other', label: 'Other', icon: FolderGit2 },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedCategory === cat.id;
        const count = counts[cat.id] || 0;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-secondary text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 ${
                isSelected ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span>{cat.label}</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

