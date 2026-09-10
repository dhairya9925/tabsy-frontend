import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users, WalletCards } from 'lucide-react';
import { PersonalExpenseTab } from './PersonalExpenseTab';
import { FriendExpenseTab } from './FriendExpenseTab';
import { GroupExpenseTab } from './GroupExpenseTab';
import { useAddExpense, useUpdateExpense, type Expense } from '@/hooks/useExpenses';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null; // if provided, we're editing
  onSuccess?: () => void;
}

const ExpenseForm = ({ open, onOpenChange, expense, onSuccess }: ExpenseFormProps) => {
  const isEditing = !!expense;
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [category, setCategory] = useState(expense?.category || 'food');
  const [note, setNote] = useState(expense?.note || '');
  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date || format(new Date(), 'yyyy-MM-dd')
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(expense?.amount?.toString() || '');
      setCategory(expense?.category || 'food');
      setNote(expense?.note || '');
      setExpenseDate(expense?.expense_date || format(new Date(), 'yyyy-MM-dd'));
      setError('');
    }
  }, [open, expense]);

  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();
  // If editing, we just default to personal for now since the main expenses page 
  // primarily passes personal expenses to this modal.
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (open && !isEditing) {
      setActiveTab('personal');
    }
  }, [open, isEditing]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    handleClose();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 overflow-y-auto w-[94vw] max-w-[25rem] max-h-[88dvh] rounded-2xl p-4 sm:p-5">
        <DialogHeader className="mb-2 pr-8">
          <DialogTitle className="text-[1.75rem] leading-tight">{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update expense details'
              : 'Add a new expense. Choose Personal, 1-on-1, or Group.'}
          </DialogDescription>
        </DialogHeader>

        {!isEditing ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-3 grid h-10 w-full grid-cols-3">
              <TabsTrigger value="personal" className="flex items-center gap-1.5 px-2 text-xs sm:text-sm">
                <WalletCards className="h-3.5 w-3.5 shrink-0" />
                <span>Personal</span>
              </TabsTrigger>
              <TabsTrigger value="friend" className="flex items-center gap-1.5 px-2 text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>1-on-1</span>
              </TabsTrigger>
              <TabsTrigger value="group" className="flex items-center gap-1.5 px-2 text-xs sm:text-sm">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Group</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-0 outline-none">
              <PersonalExpenseTab onSuccess={handleSuccess} onCancel={handleClose} />
            </TabsContent>

            <TabsContent value="friend" className="mt-0 outline-none">
              <FriendExpenseTab onSuccess={handleSuccess} onCancel={handleClose} />
            </TabsContent>

            <TabsContent value="group" className="mt-0 outline-none">
              <GroupExpenseTab onSuccess={handleSuccess} onCancel={handleClose} />
            </TabsContent>
          </Tabs>
        ) : (
          // If editing an expense from the main screen, currently it defaults to Personal behavior 
          // as Friend/Group edits exist in their specific tabs or dialogs for now.
          <div className="mt-4">
            <PersonalExpenseTab expense={expense} onSuccess={handleSuccess} onCancel={handleClose} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseForm;
