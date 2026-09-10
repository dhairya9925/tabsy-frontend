import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategorySelect } from './CategorySelect';
import { useAddExpense, useUpdateExpense, type Expense } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';

export const PersonalExpenseTab = ({ 
  expense, 
  onSuccess, 
  onCancel 
}: { 
  expense?: Expense | null, 
  onSuccess: () => void, 
  onCancel: () => void 
}) => {
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [category, setCategory] = useState(expense?.category || 'food');
  const [note, setNote] = useState(expense?.note || '');
  const [date, setDate] = useState<Date>(expense?.expense_date ? parseISO(expense.expense_date) : new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setNote(expense.note || '');
      setDate(expense.expense_date ? parseISO(expense.expense_date) : new Date());
    }
  }, [expense]);

  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    setIsSubmitting(true);
    try {
      if (expense) {
        await updateExpense.mutateAsync({
          id: expense.id,
          amount: Number(amount),
          category,
          note,
          expense_date: format(date, "yyyy-MM-dd"),
        });
        toast({ title: 'Expense updated successfully' });
      } else {
        await addExpense.mutateAsync({
          amount: Number(amount),
          category,
          note,
          expense_date: format(date, "yyyy-MM-dd"),
        });
        toast({ title: 'Expense added successfully' });
      }
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error saving expense', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2.5">
        <div className="space-y-2">
          <Label className="text-sm">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">₹</span>
            <Input 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0.00" 
              required 
              className="h-11 pl-7 text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "h-11 w-full justify-start px-3 text-left text-sm font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{date ? format(date, "dd MMM yyyy") : "Pick a date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <CategorySelect 
        value={category} 
        onValueChange={setCategory} 
      />

      <div className="space-y-2">
        <Label className="text-sm">Note (Optional)</Label>
        <Input className="h-11" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Dinner, cab..." />
      </div>

      <div className="flex gap-2 justify-end pt-3">
        <Button type="button" variant="outline" className="h-10 px-5" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-10 px-5" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (expense ? 'Update Expense' : 'Save Expense')}
        </Button>
      </div>
    </form>
  );
};
