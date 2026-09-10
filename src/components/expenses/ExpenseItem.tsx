import { format } from 'date-fns';
import { getCategoryById } from '@/lib/categories';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeleteExpense, type Expense } from '@/hooks/useExpenses';
import { toast } from 'sonner';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
}

const ExpenseItem = ({ expense, onEdit }: ExpenseItemProps) => {
  const category = getCategoryById(expense.category);
  const Icon = category.icon;
  const deleteExpense = useDeleteExpense();

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  return (
    <div className="glass-card p-4 flex items-center gap-4 group hover:border-primary/20 transition-colors">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${category.color}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{expense.note || category.label}</p>
        <p className="text-xs text-muted-foreground">
          {category.label} · {format(new Date(expense.expense_date), 'MMM d, yyyy')}
          {expense.edited_at && (
            <span className="ml-1 text-[10px] opacity-70 italic">
              (Edited {format(new Date(expense.edited_at), 'MMM d')})
            </span>
          )}
        </p>
      </div>

      <p className="font-mono-num font-bold text-base shrink-0">
        ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>

      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button aria-label={`Edit ${expense.note || category.label}`} variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button aria-label={`Delete ${expense.note || category.label}`} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete expense?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this ₹{Number(expense.amount).toLocaleString('en-IN')} expense. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ExpenseItem;
