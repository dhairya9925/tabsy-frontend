import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { roundMoney } from '@/utils/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateFriendExpense } from '@/hooks/useFriendExpenses';
import type { FriendExpenseFeedItem } from '@/lib/friendExpensesApi';
import { CategorySelect } from '../expenses/CategorySelect';

interface Props {
    friendId: string;
    friendName: string;
    expense?: FriendExpenseFeedItem; // for edit mode
    trigger?: React.ReactNode;
    inline?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const FriendExpenseForm = ({ friendId, friendName, expense, trigger, inline, onSuccess, onCancel }: Props) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const updateExpense = useUpdateFriendExpense();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = !!expense;

    // Derive initial paidBy from expense
    const initialPaidBy = (): 'me' | 'them' => {
        if (!expense) return 'me';
        return expense.paid_by === user?.id ? 'me' : 'them';
    };

    // Derive initial splitType from splits: equal if both splits are equal (or near equal), full otherwise
    const initialSplitType = (): 'equal' | 'full' => {
        if (!expense) return 'equal';
        const splits = expense.expense_splits;
        if (splits.length < 2) return 'equal';
        const min = Math.min(...splits.map(s => s.amount));
        const max = Math.max(...splits.map(s => s.amount));
        return (max - min) <= 0.01 ? 'equal' : 'full';
    };

    const [amount, setAmount] = useState(expense?.amount.toString() || '');
    const [category, setCategory] = useState(expense?.category || 'food');
    const [note, setNote] = useState(expense?.note || '');
    const [date, setDate] = useState<Date>(expense ? parseISO(expense.expense_date) : new Date());
    const [paidBy, setPaidBy] = useState<'me' | 'them'>(initialPaidBy());
    const [splitType, setSplitType] = useState<'equal' | 'full'>(initialSplitType());

    // Re-initialize when dialog opens in edit mode
    useEffect(() => {
        if (!inline && open && expense) {
            setAmount(expense.amount.toString());
            setCategory(expense.category);
            setNote(expense.note || '');
            setDate(parseISO(expense.expense_date));
            setPaidBy(expense.paid_by === user?.id ? 'me' : 'them');
            setSplitType(initialSplitType());
        }
    }, [open, expense]);

    const resetForm = () => {
        setAmount('');
        setCategory('food');
        setNote('');
        setDate(new Date());
        setPaidBy('me');
        setSplitType('equal');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const total = parseFloat(amount);
        if (!total || total <= 0) return;

        setIsSubmitting(true);

        try {
            if (isEditing && expense) {
                await updateExpense.mutateAsync({
                    expenseId: expense.id,
                    friendId,
                    amount: total,
                    category,
                    note,
                    expense_date: format(date, 'yyyy-MM-dd'),
                    paidBy,
                    splitType,
                });
                toast({ title: 'Expense updated!' });
            } else {
                const payerId = paidBy === 'me' ? user.id : friendId;
                const res = await apiClient.post(`/api/v1/friends/${friendId}/expenses`, {
                    amount: total,
                    category,
                    note: note || undefined,
                    expense_date: format(date, "yyyy-MM-dd"),
                    paid_by: payerId,
                    split_type: splitType,
                });

                if (res.error) throw new Error(res.error);

                toast({ title: 'Expense added!' });
                queryClient.invalidateQueries({ queryKey: ["friend-balances", user?.id] });
                queryClient.invalidateQueries({ queryKey: ["friend-expenses", user?.id, friendId] });
                queryClient.invalidateQueries({ queryKey: ["dashboard_data"] });
            }

            if (!isEditing) resetForm();
            if (inline) {
                onSuccess?.();
            } else {
                setOpen(false);
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-3 pb-1 text-sm font-medium">
                <Label>Who paid?</Label>
                <Select value={paidBy} onValueChange={v => setPaidBy(v as 'me' | 'them')}>
                    <SelectTrigger className="h-10 w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="me">You</SelectItem>
                        <SelectItem value="them">{friendName}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

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
                            onChange={e => setAmount(e.target.value)}
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

            <CategorySelect value={category} onValueChange={setCategory} />

            <div className="space-y-2">
                <Label className="text-sm">Note / Description</Label>
                <Input className="h-11" value={note} onChange={e => setNote(e.target.value)} placeholder="Dinner, cab..." />
            </div>

            <div className="space-y-2 pt-1">
                <Label className="text-sm">How to split</Label>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={splitType === 'equal' ? 'default' : 'outline'}
                        className="h-10 flex-1 text-sm"
                        onClick={() => setSplitType('equal')}
                    >
                        Split Equally
                    </Button>
                    <Button
                        type="button"
                        variant={splitType === 'full' ? 'default' : 'outline'}
                        className="h-10 flex-1 text-sm"
                        onClick={() => setSplitType('full')}
                    >
                        {paidBy === 'me' ? 'They owe full' : 'You owe full'}
                    </Button>
                </div>
            </div>

            {inline ? (
                <div className="flex gap-2 justify-end pt-3">
                    {onCancel && <Button type="button" variant="outline" className="h-10 px-5" onClick={onCancel}>Cancel</Button>}
                    <Button type="submit" className="h-10 px-5" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update Expense' : 'Save Expense')}
                    </Button>
                </div>
            ) : (
                <Button type="submit" className="mt-4 h-10 w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (isEditing ? 'Update Expense' : 'Save Expense')}
                </Button>
            )}
        </form>
    );

    if (inline) {
        return formContent;
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !isEditing) resetForm(); }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" /> Add Expense
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto w-[94vw] max-w-[25rem] p-4 sm:p-5">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Expense' : 'Add 1-on-1 Expense'}</DialogTitle>
                </DialogHeader>
                {formContent}
            </DialogContent>
        </Dialog>
    );
};

export default FriendExpenseForm;
