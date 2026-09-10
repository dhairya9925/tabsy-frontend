import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Download, Pencil, Trash2, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

import { getCategoryById } from '@/lib/categories';
import { getGroupTypeConfig } from '@/lib/groupTypes';
import GroupExpenseForm from '@/components/groups/GroupExpenseForm';
import { GroupExpense } from '@/hooks/useGroupExpenses';
import { useToast } from '@/hooks/use-toast';

interface GroupedExpenseListProps {
  expenses: GroupExpense[];
  group: any;
  members: any[];
  user: any;
  onUpdateStatus: (expenseId: string, status: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const GroupedExpenseList = ({
  expenses,
  group,
  members,
  user,
  onUpdateStatus,
  onDeleteExpense,
}: GroupedExpenseListProps) => {
  const { toast } = useToast();

  // Group expenses by YYYY-MM
  const grouped = useMemo(() => {
    const map = new Map<string, GroupExpense[]>();
    expenses.forEach(e => {
      const key = format(new Date(e.expense_date), 'yyyy-MM');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [expenses]);

  // Sorted months descending (newest first)
  const sortedMonths = useMemo(
    () => Array.from(grouped.keys()).sort().reverse(),
    [grouped]
  );

  // Open newest month by default; collapse older months
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(() => {
    return new Set(sortedMonths.slice(1));
  });

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const groupType = getGroupTypeConfig(group?.type);

  return (
    <div className="space-y-4">
      {sortedMonths.map(monthKey => {
        const monthExpenses = grouped.get(monthKey) || [];
        const isCollapsed = collapsedMonths.has(monthKey);

        // Sum of non-system expenses for this month
        const monthTotal = monthExpenses
          .filter(e => e.category !== 'system')
          .reduce((sum, e) => sum + e.amount, 0);

        const monthDate = new Date(monthKey + '-01T00:00:00');
        const formattedMonth = format(monthDate, 'MMMM yyyy');

        return (
          <div key={monthKey} className="rounded-xl border border-border/50 bg-card/30 overflow-hidden shadow-sm">
            {/* Header Row */}
            <button
              type="button"
              onClick={() => toggleMonth(monthKey)}
              className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left border-l-4 border-primary"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm text-foreground uppercase tracking-wide truncate">
                  {formattedMonth}
                </span>
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-normal ml-1">
                  {monthExpenses.length} {monthExpenses.length === 1 ? 'expense' : 'expenses'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="font-mono-num font-bold text-sm text-foreground">
                  ₹{monthTotal.toFixed(2)}
                </span>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expenses List for this month */}
            {!isCollapsed && (
              <div className="p-3 space-y-2 bg-background/50">
                {monthExpenses.map(expense => {
                  if (expense.category === 'system') {
                    const dateStr = format(new Date(expense.created_at), 'MMM d');
                    return (
                      <div key={expense.id} className="flex justify-center py-2">
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/50 text-muted-foreground font-normal border-border/50"
                        >
                          <span className="font-medium mr-1">{expense.payer_name || 'Someone'}</span>{' '}
                          {expense.note}
                          <span className="ml-2 opacity-50 text-[10px]">{dateStr}</span>
                        </Badge>
                      </div>
                    );
                  }

                  const cat = getCategoryById(expense.category);
                  const Icon = cat.icon;
                  const isOwner = expense.user_id === user?.id;

                  return (
                    <Card key={expense.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${cat.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Top row: title + amount */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-foreground leading-snug">
                              {expense.note || cat.label}
                            </span>
                            <span className="font-bold text-sm text-foreground shrink-0">
                              ₹{expense.amount.toFixed(2)}
                            </span>
                          </div>

                          {/* Meta row: payer/date + status badges */}
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-muted-foreground">
                              Paid by {expense.payer_name} · {format(new Date(expense.expense_date), 'MMM d')}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {expense.edited_at && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground/70 italic"
                                >
                                  edited {format(new Date(expense.edited_at), 'MMM d')}
                                </Badge>
                              )}
                              {group.type === 'reimbursable' && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    expense.status === 'reimbursed'
                                      ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5'
                                      : expense.status === 'approved'
                                      ? 'border-blue-500/50 text-blue-500 bg-blue-500/5'
                                      : 'border-amber-500/50 text-amber-500 bg-amber-500/5'
                                  }`}
                                >
                                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Bottom row: splits + actions */}
                          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40">
                            <div className="flex flex-wrap gap-1 min-w-0">
                              {expense.splits?.map(split => (
                                <Badge key={split.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {split.member_name}: ₹{split.amount.toFixed(2)}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 ml-1">
                              {/* Reimbursable approve/reimburse */}
                              {group.type === 'reimbursable' &&
                                group.sponsor_id === user?.id &&
                                expense.status !== 'reimbursed' && (
                                  <>
                                    {expense.status === 'submitted' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[10px] px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/5"
                                        onClick={() => onUpdateStatus(expense.id, 'approved')}
                                      >
                                        Approve
                                      </Button>
                                    )}
                                    {expense.status === 'approved' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[10px] px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/5"
                                        onClick={() => onUpdateStatus(expense.id, 'reimbursed')}
                                      >
                                        Reimburse
                                      </Button>
                                    )}
                                  </>
                                )}

                              {/* Edit/Delete — owner only */}
                              {isOwner && (
                                <>
                                  <GroupExpenseForm
                                    groupId={group.id}
                                    members={members || []}
                                    groupType={group?.type || 'shared'}
                                    expense={expense}
                                    trigger={
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
                                        title="Edit expense"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    }
                                  />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
                                        title="Delete expense"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete "{expense.note || cat.label}" and recalculate
                                          all balances.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => onDeleteExpense(expense.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>

                          {expense.receipt_url && (
                            <div className="mt-1.5">
                              <a
                                href={expense.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" /> View Receipt
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedExpenseList;
