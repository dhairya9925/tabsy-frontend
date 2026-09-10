import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { roundMoney, splitEqual, formatMoney } from '@/utils/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategorySelect } from '../expenses/CategorySelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/useCategories';
import { getGroupTypeConfig } from '@/lib/groupTypes';
import { useAddGroupExpense, useUpdateGroupExpense, type GroupExpense } from '@/hooks/useGroupExpenses';
import { GroupMember } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  groupId: string;
  members: GroupMember[];
  groupType: string;
  expense?: GroupExpense; // Added for editing
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  inline?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const GroupExpenseForm = ({ groupId, members, groupType, expense, onOpenChange, trigger, inline, onSuccess, onCancel }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const addExpense = useAddGroupExpense();
  const updateExpense = useUpdateGroupExpense();
  const [open, setOpen] = useState(false);

  const isEditing = !!expense;
  const config = getGroupTypeConfig(groupType || 'day_to_day');

  // Detect if an existing expense's splits are equal (all within 1 cent of each other)
  const detectSplitType = (splits: typeof expense['splits']): 'equal' | 'custom' => {
    if (!splits || splits.length === 0) return 'equal';
    const amounts = splits.map(s => s.amount);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    return (max - min) <= 0.01 ? 'equal' : 'custom';
  };

  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const defaultCategory = config.suggestedCategories[0] || 'other';
  const [category, setCategory] = useState(expense?.category || defaultCategory);
  const [note, setNote] = useState(expense?.note || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>(
    detectSplitType(expense?.splits)
  );
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(expense?.splits?.map(s => s.user_id) || members.map(m => m.user_id))
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    expense?.splits?.reduce((acc, s) => ({ ...acc, [s.user_id]: s.amount.toString() }), {}) || {}
  );

  // For dialog mode: initialize form values ONLY when it opens or expense changes
  useEffect(() => {
    if (!inline && open) {
      setAmount(expense?.amount.toString() || '');
      setCategory(expense?.category || defaultCategory);
      setNote(expense?.note || '');
      setSplitType(detectSplitType(expense?.splits));
      setSelectedMembers(new Set(expense?.splits?.map(s => s.user_id) || members.map(m => m.user_id)));
      setCustomAmounts(expense?.splits?.reduce((acc, s) => ({ ...acc, [s.user_id]: s.amount.toString() }), {}) || {});
    }
  }, [open, expense, members, inline, defaultCategory]);
  // }, [open]);

  // For inline mode: initialize selectedMembers once when members first load
  const membersInitialized = useRef(false);
  useEffect(() => {
    if (inline && !membersInitialized.current && members.length > 0) {
      membersInitialized.current = true;
      setSelectedMembers(new Set(members.map(m => m.user_id)));
    }
  }, [members, inline]);


  const resetForm = () => {
    setAmount('');
    setCategory(defaultCategory);
    setNote('');
    // setReceiptUrl('');
    setSplitType('equal');
    setSelectedMembers(new Set(members.map(m => m.user_id)));
    setCustomAmounts({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(amount);
    if (!total || total <= 0) return;

    let splits: { user_id: string; amount: number }[];

    if (splitType === 'equal') {
      const selected = Array.from(selectedMembers);
      if (selected.length === 0) {
        toast({ title: 'Select at least one member', variant: 'destructive' });
        return;
      }
      const amounts = splitEqual(total, selected.length);
      splits = selected.map((uid, i) => ({ user_id: uid, amount: amounts[i] }));
    } else {
      splits = members
        .filter(m => customAmounts[m.user_id] && parseFloat(customAmounts[m.user_id]) > 0)
        .map(m => ({ user_id: m.user_id, amount: parseFloat(customAmounts[m.user_id]) }));

      const splitTotal = splits.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(roundMoney(splitTotal - total)) > 0.02) {
        toast({
          title: 'Split amounts don\'t match total',
          description: `Total: ₹${total.toFixed(2)}, Splits: ₹${splitTotal.toFixed(2)}`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      if (isEditing && expense) {
        await updateExpense.mutateAsync({
          expenseId: expense.id,
          groupId,
          amount: total,
          category,
          note,
          splits
        });
        toast({ title: 'Expense updated!' });
      } else {
        await addExpense.mutateAsync({
          groupId,
          amount: total,
          category,
          note,
          splits
        });
        toast({ title: 'Expense added!' });
      }
      resetForm();
      if (inline) {
        onSuccess?.();
      } else {
        setOpen(false);
        onOpenChange?.(false);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleMember = (userId: string) => {
    const next = new Set(selectedMembers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedMembers(next);
  };

  const getMemberName = (member: GroupMember) =>
    member.profile?.display_name || member.profile?.email || 'Unknown';

  const equalShare = selectedMembers.size > 0 && amount
    ? formatMoney(parseFloat(amount) / selectedMembers.size)
    : '0.00';

  // return (
  //   <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v); if (v && !isEditing) resetForm(); }}>
  //     <DialogTrigger asChild>
  //       {trigger || (
  //         <Button size="sm">
  //           <Plus className="h-4 w-4 mr-1" /> Add Expense
  //         </Button>
  //       )}
  //     </DialogTrigger>
  //     <DialogContent className="max-h-[85vh] overflow-y-auto w-[95vw] max-w-lg p-4 sm:p-6">
  //       <DialogHeader>
  //         <DialogTitle>{isEditing ? 'Edit Group Expense' : 'Add Group Expense'}</DialogTitle>
  //       </DialogHeader>
  //       <form onSubmit={handleSubmit} className="space-y-4">
  //         <div className="grid grid-cols-2 gap-3">
  //           <div className="space-y-2">
  //             <Label>Amount</Label>
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="space-y-2">
        <Label className="text-sm">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">₹</span>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="h-11 pl-7 text-base"
          />
        </div>
      </div>

      <CategorySelect 
        value={category} 
        onValueChange={setCategory} 
        suggestedCategories={getGroupTypeConfig(groupType || 'day_to_day').suggestedCategories}
      />

      <div className="space-y-2">
        <Label className="text-sm">Note (optional)</Label>
        <Input className="h-11" value={note} onChange={e => setNote(e.target.value)} placeholder="What was this for?" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Split Type</Label>
        <Select value={splitType} onValueChange={v => setSplitType(v as 'equal' | 'custom')}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="equal">Split Equally</SelectItem>
            <SelectItem value="custom">Custom Amounts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {splitType === 'equal' ? (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Select who to split with ({equalShare} each)
          </Label>
          <div className="space-y-2">
            {members.map(member => (
              <label
                key={member.user_id}
                className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedMembers.has(member.user_id)}
                  onCheckedChange={() => toggleMember(member.user_id)}
                />
                <span className="text-sm text-foreground">
                  {getMemberName(member)}
                  {member.user_id === user?.id && ' (you)'}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Enter amount for each member</Label>
          {members.map(member => (
            <div key={member.user_id} className="flex items-center gap-2">
              <span className="text-sm text-foreground flex-1 truncate">
                {getMemberName(member)}
                {member.user_id === user?.id && ' (you)'}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="w-24"
                value={customAmounts[member.user_id] || ''}
                onChange={e => setCustomAmounts(prev => ({ ...prev, [member.user_id]: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
      )}

      {inline ? (
        <div className="flex gap-2 justify-end pt-3">
          {onCancel && <Button type="button" variant="outline" className="h-10 px-5" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" className="h-10 px-5" disabled={addExpense.isPending || updateExpense.isPending}>
            {addExpense.isPending || updateExpense.isPending
              ? (isEditing ? 'Updating...' : 'Adding...')
              : (isEditing ? 'Update Expense' : 'Add Expense')}
          </Button>
        </div>
      ) : (
        <Button type="submit" className="mt-4 h-10 w-full" disabled={addExpense.isPending || updateExpense.isPending}>
          {addExpense.isPending || updateExpense.isPending
            ? (isEditing ? 'Updating...' : 'Adding...')
            : (isEditing ? 'Update Expense' : 'Add Expense')}
        </Button>
      )}
    </form>
  );

  // <div className="space-y-2">
  //   <Label>Receipt URL (optional)</Label>
  // </div>

  // <div className="space-y-2">
  //   <Label>Split Type</Label>
  //   <Select value={splitType} onValueChange={v => setSplitType(v as 'equal' | 'custom')}>
  //     <SelectTrigger><SelectValue /></SelectTrigger>
  //     <SelectContent>
  //       <SelectItem value="equal">Split Equally</SelectItem>
  //       <SelectItem value="custom">Custom Amounts</SelectItem>
  //     </SelectContent>
  //   </Select>
  // </div>

  // {splitType === 'equal' ? (
  //   <div className="space-y-2">
  //     <Label className="text-sm text-muted-foreground">
  //       Select who to split with ({equalShare} each)
  //     </Label>
  //     <div className="space-y-2">
  //       {members.map(member => (
  //         <label
  //           key={member.user_id}
  //           className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 cursor-pointer"
  //         >
  //           <Checkbox
  //             checked={selectedMembers.has(member.user_id)}
  //             onCheckedChange={() => toggleMember(member.user_id)}
  //           />
  //           <span className="text-sm text-foreground">
  //             {getMemberName(member)}
  //             {member.user_id === user?.id && ' (you)'}
  //           </span>
  //         </label>
  //       ))}
  //     </div>
  //   </div>
  // ) : (
  //   <div className="space-y-2">
  //     <Label className="text-sm text-muted-foreground">Enter amount for each member</Label>
  //     {members.map(member => (
  //       <div key={member.user_id} className="flex items-center gap-2">
  //         <span className="text-sm text-foreground flex-1 truncate">
  //           {getMemberName(member)}
  //           {member.user_id === user?.id && ' (you)'}
  //         </span>
  //         <Input
  //           type="number"
  //           step="0.01"
  //           min="0"
  //           className="w-24"
  //           value={customAmounts[member.user_id] || ''}
  //           onChange={e => setCustomAmounts(prev => ({ ...prev, [member.user_id]: e.target.value }))}
  //           placeholder="0.00"
  //         />
  //       </div>
  //     ))}
  //   </div>
  // )}

  // <Button type="submit" className="w-full" disabled={addExpense.isPending || updateExpense.isPending}>
  //   {addExpense.isPending || updateExpense.isPending
  //     ? (isEditing ? 'Updating...' : 'Adding...')
  //     : (isEditing ? 'Update Expense' : 'Add Expense')}
  if (inline) {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v); if (v && !isEditing) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto w-[94vw] max-w-[25rem] p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Group Expense' : 'Add Group Expense'}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default GroupExpenseForm;
