import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildMonthlyLedgerWorkbook } from '@/lib/exportMonthlyLedger';
import type { MonthlyLedgerResponse } from '@/types/monthlyLedger';

describe('buildMonthlyLedgerWorkbook', () => {
  const mockLedger: MonthlyLedgerResponse = {
    group_id: 'grp-123',
    group_name: 'Flat 402',
    month: 7,
    year: 2026,
    settlement_id: 'set-123',
    settlement_status: 'open',
    summary: {
      total_rent: 13500,
      total_shared_expenses: 16521,
      total_adjustments: 0,
      grand_total: 30021,
      total_paid: 16521,
      total_balance: 13500,
      members_to_contribute: 17481,
      over_contributed: 3979,
      remaining_for_bills: 13502,
      collection_progress_pct: 55,
      bill_progress_pct: 0,
      total_disbursed: 0,
      total_vendor_bills_paid: 0,
      total_refunds_paid: 0,
    },
    members: [
      {
        user_id: 'u1',
        display_name: 'Yash Pramukh',
        role: 'admin',
        is_excluded: false,
        rent_share: 1929,
        expense_share: 2360,
        adjustments: 0,
        total_expense: 4289,
        total_paid: 8268,
        balance: -3979,
        status: 'pending',
      },
      {
        user_id: 'u2',
        display_name: 'Roommate 2',
        role: 'member',
        is_excluded: false,
        rent_share: 1929,
        expense_share: 2360,
        adjustments: 0,
        total_expense: 4289,
        total_paid: 2724,
        balance: 1565,
        status: 'pending',
      },
    ],
    my_summary: {
      action: 'pay_coordinator',
      amount: 1565,
      coordinator_name: 'Yash Pramukh',
      status: 'pending',
      breakdown: {
        rent_share: 1929,
        expense_share: 2360,
        adjustments: 0,
        total_obligation: 4289,
        already_paid: 2724,
      },
    },
    disbursements: [
      {
        id: 'disb-1',
        settlement_id: 'set-123',
        group_id: 'grp-123',
        disbursement_type: 'vendor_bill',
        amount: 13500,
        recipient_name: 'Landlord',
        category: 'landlord_rent',
        payment_method: 'bank_transfer',
        reference_note: 'July Rent',
        recorded_by: 'u1',
        created_at: '2026-07-05T10:00:00Z',
      },
    ],
  };

  it('builds a valid Excel workbook with household ledger and disbursements sheets', () => {
    const wb = buildMonthlyLedgerWorkbook(mockLedger);

    expect(wb).toBeDefined();
    expect(wb.SheetNames).toContain('Household Ledger');
    expect(wb.SheetNames).toContain('Disbursements & Payouts');

    const ledgerSheet = wb.Sheets['Household Ledger'];
    const ledgerData: any[] = XLSX.utils.sheet_to_json(ledgerSheet);

    // 2 members + 1 summary total row = 3 rows
    expect(ledgerData.length).toBe(3);
    expect(ledgerData[0].Roommate).toBe('Yash Pramukh');
    expect(ledgerData[0]['Balance (₹)']).toBe(-3979);
    expect(ledgerData[1].Roommate).toBe('Roommate 2');
    expect(ledgerData[1]['Balance (₹)']).toBe(1565);
    expect(ledgerData[2].Roommate).toBe('--- SUMMARY TOTALS ---');

    const disburseSheet = wb.Sheets['Disbursements & Payouts'];
    const disburseData: any[] = XLSX.utils.sheet_to_json(disburseSheet);
    expect(disburseData.length).toBe(1);
    expect(disburseData[0].Category).toBe('landlord_rent');
    expect(disburseData[0]['Amount (₹)']).toBe(13500);
  });
});
