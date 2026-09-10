import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ExpenseItem from '@/components/expenses/ExpenseItem';
import type { Expense } from '@/hooks/useExpenses';

interface GroupedPersonalExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
}

export const GroupedPersonalExpenseList = ({
  expenses,
  onEdit,
}: GroupedPersonalExpenseListProps) => {
  // Group expenses by YYYY-MM
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    expenses.forEach(e => {
      if (e.expense_date) {
        const key = format(new Date(e.expense_date), 'yyyy-MM');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      }
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

        const monthTotal = monthExpenses.reduce(
          (sum, e) => sum + Number(e.amount),
          0
        );

        const monthDate = new Date(monthKey + '-01T00:00:00');
        const formattedMonth = format(monthDate, 'MMMM yyyy');

        return (
          <div
            key={monthKey}
            className="rounded-xl border border-border/50 bg-card/30 overflow-hidden shadow-sm"
          >
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
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 font-normal ml-1"
                >
                  {monthExpenses.length}{' '}
                  {monthExpenses.length === 1 ? 'expense' : 'expenses'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="font-mono-num font-bold text-sm text-foreground">
                  ₹{monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                {monthExpenses.map(expense => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedPersonalExpenseList;
