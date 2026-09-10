import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Sparkles, Calendar, X, TrendingUp, TrendingDown, Minus, ArrowUpDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExpenses, type Expense } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { getCategoryById } from '@/lib/categories';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import GroupedPersonalExpenseList from '@/components/expenses/GroupedPersonalExpenseList';
import { PersonalMonthlyTrendChart } from '@/components/expenses/PersonalMonthlyTrendChart';
import { exportPersonalExpensesToExcel } from '@/lib/exportPersonalExpenses';
import { format, subDays } from 'date-fns';
import { sumMoney, roundMoney } from '@/utils/money';

export type PersonalPresetFilter = 'current_month' | 'this_year' | 'last_90_days' | 'all_time' | 'custom';
export type SortOrderOption = 'newest_first' | 'oldest_first' | 'highest_first' | 'lowest_first';

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const SORT_OPTIONS: { value: SortOrderOption; label: string }[] = [
  { value: 'newest_first', label: 'Newest First' },
  { value: 'oldest_first', label: 'Oldest First' },
  { value: 'highest_first', label: 'Highest Amount' },
  { value: 'lowest_first', label: 'Lowest Amount' },
];

const Expenses = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Amount Range Filters
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');

  // Sort Order Filter
  const [sortOrder, setSortOrder] = useState<SortOrderOption>('newest_first');

  // Date Filters
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<string>(format(now, 'yyyy'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(now, 'MM'));
  const [activePreset, setActivePreset] = useState<PersonalPresetFilter>('current_month');

  // Fetch ALL personal expenses once — all filtering is client-side
  const { data: allExpenses, isLoading, isError, refetch } = useExpenses();

  const { categories } = useCategories();

  // Year options derived from expenses
  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    (allExpenses ?? []).forEach(e => {
      if (e.expense_date && e.expense_date.length >= 4) {
        set.add(e.expense_date.slice(0, 4));
      }
    });
    set.add(format(now, 'yyyy'));
    const sorted = Array.from(set).sort().reverse();
    return [{ label: 'All Years', value: 'all' }, ...sorted.map(y => ({ label: y, value: y }))];
  }, [allExpenses]);

  // Month options derived from expenses
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    (allExpenses ?? []).forEach(e => {
      if (e.expense_date && e.expense_date.length >= 7) {
        const y = e.expense_date.slice(0, 4);
        const m = e.expense_date.slice(5, 7);
        if (selectedYear === 'all' || y === selectedYear) {
          set.add(m);
        }
      }
    });
    return [
      { label: 'All Months', value: 'all' },
      ...MONTH_NAMES.filter(m => selectedYear === 'all' || set.has(m.value)),
    ];
  }, [allExpenses, selectedYear]);

  // Filtered and Sorted expenses — 100% client-side
  const filteredExpenses = useMemo(() => {
    const ninetyDaysAgo = subDays(now, 90).toISOString().split('T')[0];
    const q = search.trim().toLowerCase();
    const minVal = amountMin !== '' ? parseFloat(amountMin) : null;
    const maxVal = amountMax !== '' ? parseFloat(amountMax) : null;

    const filtered = (allExpenses ?? []).filter(e => {
      const expDate = e.expense_date || '';
      const expYear = expDate.slice(0, 4);
      const expMonth = expDate.slice(5, 7);

      // Search: match note, category label, or amount
      if (q) {
        const categoryLabel = getCategoryById(e.category).label.toLowerCase();
        const noteMatch = (e.note || '').toLowerCase().includes(q);
        const categoryMatch = categoryLabel.includes(q) || e.category.toLowerCase().includes(q);
        const amountMatch = String(e.amount).includes(q);
        if (!noteMatch && !categoryMatch && !amountMatch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      // Amount Range Filter
      if (minVal !== null && !isNaN(minVal) && e.amount < minVal) return false;
      if (maxVal !== null && !isNaN(maxVal) && e.amount > maxVal) return false;

      // Preset-based date filters
      if (activePreset === 'last_90_days') return expDate >= ninetyDaysAgo;

      const yearMatch = selectedYear === 'all' || expYear === selectedYear;
      const monthMatch = selectedMonth === 'all' || expMonth === selectedMonth;
      return yearMatch && monthMatch;
    });

    // Apply Sorting
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'highest_first') return b.amount - a.amount;
      if (sortOrder === 'lowest_first') return a.amount - b.amount;
      if (sortOrder === 'oldest_first') return (a.expense_date || '').localeCompare(b.expense_date || '');
      return (b.expense_date || '').localeCompare(a.expense_date || ''); // newest_first default
    });
  }, [allExpenses, search, categoryFilter, amountMin, amountMax, selectedYear, selectedMonth, activePreset, sortOrder]);

  // Summary stats for the filtered period
  const total = useMemo(
    () => sumMoney(filteredExpenses.map(e => Number(e.amount))),
    [filteredExpenses]
  );

  const avgExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    return roundMoney(total / filteredExpenses.length);
  }, [total, filteredExpenses]);

  // Top category by total spend
  const topCategory = useMemo(() => {
    const catMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + Number(e.amount));
    });
    if (!catMap.size) return null;
    const [topId, topAmt] = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];
    return { label: getCategoryById(topId).label, amount: roundMoney(topAmt) };
  }, [filteredExpenses]);

  // Month-over-month comparison
  const monthOverMonthChange = useMemo(() => {
    if (selectedMonth === 'all' || selectedYear === 'all') return null;
    const currentMonthNum = parseInt(selectedMonth, 10);
    const currentYearNum = parseInt(selectedYear, 10);

    const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const prevYearNum = currentMonthNum === 1 ? currentYearNum - 1 : currentYearNum;
    const prevMonthStr = String(prevMonthNum).padStart(2, '0');
    const prevYearStr = String(prevYearNum);

    const prevTotal = sumMoney(
      (allExpenses ?? [])
        .filter(e => {
          const y = e.expense_date?.slice(0, 4);
          const m = e.expense_date?.slice(5, 7);
          return y === prevYearStr && m === prevMonthStr && (categoryFilter === 'all' || e.category === categoryFilter);
        })
        .map(e => Number(e.amount))
    );

    if (prevTotal === 0) return null;
    const pct = Math.round(((total - prevTotal) / prevTotal) * 100);
    return { pct, prevTotal };
  }, [allExpenses, total, selectedYear, selectedMonth, categoryFilter]);

  const applyPreset = (preset: PersonalPresetFilter) => {
    setActivePreset(preset);
    const currentYearStr = format(now, 'yyyy');
    const currentMonthStr = format(now, 'MM');

    if (preset === 'current_month') {
      setSelectedYear(currentYearStr);
      setSelectedMonth(currentMonthStr);
    } else if (preset === 'this_year') {
      setSelectedYear(currentYearStr);
      setSelectedMonth('all');
    } else if (preset === 'last_90_days') {
      setSelectedYear('all');
      setSelectedMonth('all');
    } else if (preset === 'all_time') {
      setSelectedYear('all');
      setSelectedMonth('all');
      setCategoryFilter('all');
      setSearch('');
      setAmountMin('');
      setAmountMax('');
      setSortOrder('newest_first');
    }
  };

  const handleYearChange = (y: string) => {
    setSelectedYear(y);
    setActivePreset('custom');
  };

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    setActivePreset('custom');
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const isFiltered =
    selectedYear !== 'all' ||
    selectedMonth !== 'all' ||
    categoryFilter !== 'all' ||
    search.trim() !== '' ||
    amountMin !== '' ||
    amountMax !== '' ||
    sortOrder !== 'newest_first' ||
    activePreset !== 'all_time';

  const resetAllFilters = () => {
    applyPreset('all_time');
  };

  // Context-aware empty state label
  const emptyStateMessage = useMemo(() => {
    if (!isFiltered) return { title: 'No personal expenses yet.', sub: 'Add your first expense to start tracking!' };
    if (activePreset === 'current_month' || (selectedMonth !== 'all')) {
      const monthLabel = selectedMonth !== 'all'
        ? `${MONTH_NAMES.find(m => m.value === selectedMonth)?.label ?? ''} ${selectedYear !== 'all' ? selectedYear : ''}`
        : format(now, 'MMMM yyyy');
      return { title: `Nothing logged yet for ${monthLabel.trim()}.`, sub: 'Try a different period or clear your filters.' };
    }
    return { title: 'No expenses match your filters.', sub: 'Try adjusting or clearing your active filters.' };
  }, [isFiltered, activePreset, selectedMonth, selectedYear]);

  return (
    <div className="animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="section-header mb-1">Personal</p>
          <h1 className="text-3xl font-bold">Expenses</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!filteredExpenses || filteredExpenses.length === 0}
            onClick={() => {
              const label = selectedMonth !== 'all'
                ? `${selectedYear}_${selectedMonth}`
                : selectedYear !== 'all'
                ? selectedYear
                : 'All_Time';
              exportPersonalExpensesToExcel(filteredExpenses, label);
            }}
            className="gap-2 text-xs"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={() => { setEditingExpense(null); setFormOpen(true); }} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Enhanced Summary card */}
      <div className="glass-card glass-glow p-5 mb-6 space-y-3">
        {/* Top row: total + trend */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total for selected period</p>
            <p className="font-mono-num text-3xl font-bold text-primary">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Month-over-month trend chip */}
          {monthOverMonthChange !== null && filteredExpenses.length > 0 && (
            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              monthOverMonthChange.pct > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                : monthOverMonthChange.pct < 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-muted border-border text-muted-foreground'
            }`}>
              {monthOverMonthChange.pct > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : monthOverMonthChange.pct < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {monthOverMonthChange.pct > 0 ? '+' : ''}{monthOverMonthChange.pct}% vs last month
            </div>
          )}
        </div>

        {/* Bottom row: quick insights */}
        {filteredExpenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-border/40 text-xs text-muted-foreground">
            {topCategory && (
              <span>
                📊 Top: <strong className="text-foreground font-semibold">{topCategory.label}</strong>{' '}
                ₹{topCategory.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            )}
            <span>
              📈 Avg: <strong className="text-foreground font-semibold">₹{avgExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> / expense
            </span>
          </div>
        )}
      </div>

      {/* Spending Trend Chart */}
      <PersonalMonthlyTrendChart
        expenses={allExpenses ?? []}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onSelectMonth={(month, year) => {
          setSelectedYear(year);
          setSelectedMonth(month);
          setActivePreset('custom');
        }}
        className="mb-6"
      />

      {/* Filter Control Box */}
      <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 space-y-3 mb-6">
        {/* Quick Preset Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 mr-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Quick:
          </div>
          {[
            { id: 'current_month', label: 'Current Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'last_90_days', label: 'Last 90 Days' },
            { id: 'all_time', label: 'All Time' },
          ].map(p => {
            const isActive = activePreset === p.id;
            return (
              <Badge
                key={p.id}
                variant={isActive ? 'default' : 'outline'}
                className={`cursor-pointer text-[11px] px-2.5 py-0.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                    : 'bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/60'
                }`}
                onClick={() => applyPreset(p.id as PersonalPresetFilter)}
              >
                {p.label}
              </Badge>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes, categories, or amounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80 border-border/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setActivePreset('custom'); }}>
            <SelectTrigger className="h-9 text-xs bg-background/80">
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Dropdown */}
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="h-9 text-xs bg-background/80">
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Year" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Dropdown */}
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-9 text-xs bg-background/80">
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Month" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Order Dropdown */}
          <Select value={sortOrder} onValueChange={v => { setSortOrder(v as SortOrderOption); setActivePreset('custom'); }}>
            <SelectTrigger className="h-9 text-xs bg-background/80">
              <div className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Range Filter Inputs */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">Amount (₹):</span>
          <Input
            type="number"
            placeholder="Min ₹"
            value={amountMin}
            onChange={e => { setAmountMin(e.target.value); setActivePreset('custom'); }}
            className="h-8 text-xs bg-background/80 border-border/50 w-full"
          />
          <span className="text-xs text-muted-foreground text-center">to</span>
          <Input
            type="number"
            placeholder="Max ₹"
            value={amountMax}
            onChange={e => { setAmountMax(e.target.value); setActivePreset('custom'); }}
            className="h-8 text-xs bg-background/80 border-border/50 w-full"
          />
        </div>

        {/* Summary + Reset */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
            <span>
              Showing <strong className="text-foreground font-medium">{filteredExpenses.length}</strong> of{' '}
              <strong className="text-foreground font-medium">{(allExpenses ?? []).length}</strong> expenses
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" /> Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      {isError ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground mb-4">Failed to load expenses</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 h-[72px] animate-pulse" />
          ))}
        </div>
      ) : filteredExpenses && filteredExpenses.length > 0 ? (
        <GroupedPersonalExpenseList expenses={filteredExpenses} onEdit={handleEdit} />
      ) : (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="text-4xl">
            {!isFiltered ? '📋' : activePreset === 'current_month' || selectedMonth !== 'all' ? '📅' : '🔍'}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{emptyStateMessage.title}</p>
            <p className="text-muted-foreground text-xs mt-1">{emptyStateMessage.sub}</p>
          </div>
          {isFiltered ? (
            <Button variant="outline" size="sm" onClick={resetAllFilters} className="text-xs">
              <X className="h-3.5 w-3.5 mr-1.5" /> Clear Filters
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditingExpense(null); setFormOpen(true); }}
              className="gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first expense
            </Button>
          )}
        </div>
      )}

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />
    </div>
  );
};

export default Expenses;
