import type { Tables } from '@/integrations/supabase/types';
import { roundMoney, sumMoney } from './money';

type Expense = Tables<'expenses'>;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemberSettlementRow {
  userId: string;
  name: string;
  rentShare: number;
  expenseShare: number;
  totalShouldPay: number;
  totalPaid: number;
  balance: number; // positive = owes money, negative = is owed money
  isExcluded: boolean;
}

export interface SettlementAction {
  userId: string;
  name: string;
  type: 'pays' | 'gets' | 'settled';
  amount: number; // always positive or 0
}

export interface SettlementResult {
  totalRent: number;
  totalGeneralExpenses: number;
  activeMembers: number;
  expenseMembers: number; // members sharing general expenses (excludes partially-excluded)
  rentSharePerPerson: number;
  expenseSharePerPerson: number;
  rows: MemberSettlementRow[];
  actions: SettlementAction[];
}

// ─── Pure Calculation ────────────────────────────────────────────────────────

/**
 * Main settlement calculation function.
 *
 * @param expenses         - All expenses for the group in the selected month
 * @param members          - Array of { userId, name } for each active member
 * @param memberExclusions - Array of exclusions to determine who pays what
 * @returns Full settlement breakdown
 */
export function calculateSettlement(
  allExpenses: Expense[],
  members: { userId: string; name: string }[],
  memberExclusions: Array<{ userId: string; type: 'partial' | 'full' } | string> = [],
  groupMonthlyRent: number = 0,
): SettlementResult {
  const N = members.length;
  
  // Normalize exclusions (allow passing list of userId strings for partial exclusions)
  const normalizedExclusions = memberExclusions.map((exclusion) =>
    typeof exclusion === 'string'
      ? { userId: exclusion, type: 'partial' as const }
      : exclusion
  );

  // Ignore any existing auto-generated rent expenses to avoid double-counting, and system logs
  const expenses = allExpenses.filter(e => 
    e.note !== 'Automated Monthly Rent' && 
    e.category !== 'system'
  );
  
  const partialSet = new Set(normalizedExclusions.filter(e => e.type === 'partial').map(e => e.userId));
  const fullSet = new Set(normalizedExclusions.filter(e => e.type === 'full').map(e => e.userId));

  const expenseMembers = N - partialSet.size - fullSet.size; // Only Included members pay general expenses
  const rentMembers = N - fullSet.size; // Included and Partial members pay rent

  if (N === 0) {
    return {
      totalRent: 0,
      totalGeneralExpenses: 0,
      activeMembers: 0,
      expenseMembers: 0,
      rentSharePerPerson: 0,
      expenseSharePerPerson: 0,
      rows: [],
      actions: [],
    };
  }

  // 1. Categorize expenses
  const rentExpenses = expenses.filter(
    (e) => e.category.toLowerCase() === 'rent',
  );
  const generalExpenses = expenses.filter(
    (e) => e.category.toLowerCase() !== 'rent',
  );

  // 2. Calculate totals
  const totalRent = roundMoney(groupMonthlyRent + sumMoney(rentExpenses.map(e => e.amount)));
  const totalGeneralExpenses = sumMoney(generalExpenses.map(e => e.amount));

  // 3. Share calculation
  // Rent is split among included and partial members
  const rentSharePerPerson = rentMembers > 0 ? roundMoney(totalRent / rentMembers) : 0;
  // General expenses are split only among included members
  const expenseSharePerPerson = expenseMembers > 0
    ? roundMoney(totalGeneralExpenses / expenseMembers)
    : 0;

  // 4. Calculate "Total Paid" per member
  const paidMap = new Map<string, number>();
  members.forEach((m) => paidMap.set(m.userId, 0));

  expenses.forEach((e) => {
    const payerId = e.paid_by || e.user_id;
    paidMap.set(payerId, (paidMap.get(payerId) || 0) + e.amount);
  });

  // 5. Build rows & 6. Determine settlement actions
  const rows: MemberSettlementRow[] = [];
  const actions: SettlementAction[] = [];

  members.forEach((member) => {
    const isFull = fullSet.has(member.userId);
    const isPartial = partialSet.has(member.userId);
    const isExcluded = isFull || isPartial; // Flag used by UI to dim out rows

    const memberRentShare = isFull ? 0 : rentSharePerPerson;
    const memberExpenseShare = (isFull || isPartial) ? 0 : expenseSharePerPerson;

    const totalShouldPay = memberRentShare + memberExpenseShare;
    const totalPaid = paidMap.get(member.userId) || 0;
    const balance = roundMoney(totalShouldPay - totalPaid);

    const row: MemberSettlementRow = {
      userId: member.userId,
      name: member.name,
      rentShare: roundMoney(memberRentShare),
      expenseShare: roundMoney(memberExpenseShare),
      totalShouldPay: roundMoney(totalShouldPay),
      totalPaid: roundMoney(totalPaid),
      balance,
      isExcluded, // For backwards compatibility with UI
    };
    rows.push(row);

    if (balance > 0.01) {
      actions.push({
        userId: member.userId,
        name: member.name,
        type: 'pays',
        amount: balance,
      });
    } else if (balance < -0.01) {
      actions.push({
        userId: member.userId,
        name: member.name,
        type: 'gets',
        amount: Math.abs(balance),
      });
    } else {
      actions.push({
        userId: member.userId,
        name: member.name,
        type: 'settled',
        amount: 0,
      });
    }
  });

  return {
    totalRent: roundMoney(totalRent),
    totalGeneralExpenses: roundMoney(totalGeneralExpenses),
    activeMembers: N,
    expenseMembers,
    rentSharePerPerson: roundMoney(rentSharePerPerson),
    expenseSharePerPerson: roundMoney(expenseSharePerPerson),
    rows,
    actions,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Rounding helpers are now provided by @/utils/money.ts
