import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar, Pencil, Trash2 } from 'lucide-react';

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
import FriendExpenseForm from '@/components/friends/FriendExpenseForm';
import type { FriendExpenseFeedItem } from '@/lib/friendExpensesApi';

interface GroupedFriendExpenseListProps {
  expenses: FriendExpenseFeedItem[];
  friendId: string;
  friendName: string;
  user: any;
  onDeleteExpense: (expenseId: string) => void;
}

export const GroupedFriendExpenseList = ({
  expenses,
  friendId,
  friendName,
  user,
  onDeleteExpense,
}: GroupedFriendExpenseListProps) => {
  // Group expenses by YYYY-MM
  const grouped = useMemo(() => {
    const map = new Map<string, FriendExpenseFeedItem[]>();
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

  return (
    <div className="space-y-4">
      {sortedMonths.map(monthKey => {
        const monthExpenses = grouped.get(monthKey) || [];
        const isCollapsed = collapsedMonths.has(monthKey);

        // Sum of non-payment expenses for this month
        const monthTotal = monthExpenses
          .filter(e => e.category !== 'payment')
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
                  {monthExpenses.length} {monthExpenses.length === 1 ? 'item' : 'items'}
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
                  const cat = getCategoryById(expense.category);
                  const Icon = cat.icon;
                  const isPayment = expense.category === 'payment';
                  const iPaid = expense.paid_by === user?.id;
                  const isOwner = expense.user_id === user?.id;

                  // Extract splits
                  const mySplit = expense.expense_splits.find(s => s.user_id === user?.id);
                  const theirSplit = expense.expense_splits.find(s => s.user_id === friendId);
                  const recordedByMe = expense.user_id === user?.id;

                  return (
                    <Card key={expense.id} className={`p-3 overflow-hidden ${isPayment ? 'bg-secondary/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl shrink-0 ${isPayment ? 'bg-green-500/10 text-green-500' : cat.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Top row: title + amount */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm leading-snug truncate">
                              {expense.note || (isPayment ? 'Payment' : cat.label)}
                            </span>
                            {isPayment ? (
                              <span className="text-sm font-semibold text-green-500 shrink-0">
                                {iPaid ? `You paid ₹${expense.amount.toFixed(2)}` : `They paid ₹${expense.amount.toFixed(2)}`}
                              </span>
                            ) : (
                              <span className="font-bold text-sm shrink-0">₹{expense.amount.toFixed(2)}</span>
                            )}
                          </div>

                          {/* Meta row: date + badges */}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                            </p>
                            {expense.edited_at && !isPayment && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground/70 italic h-4">
                                edited {format(new Date(expense.edited_at), 'MMM d')}
                              </Badge>
                            )}
                            {isPayment && (
                              <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0 h-4 bg-secondary/50">
                                Recorded by {recordedByMe ? 'you' : friendName.split(' ')[0]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: lent/borrowed badge + actions */}
                      {!isPayment && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                          <div>
                            {mySplit && theirSplit && (
                              <Badge variant={iPaid ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0 font-bold">
                                {iPaid ? `You lent ₹${theirSplit.amount.toFixed(2)}` : `You borrowed ₹${mySplit.amount.toFixed(2)}`}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-1.5">{iPaid ? 'You paid' : 'They paid'}</span>
                          </div>

                          {isOwner && (
                            <div className="flex items-center gap-0.5">
                              <FriendExpenseForm
                                friendId={friendId}
                                friendName={friendName}
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
                                      This will permanently delete "{expense.note || cat.label}" and recalculate your balance.
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
                            </div>
                          )}
                        </div>
                      )}
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

export default GroupedFriendExpenseList;
