import React, { useState, useEffect, useMemo } from 'react';
import { ToolCategory, ToolDefinition } from '../types/ToolTypes';
import { ToolRegistry } from '../registry/ToolRegistry';
import { PdfToolsWorkspace } from './pdf/PdfToolsWorkspace';
import { ImageToolsWorkspace } from './image/ImageToolsWorkspace';
import { TextToolsWorkspace } from './text/TextToolsWorkspace';
import { AcademicToolsWorkspace } from './academic/AcademicToolsWorkspace';
import { UtilityToolsWorkspace } from './utilities/UtilityToolsWorkspace';
import {
  Wrench,
  Search,
  Sparkles,
  ShieldCheck,
  Files,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  Archive,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ToolsHubProps {
  initialToolId?: string | null;
  onSelectTool?: (toolId: string | null) => void;
}

export const ToolsHub: React.FC<ToolsHubProps> = ({ initialToolId, onSelectTool }) => {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(initialToolId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');

  // Synchronize initial tool if passed
  useEffect(() => {
    if (initialToolId) {
      setSelectedToolId(initialToolId);
    }
  }, [initialToolId]);

  // Handle URL hash routing if user pastes or types a tool link
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('tool/')) {
        const id = hash.replace('tool/', '');
        if (id) setSelectedToolId(id);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openTool = (tool: ToolDefinition) => {
    setSelectedToolId(tool.id);
    if (onSelectTool) onSelectTool(tool.id);
    window.history.pushState(null, '', `#/tool/${tool.id}`);
  };

  const closeTool = () => {
    setSelectedToolId(null);
    if (onSelectTool) onSelectTool(null);
    window.history.pushState(null, '', `#/tools`);
  };

  // Filtered tools
  const filteredTools = useMemo(() => {
    return ToolRegistry.searchTools(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const popularTools = useMemo(() => {
    return ToolRegistry.getPopularTools();
  }, []);

  // If a specific tool is active, render its dedicated workspace
  const activeTool = selectedToolId ? ToolRegistry.getToolById(selectedToolId) : null;

  if (activeTool) {
    if (activeTool.category === 'pdf') {
      return <PdfToolsWorkspace tool={activeTool} onBack={closeTool} />;
    }
    if (activeTool.category === 'images') {
      return <ImageToolsWorkspace tool={activeTool} onBack={closeTool} />;
    }
    if (activeTool.category === 'documents') {
      return <TextToolsWorkspace tool={activeTool} onBack={closeTool} />;
    }
    if (activeTool.category === 'academic') {
      return <AcademicToolsWorkspace tool={activeTool} onBack={closeTool} />;
    }
    if (activeTool.category === 'utilities') {
      return <UtilityToolsWorkspace tool={activeTool} onBack={closeTool} />;
    }
  }

  const categoryPills: { id: ToolCategory | 'all'; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Tools', icon: Filter },
    { id: 'pdf', label: 'PDF & Documents', icon: Files },
    { id: 'documents', label: 'Text & Office', icon: FileText },
    { id: 'images', label: 'Images & Graphics', icon: ImageIcon },
    { id: 'academic', label: 'Academic & Research', icon: GraduationCap },
    { id: 'utilities', label: 'Utilities & Converters', icon: Archive },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Wrench className="h-3.5 w-3.5" /> Universal Productivity Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Your tools. Your workspace.
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Everything you need to create, edit, organize and deliver your work. Powered entirely by browser-local processing with zero server uploads.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 bg-background/80 backdrop-blur rounded-xl border border-border text-xs flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-semibold block text-foreground">Zero Cloud Storage</span>
                <span className="text-muted-foreground text-[11px]">Files remain 100% in local memory</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools by action or keyword (e.g. 'merge pdf', 'resize image', 'citation', 'qr code')..."
            className="w-full pl-10 pr-4 py-3 text-sm bg-background border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {categoryPills.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Tools Fast Track */}
      {!searchQuery && selectedCategory === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>POPULAR ESSENTIALS</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {popularTools.slice(0, 6).map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => openTool(tool)}
                  className="flex flex-col items-start p-3 bg-card/60 hover:bg-card border border-border hover:border-primary/50 rounded-xl transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {tool.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {tool.badge || 'Browser local'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tools Catalog Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {selectedCategory === 'all' ? 'All Productivity Tools' : categoryPills.find((c) => c.id === selectedCategory)?.label}{' '}
            <span className="font-mono text-xs font-normal">({filteredTools.length})</span>
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40">
            <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold">No tools match "{searchQuery}"</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try searching with another keyword like 'merge', 'crop', 'markdown', 'citation', or clear filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 text-xs font-medium text-primary hover:underline"
            >
              Reset Search &amp; Categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => openTool(tool)}
                  className="flex flex-col justify-between p-5 bg-card/70 hover:bg-card border border-border hover:border-primary/50 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                        {tool.badge || 'Local'}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {tool.tagline}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-primary font-medium">
                    <span className="text-[11px] text-muted-foreground capitalize">{tool.category}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Open Tool <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
