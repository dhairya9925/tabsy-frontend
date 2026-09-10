import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Optional array of category IDs to highlight with a star and sort to the top */
  suggestedCategories?: string[];
  /** Optional label text (defaults to 'Category') */
  label?: string;
}

export function CategorySelect({ 
  value, 
  onValueChange, 
  suggestedCategories = [],
  label = 'Category' 
}: CategorySelectProps) {
  const { categories, addCategory, customRows, isAdding } = useCategories();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const sortedCategories = useMemo(() => {
    if (suggestedCategories.length === 0) return categories;
    return [...categories].sort((a, b) => {
      const aSug = suggestedCategories.includes(a.id);
      const bSug = suggestedCategories.includes(b.id);
      if (aSug && !bSug) return -1;
      if (!aSug && bSug) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [categories, suggestedCategories]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      toast.error('Category name must be at least 2 characters');
      return;
    }
    if (customRows.length >= 20) {
      toast.error('Maximum 20 custom categories allowed');
      return;
    }

    try {
      await addCategory(trimmed);
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      onValueChange(slug);
      setShowAdd(false);
      setNewName('');
      toast.success(`Category "${trimmed}" added!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add category');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center h-5">
        <Label className="text-sm">{label}</Label>
        {!showAdd && (
          <button 
            type="button"
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity" 
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3 w-3" /> New
          </button>
        )}
      </div>
      
      {!showAdd ? (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Select Category" /></SelectTrigger>
          <SelectContent>
            {sortedCategories.map(c => {
              const isSuggested = suggestedCategories.includes(c.id);
              return (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    {isSuggested ? (
                      <span className="font-semibold">{c.label} ★</span>
                    ) : (
                      c.label
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
          <Input 
            value={newName} 
            onChange={e => setNewName(e.target.value)}
            placeholder="Category name..."
            className="h-11 bg-secondary/50 flex-1 min-w-0"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === 'Escape') {
                setShowAdd(false);
              }
            }}
            maxLength={30}
          />
          <Button 
            type="button" 
            onClick={handleAdd} 
            disabled={isAdding || newName.trim().length < 2} 
            className="h-11 px-4 shrink-0"
          >
            Add
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => {
              setShowAdd(false);
              setNewName('');
            }} 
            className="h-11 px-3 shrink-0"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
