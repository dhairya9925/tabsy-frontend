export interface MemberObligationBreakdown {
  rent_share: number;
  expense_share: number;
  adjustments: number;
  total_obligation: number;
  already_paid: number;
}

export interface UserLedgerActionSummary {
  action: 'pay_coordinator' | 'receive_refund' | 'settled';
  amount: number;
  coordinator_name?: string | null;
  coordinator_id?: string | null;
  coordinator_upi_id?: string | null;
  status: string;
  upi_uri?: string | null;
  breakdown: MemberObligationBreakdown;
}

export interface MemberLedgerItem {
  user_id: string;
  display_name: string;
  email?: string | null;
  avatar_url?: string | null;
  role: string;
  is_excluded: boolean;
  exclusion_type?: string | null;
  rent_share: number;
  expense_share: number;
  adjustments: number;
  total_expense: number;
  total_paid: number;
  balance: number;
  status: string; // 'pending' | 'submitted' | 'confirmed' | 'credited' | 'refunded'
}

export interface CoordinatorPendingCollection {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  amount: number;
  status: string;
}

export interface CoordinatorPendingRefund {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  amount: number;
  refunded_amount: number;
  remaining_refund: number;
  status: string;
}

export interface CoordinatorPendingBill {
  category: string;
  description: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string; // 'unpaid' | 'partially_paid' | 'cleared'
}

export interface CoordinatorChecklist {
  members_to_collect: CoordinatorPendingCollection[];
  total_to_collect: number;
  members_to_refund: CoordinatorPendingRefund[];
  total_to_refund: number;
  net_cash_for_bills: number;
  external_bills_pending: CoordinatorPendingBill[];
  total_external_bills_pending: number;
}

export interface MonthlyLedgerSummary {
  total_rent: number;
  total_shared_expenses: number;
  total_adjustments: number;
  grand_total: number;
  total_paid: number;
  total_balance: number;
  members_to_contribute: number;
  over_contributed: number;
  remaining_for_bills: number;
  collection_progress_pct: number;
  bill_progress_pct: number;
  total_disbursed: number;
  total_vendor_bills_paid: number;
  total_refunds_paid: number;
}

export interface MonthlyLedgerDisbursement {
  id: string;
  settlement_id: string;
  group_id: string;
  disbursement_type: 'vendor_bill' | 'member_refund';
  amount: number;
  recipient_user_id?: string | null;
  recipient_name?: string | null;
  category: string;
  payment_method: string;
  reference_note?: string | null;
  recorded_by: string;
  created_at: string;
}

export interface MonthlyLedgerResponse {
  group_id: string;
  group_name: string;
  month: number;
  year: number;
  settlement_id?: string | null;
  settlement_status: 'open' | 'locked';
  summary: MonthlyLedgerSummary;
  members: MemberLedgerItem[];
  my_summary?: UserLedgerActionSummary | null;
  coordinator_summary?: CoordinatorChecklist | null;
  disbursements: MonthlyLedgerDisbursement[];
}

export interface MonthlyLedgerContributionPayload {
  from_user_id: string;
  amount: number;
  note?: string | null;
}

export interface MonthlyLedgerDisbursementPayload {
  disbursement_type: 'vendor_bill' | 'member_refund';
  amount: number;
  recipient_user_id?: string | null;
  recipient_name?: string | null;
  category?: string;
  payment_method?: string;
  reference_note?: string | null;
}

export interface MonthlyLedgerLockPayload {
  rollover_unclaimed_refunds: boolean;
  note?: string | null;
}
