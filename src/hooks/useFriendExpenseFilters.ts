import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { FriendExpenseFeedItem } from '@/lib/friendExpensesApi';

export interface FilterOption {
  label: string;
  value: string;
}

export type FriendPresetFilter = 'all_time' | 'current_month' | 'this_year' | 'last_3_months' | 'custom';

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

export function useFriendExpenseFilters(
  expenses: FriendExpenseFeedItem[] | undefined,
  currentUserId: string | undefined,
  friendName: string
) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all'); // 'all' | 'me' | 'them'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<FriendPresetFilter>('all_time');

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

  // Derived: month options (if a specific year is selected, only show months that exist)
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

  // Payer Options
  const payerOptions: FilterOption[] = [
    { label: 'All Payers', value: 'all' },
    { label: 'Paid by You', value: 'me' },
    { label: `Paid by ${friendName.split(' ')[0]}`, value: 'them' },
  ];

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    const ninetyDaysAgo = subDays(today, 90).toISOString().split('T')[0];

    return (expenses ?? []).filter(e => {
      const expDate = e.expense_date || '';
      const expYear = expDate.slice(0, 4);
      const expMonth = expDate.slice(5, 7);
      const isMePayer = e.paid_by === currentUserId;

      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = (e.note || '').toLowerCase().includes(query);
        const categoryMatch = e.category.toLowerCase().includes(query);
        if (!noteMatch && !categoryMatch) return false;
      }

      // Handle Preset 'last_3_months'
      if (activePreset === 'last_3_months') {
        const isRecent = expDate >= ninetyDaysAgo;
        const payerMatch =
          selectedPayer === 'all' ||
          (selectedPayer === 'me' && isMePayer) ||
          (selectedPayer === 'them' && !isMePayer);
        return isRecent && payerMatch;
      }

      const yearMatch = selectedYear === 'all' || expYear === selectedYear;
      const monthMatch = selectedMonth === 'all' || expMonth === selectedMonth;
      const payerMatch =
        selectedPayer === 'all' ||
        (selectedPayer === 'me' && isMePayer) ||
        (selectedPayer === 'them' && !isMePayer);

      return yearMatch && monthMatch && payerMatch;
    });
  }, [expenses, currentUserId, selectedYear, selectedMonth, selectedPayer, searchQuery, activePreset]);

  // Filtered total calculation (excluding payments)
  const filteredTotal = useMemo(() => {
    return filteredExpenses
      .filter(e => e.category !== 'payment')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Preset Applicator
  const applyPreset = (preset: FriendPresetFilter) => {
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
      setSelectedPayer('all');
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

  const handlePayerChange = (payer: string) => {
    setSelectedPayer(payer);
    setActivePreset('custom');
  };

  const clearFilters = () => {
    applyPreset('all_time');
  };

  const isFiltered =
    selectedYear !== 'all' ||
    selectedMonth !== 'all' ||
    selectedPayer !== 'all' ||
    searchQuery.trim() !== '' ||
    activePreset !== 'all_time';

  return {
    selectedYear,
    setSelectedYear: handleYearChange,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    selectedPayer,
    setSelectedPayer: handlePayerChange,
    searchQuery,
    setSearchQuery,
    activePreset,
    applyPreset,
    yearOptions,
    monthOptions,
    payerOptions,
    filteredExpenses,
    filteredTotal,
    clearFilters,
    isFiltered,
  };
}

export default useFriendExpenseFilters;
