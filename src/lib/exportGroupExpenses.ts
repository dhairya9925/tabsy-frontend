import * as XLSX from 'xlsx';
import { GroupExpense } from '@/hooks/useGroupExpenses';
import { getCategoryById } from '@/lib/categories';
import { format } from 'date-fns';

export const exportGroupExpensesToExcel = (expenses: GroupExpense[], groupName: string) => {
  const rows = expenses.map(e => {
    const cat = getCategoryById(e.category);
    const splitDetails = e.splits?.map(s => `${s.member_name}: ₹${s.amount.toFixed(2)}`).join(', ') || '';
    return {
      Date: format(new Date(e.expense_date), 'dd MMM yyyy'),
      Description: e.note || cat.label,
      Category: cat.label,
      Amount: e.amount,
      'Paid By': e.payer_name || 'Unknown',
      Splits: splitDetails,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-size columns
  ws['!cols'] = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String((r as any)[key]).length)).toString().length > 30 ? 30 : Math.max(key.length + 2, ...rows.map(r => String((r as any)[key]).length + 2)),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  XLSX.writeFile(wb, `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_expenses.xlsx`);
};
