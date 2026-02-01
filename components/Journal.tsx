import React, { useState, useEffect } from 'react';
import { AppState, JournalEntry } from '../types';
import { Bold, List, Italic, Type, Save, Plus, ArrowLeft, Calendar } from 'lucide-react';

interface JournalProps {
  entries: JournalEntry[];
  assets: AppState['assets'];
  onAddEntry: (entry: JournalEntry) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
}

const Journal: React.FC<JournalProps> = ({ entries, assets, onAddEntry, onUpdateEntry }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNew, setIsNew] = useState(false);

  // Load entry into editor when activeEntryId changes
  useEffect(() => {
    if (activeEntryId && viewMode === 'DETAIL') {
      const entry = entries.find(e => e.id === activeEntryId);
      if (entry) {
        setTitle(entry.title);
        setContent(entry.content);
        setIsNew(false);
      }
    } else if (viewMode === 'DETAIL' && isNew) {
      setTitle('');
      setContent('');
    }
  }, [activeEntryId, viewMode, isNew, entries]);

  const handleCreateNew = () => {
    setIsNew(true);
    setActiveEntryId(null);
    setTitle('');
    setContent('');
    setViewMode('DETAIL');
  };

  const handleOpenEntry = (id: string) => {
      setActiveEntryId(id);
      setIsNew(false);
      setViewMode('DETAIL');
  };

  const handleBackToList = () => {
      setViewMode('LIST');
      setActiveEntryId(null);
      setIsNew(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNew && activeEntryId) {
      // Update existing
      const entry = entries.find(e => e.id === activeEntryId);
      if (entry) {
        onUpdateEntry({
          ...entry,
          title,
          content
        });
      }
    } else {
      // Create new
      const newId = Date.now().toString();
      onAddEntry({
        id: newId,
        date: new Date().toISOString(),
        title: title || 'Untitled Entry',
        content,
        tags: [],
        relatedAssetId: undefined
      });
    }
    setViewMode('LIST');
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('journal-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  if (viewMode === 'LIST') {
      return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Investment Journal</h2>
                <button 
                    onClick={handleCreateNew} 
                    className="bg-brand-green text-black px-4 py-2 rounded-lg font-bold hover:bg-[#00b004] transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Entry
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {entries.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-brand-card rounded-xl border border-white/5 border-dashed text-brand-muted">
                        No journal entries yet. Record your investment thesis and reviews here.
                    </div>
                )}
                {entries.map(entry => (
                    <div 
                        key={entry.id} 
                        onClick={() => handleOpenEntry(entry.id)}
                        className="bg-brand-card p-6 rounded-xl border border-white/5 hover:border-brand-green/50 cursor-pointer transition-all hover:scale-[1.01] group flex flex-col h-64"
                    >
                        <div className="flex items-center gap-2 text-xs text-brand-muted mb-3">
                            <Calendar className="w-3 h-3" />
                            {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-green transition-colors line-clamp-2">{entry.title}</h3>
                        <p className="text-brand-muted text-sm line-clamp-4 flex-1">
                            {entry.content}
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-brand-green font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Read & Edit &rarr;
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  // Detail / Edit View
  return (
      <div className="h-[calc(100vh-100px)] flex flex-col animate-in slide-in-from-right-10 duration-300">
          <div className="flex items-center gap-4 mb-6">
              <button onClick={handleBackToList} className="p-2 hover:bg-white/10 rounded-lg text-brand-muted hover:text-white transition-colors">
                  <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold text-white">{isNew ? 'New Entry' : 'Edit Entry'}</h2>
              <div className="flex-1"></div>
              <button onClick={handleSubmit} className="bg-brand-green text-black px-6 py-2 rounded-lg font-bold hover:bg-[#00b004] transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save
              </button>
          </div>

          <div className="flex-1 bg-brand-card rounded-xl border border-white/5 overflow-hidden flex flex-col max-w-4xl mx-auto w-full shadow-2xl">
              {/* Toolbar */}
              <div className="bg-white/[0.02] border-b border-white/5 p-2 flex items-center gap-2">
                  <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
                  <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-2 rounded hover:bg-white/10 text-brand-muted hover:text-white" title="Bold">
                      <Bold className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-2 rounded hover:bg-white/10 text-brand-muted hover:text-white" title="Italic">
                      <Italic className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
                  <button type="button" onClick={() => insertMarkdown('# ')} className="p-2 rounded hover:bg-white/10 text-brand-muted hover:text-white" title="Header 1">
                      <Type className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => insertMarkdown('## ')} className="p-2 rounded hover:bg-white/10 text-brand-muted hover:text-white" title="Header 2">
                      <Type className="w-3 h-3" />
                  </button>
                  <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
                  <button type="button" onClick={() => insertMarkdown('\n- ')} className="p-2 rounded hover:bg-white/10 text-brand-muted hover:text-white" title="List">
                      <List className="w-4 h-4" />
                  </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                  <input 
                      type="text" 
                      placeholder="Title your thoughts..."
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-transparent text-3xl font-bold text-white placeholder-white/20 outline-none mb-6"
                  />
                  <textarea 
                      id="journal-content"
                      placeholder="Start writing..." 
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      className="w-full h-[calc(100%-80px)] bg-transparent text-lg text-brand-muted placeholder-white/10 outline-none resize-none font-sans leading-relaxed"
                  />
              </div>
          </div>
      </div>
  );
};

export default Journal;