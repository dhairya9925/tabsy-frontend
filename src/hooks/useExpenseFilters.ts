import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { GroupExpense } from '@/hooks/useGroupExpenses';

export interface FilterOption {
  label: string;
  value: string;
}

export type PresetFilter = 'all_time' | 'current_month' | 'this_year' | 'last_3_months' | 'custom';

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

export function useExpenseFilters(expenses: GroupExpense[] | undefined) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<PresetFilter>('all_time');

  // Derived: unique years from expenses
  const yearOptions = useMemo<FilterOption[]>(() => {
    const yearsSet = new Set<string>();
    (expenses ?? []).forEach(e => {
      if (e.expense_date && e.expense_date.length >= 4) {
        yearsSet.add(e.expense_date.slice(0, 4));
      }
    });

    const sortedYears = Array.from(yearsSet).sort().reverse();
    const options: FilterOption[] = [{ label: 'All Years', value: 'all' }];
    sortedYears.forEach(year => {
      options.push({ label: year, value: year });
    });

    return options;
  }, [expenses]);

  // Derived: month options
  const monthOptions = useMemo<FilterOption[]>(() => {
    const availableMonths = new Set<string>();

    (expenses ?? []).forEach(e => {
      if (e.expense_date && e.expense_date.length >= 7) {
        const year = e.expense_date.slice(0, 4);
        const month = e.expense_date.slice(5, 7);
        if (selectedYear === 'all' || year === selectedYear) {
          availableMonths.add(month);
        }
      }
    });

    const options: FilterOption[] = [{ label: 'All Months', value: 'all' }];
    MONTH_NAMES.forEach(m => {
      if (availableMonths.has(m.value) || selectedYear === 'all') {
        options.push(m);
      }
    });

    return options;
  }, [expenses, selectedYear]);

  // Derived: unique payers
  const memberOptions = useMemo<FilterOption[]>(() => {
    const memberMap = new Map<string, string>();

    (expenses ?? []).forEach(e => {
      if (e.category !== 'system') {
        const payerId = e.paid_by || e.user_id;
        const payerName = e.payer_name || 'Unknown';
        if (payerId && !memberMap.has(payerId)) {
          memberMap.set(payerId, payerName);
        }
      }
    });

    const options: FilterOption[] = [{ label: 'All Members', value: 'all' }];
    memberMap.forEach((name, id) => {
      options.push({ label: name, value: id });
    });

    return options;
  }, [expenses]);

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    const ninetyDaysAgo = subDays(today, 90).toISOString().split('T')[0];

    return (expenses ?? []).filter(e => {
      const expDate = e.expense_date || '';
      const expYear = expDate.slice(0, 4);
      const expMonth = expDate.slice(5, 7);
      const payerId = e.paid_by || e.user_id;

      // Search Query Matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = (e.note || '').toLowerCase().includes(query);
        const categoryMatch = e.category.toLowerCase().includes(query);
        if (!noteMatch && !categoryMatch) return false;
      }

      // Category Filter Matching
      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }

      // Handle Preset 'last_3_months'
      if (activePreset === 'last_3_months') {
        const isRecent = expDate >= ninetyDaysAgo;
        const memberMatch = selectedMember === 'all' || payerId === selectedMember;
        return isRecent && memberMatch;
      }

      // System expenses: filter by year/month if selected
      if (e.category === 'system') {
        const yearMatch = selectedYear === 'all' || expYear === selectedYear;
        const monthMatch = selectedMonth === 'all' || expMonth === selectedMonth;
        return yearMatch && monthMatch;
      }

      const yearMatch = selectedYear === 'all' || expYear === selectedYear;
      const monthMatch = selectedMonth === 'all' || expMonth === selectedMonth;
      const memberMatch = selectedMember === 'all' || payerId === selectedMember;

      return yearMatch && monthMatch && memberMatch;
    });
  }, [expenses, selectedYear, selectedMonth, selectedMember, selectedCategory, searchQuery, activePreset]);

  // Total sum of non-system expenses after filtering
  const filteredTotal = useMemo(() => {
    return filteredExpenses
      .filter(e => e.category !== 'system')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Preset Applicator
  const applyPreset = (preset: PresetFilter) => {
    setActivePreset(preset);
    const now = new Date();
    const currentYearStr = format(now, 'yyyy');
    const currentMonthStr = format(now, 'MM');

    if (preset === 'current_month') {
      setSelectedYear(currentYearStr);
      setSelectedMonth(currentMonthStr);
    } else if (preset === 'this_year') {
      setSelectedYear(currentYearStr);
      setSelectedMonth('all');
    } else if (preset === 'last_3_months') {
      setSelectedYear('all');
      setSelectedMonth('all');
    } else if (preset === 'all_time') {
      setSelectedYear('all');
      setSelectedMonth('all');
      setSelectedMember('all');
      setSelectedCategory('all');
      setSearchQuery('');
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setActivePreset('custom');
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setActivePreset('custom');
  };

  const handleMemberChange = (member: string) => {
    setSelectedMember(member);
    setActivePreset('custom');
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setActivePreset('custom');
  };

  const clearFilters = () => {
    applyPreset('all_time');
  };

  const isFiltered =
    selectedYear !== 'all' ||
    selectedMonth !== 'all' ||
    selectedMember !== 'all' ||
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    activePreset !== 'all_time';

  return {
    selectedYear,
    setSelectedYear: handleYearChange,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    selectedMember,
    setSelectedMember: handleMemberChange,
    selectedCategory,
    setSelectedCategory: handleCategoryChange,
    searchQuery,
    setSearchQuery,
    activePreset,
    applyPreset,
    yearOptions,
    monthOptions,
    memberOptions,
    filteredExpenses,
    filteredTotal,
    clearFilters,
    isFiltered,
  };
}

export default useExpenseFilters;
