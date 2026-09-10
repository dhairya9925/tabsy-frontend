import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Save, X, Check, Receipt, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelect } from '../expenses/CategorySelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useBulkAddGroupExpenses } from '@/hooks/useGroupExpenses';
import { getGroupTypeConfig } from '@/lib/groupTypes';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { GroupMember } from '@/hooks/useGroups';
import { format, parseISO, parse, isValid } from 'date-fns';

interface Props {
  groupId: string;
  members: GroupMember[];
  groupType: string;
}

export interface DraftExpense {
  id: string; // temporary local id
  amount: string;
  category: string;
  note: string; // description
  expense_date: string;
  date_input?: string;
  paid_by: string;
  split_type: 'equal';
}

const BulkGroupExpenseForm = ({ groupId, members, groupType }: Props) => {
  const { user } = useAuth();
  const bulkAdd = useBulkAddGroupExpenses();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { categories } = useCategories();

  const config = getGroupTypeConfig(groupType);
  const defaultCategory = config.suggestedCategories[0] || 'other';

  const generateEmptyRow = (): DraftExpense => {
    const newId = Math.random().toString(36).substring(7);
    return {
      id: newId,
      amount: '',
      category: defaultCategory,
      note: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      date_input: format(new Date(), 'dd/MM/yyyy'),
      paid_by: user?.id || members[0]?.user_id || '',
      split_type: 'equal',
    };
  };

  const [drafts, setDrafts] = useState<DraftExpense[]>([generateEmptyRow()]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      const initialRow = generateEmptyRow();
      setDrafts([initialRow]);
      setExpandedId(initialRow.id);
    } else {
      setExpandedId(null);
    }
  };

  const updateDraft = (id: string, field: keyof DraftExpense, value: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeRow = (id: string) => {
    setDrafts(prev => {
      let next = prev.filter(d => d.id !== id);
      if (next.length === 0) {
        next = [generateEmptyRow()];
      }
      if (expandedId === id) {
        setExpandedId(next[next.length - 1]?.id || null);
      }
      return next;
    });
  };

  const addRow = () => {
    const newRow = generateEmptyRow();
    setDrafts(prev => [...prev, newRow]);
    setExpandedId(newRow.id);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    if (!m) return 'Unknown';
    return m.profile?.display_name || m.profile?.email || 'Unknown';
  };

  const getCategoryLabel = (id: string) => {
    return categories.find(c => c.id === id)?.label || 'Other';
  };

  const getCategoryColor = (id: string) => {
    return categories.find(c => c.id === id)?.color || 'bg-gray-500/20 text-gray-400';
  }

  const handleSubmit = async () => {
    const validDrafts = drafts.filter(d => parseFloat(d.amount) > 0 && d.note.trim() !== '');
    if (validDrafts.length === 0) return;

    // Convert to database format
    const expensesToSubmit = validDrafts.map(draft => {
      const totalAmount = parseFloat(draft.amount);
      const memberCount = members.length;
      const splitAmount = memberCount > 0 ? totalAmount / memberCount : totalAmount;

      const splits = members.map(m => ({
        user_id: m.user_id,
        amount: splitAmount,
      }));

      return {
        amount: totalAmount,
        category: draft.category,
        note: draft.note || undefined,
        expense_date: draft.expense_date,
        paid_by: draft.paid_by,
        splits: splits,
      };
    });

    try {
      await bulkAdd.mutateAsync({
        groupId,
        expenses: expensesToSubmit,
      });
      setOpen(false);
      const newRow = generateEmptyRow();
      setDrafts([newRow]);
      setExpandedId(newRow.id);
    } catch (err) {
      console.error("Bulk add failed:", err);
    }
  };

  const totalSum = drafts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const validDraftsCount = drafts.filter(d => parseFloat(d.amount) > 0 && d.note.trim() !== '').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="px-3 pl-2">
          <Plus className="h-4 w-4 mr-1" /> Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-hidden flex flex-col w-[95vw] max-w-sm sm:max-w-md p-0 bg-card border-border/50 rounded-xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Bulk Add Expenses</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-muted/10 relative">
          {drafts.map((draft, idx) => {
            const isExpanded = expandedId === draft.id;

            if (!isExpanded) {
              return (
                <div
                  key={draft.id}
                  onClick={() => setExpandedId(draft.id)}
                  className="bg-card border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-between gap-3 animate-in fade-in duration-200"
                >
                  <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
                    <div className="font-medium text-sm truncate">
                      {draft.note || <span className="text-muted-foreground italic">No description</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${getCategoryColor(draft.category)}`}>
                        {getCategoryLabel(draft.category)}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(draft.expense_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold whitespace-nowrap bg-muted/30 px-2 py-1 rounded-md text-foreground">
                    ₹{parseFloat(draft.amount) > 0 ? parseFloat(draft.amount).toFixed(2) : '0.00'}
                  </div>
                </div>
              );
            }

            return (
              <div key={draft.id} className="bg-card border border-primary/30 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-semibold uppercase text-primary/70 tracking-wider">Entry {idx + 1}</span>
                  {drafts.length > 1 && (
                    <button
                      onClick={() => removeRow(draft.id)}
                      className="text-xs text-destructive hover:text-destructive/80 font-medium"
                    >
                      Remove entry
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block text-muted-foreground">Description</Label>
                    <Input
                      placeholder="What was this for?"
                      value={draft.note}
                      onChange={(e) => updateDraft(draft.id, 'note', e.target.value)}
                      autoFocus
                      className="h-10 text-base sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs mb-1 block text-muted-foreground">Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={draft.amount}
                          onChange={(e) => updateDraft(draft.id, 'amount', e.target.value)}
                          className="pl-7 h-10 text-base sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block text-muted-foreground">Date</Label>
                      <div className="relative group">
                        <Input
                          placeholder="DD/MM/YYYY"
                          value={draft.date_input !== undefined ? draft.date_input : (draft.expense_date ? format(parseISO(draft.expense_date), 'dd/MM/yyyy') : '')}
                          className="h-10 text-base sm:text-sm pl-3 pr-10"
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9/]/g, '');
                            updateDraft(draft.id, 'date_input', val);
                            
                            if (val.length === 10) {
                              const parsed = parse(val, 'dd/MM/yyyy', new Date());
                              if (isValid(parsed)) {
                                updateDraft(draft.id, 'expense_date', format(parsed, 'yyyy-MM-dd'));
                              }
                            }
                          }}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:bg-transparent"
                            >
                              <CalendarIcon className="h-4 w-4 opacity-70 group-focus-within:opacity-100 transition-opacity" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={draft.expense_date ? parseISO(draft.expense_date) : undefined}
                              onSelect={(d) => {
                                if (d) {
                                  updateDraft(draft.id, 'expense_date', format(d, 'yyyy-MM-dd'));
                                  updateDraft(draft.id, 'date_input', format(d, 'dd/MM/yyyy'));
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="-mt-1">
                      <CategorySelect 
                        value={draft.category} 
                        onValueChange={(v) => updateDraft(draft.id, 'category', v)}
                        suggestedCategories={config.suggestedCategories}
                        label="Category"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block text-muted-foreground">Paid By</Label>
                      <Select value={draft.paid_by} onValueChange={(v) => updateDraft(draft.id, 'paid_by', v)}>
                        <SelectTrigger className="h-10 text-xs sm:text-sm px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.user_id} value={m.user_id} className="text-xs sm:text-sm">
                              {m.user_id === user?.id ? 'You' : getMemberName(m.user_id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex justify-end">
                  <Button size="sm" onClick={() => setExpandedId(null)} className="w-full">
                    Done
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            variant="ghost"
            className="w-full border border-dashed border-border/60 py-6 mt-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground inline-flex items-center justify-center rounded-xl transition-all"
            onClick={addRow}
          >
            <Plus className="h-5 w-5 mr-2 opacity-70" />
            Add another expense
          </Button>

          <div ref={bottomRef} className="h-1" />
        </div>

        <div className="p-4 border-t bg-card z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] text-center">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground mb-1 uppercase font-bold tracking-wider">Calculated Total</div>
              <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500">
                ₹{totalSum.toFixed(2)}
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={bulkAdd.isPending || validDraftsCount === 0}
              className="px-6 h-11"
            >
              {bulkAdd.isPending ? (
                "Saving..."
              ) : (
                `Submit ${validDraftsCount} ${validDraftsCount === 1 ? 'entry' : 'entries'}`
              )}
            </Button>
          </div>
          <p className="text-[11px] leading-tight text-muted-foreground bg-muted/30 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 mx-1">
            <Receipt className="w-3.5 h-3.5 opacity-60" />
            Expenses are split equally among all members. You can edit splits later.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkGroupExpenseForm;
