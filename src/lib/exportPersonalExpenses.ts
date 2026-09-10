import * as XLSX from 'xlsx';
import { Expense } from '@/hooks/useExpenses';
import { getCategoryById } from '@/lib/categories';
import { format } from 'date-fns';

export const exportPersonalExpensesToExcel = (expenses: Expense[], periodLabel: string = 'All_Time') => {
  if (!expenses || expenses.length === 0) return;

  const rows = expenses.map((e) => {
    const cat = getCategoryById(e.category);
    return {
      Date: e.expense_date ? format(new Date(e.expense_date), 'dd MMM yyyy') : '',
      Category: cat.label,
      Description: e.note || cat.label,
      'Amount (₹)': Number(e.amount),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  ws['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(
      key.length + 2,
      ...rows.map((r) => String((r as any)[key] ?? '').length + 2)
    ),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personal Expenses');

  const sanitizedLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Personal_Expenses_${sanitizedLabel}.xlsx`);
};
