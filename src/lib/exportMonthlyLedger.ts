import * as XLSX from 'xlsx';
import type { MonthlyLedgerResponse } from '@/types/monthlyLedger';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const buildMonthlyLedgerWorkbook = (ledger: MonthlyLedgerResponse): XLSX.WorkBook => {
  // 1. Member Ledger Sheet
  const memberRows = ledger.members.map((m) => ({
    Roommate: m.display_name,
    Role: m.role,
    'Rent Share (₹)': m.rent_share,
    'Shared Expenses (₹)': m.expense_share,
    'Adjustments (₹)': m.adjustments,
    'Total Obligation (₹)': m.total_expense,
    'Total Paid / Fronted (₹)': m.total_paid,
    'Balance (₹)': m.balance,
    'Action Required':
      m.balance > 0
        ? `Owes Coordinator ₹${m.balance.toFixed(2)}`
        : m.balance < 0
        ? `Refund Due ₹${Math.abs(m.balance).toFixed(2)}`
        : 'Settled',
    Status: m.status,
  }));

  // Append a summary total row
  memberRows.push({
    Roommate: '--- SUMMARY TOTALS ---',
    Role: '',
    'Rent Share (₹)': ledger.summary.total_rent,
    'Shared Expenses (₹)': ledger.summary.total_shared_expenses,
    'Adjustments (₹)': ledger.summary.total_adjustments,
    'Total Obligation (₹)': ledger.summary.grand_total,
    'Total Paid / Fronted (₹)': ledger.summary.total_paid,
    'Balance (₹)': ledger.summary.total_balance,
    'Action Required': `Pool for Bills: ₹${ledger.summary.remaining_for_bills.toFixed(2)}`,
    Status: ledger.settlement_status === 'locked' ? 'Month Locked' : 'Open',
  });

  const memberWs = XLSX.utils.json_to_sheet(memberRows);

  // Auto-size columns
  memberWs['!cols'] = Object.keys(memberRows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 3, 16),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, memberWs, 'Household Ledger');

  // 2. Disbursements Sheet (if any)
  if (ledger.disbursements && ledger.disbursements.length > 0) {
    const disburseRows = ledger.disbursements.map((d) => ({
      Type: d.disbursement_type === 'vendor_bill' ? 'Vendor / Landlord Bill' : 'Member Refund',
      Recipient: d.recipient_name || 'Member',
      Category: d.category,
      'Amount (₹)': d.amount,
      'Payment Method': d.payment_method,
      Note: d.reference_note || '',
      'Recorded At': d.created_at,
    }));
    const disburseWs = XLSX.utils.json_to_sheet(disburseRows);
    disburseWs['!cols'] = Object.keys(disburseRows[0] || {}).map((key) => ({
      wch: Math.max(key.length + 3, 16),
    }));
    XLSX.utils.book_append_sheet(wb, disburseWs, 'Disbursements & Payouts');
  }

  return wb;
};

export const exportMonthlyLedgerToExcel = (ledger: MonthlyLedgerResponse) => {
  const monthName = MONTH_NAMES[ledger.month - 1] || `Month_${ledger.month}`;
  const wb = buildMonthlyLedgerWorkbook(ledger);
  const safeGroupName = ledger.group_name.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${safeGroupName}_Monthly_Ledger_${monthName}_${ledger.year}.xlsx`);
};
