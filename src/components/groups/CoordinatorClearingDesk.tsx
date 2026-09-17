import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  Building2,
  CheckCircle2,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  MonthlyLedgerResponse,
  CoordinatorPendingCollection,
  CoordinatorPendingRefund,
} from '@/types/monthlyLedger';

interface CoordinatorClearingDeskProps {
  ledger: MonthlyLedgerResponse;
  onConfirmMemberPayment: (member: CoordinatorPendingCollection) => Promise<void>;
  onDisburseRefund: (member: CoordinatorPendingRefund) => Promise<void>;
  onDisburseLandlordRent: (amount: number) => Promise<void>;
  onLockMonth: () => Promise<void>;
}

export const CoordinatorClearingDesk: React.FC<CoordinatorClearingDeskProps> = ({
  ledger,
  onConfirmMemberPayment,
  onDisburseRefund,
  onDisburseLandlordRent,
  onLockMonth,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const { coordinator_summary, summary, settlement_status, month, year } = ledger;
  const isLocked = settlement_status === 'locked';

  const pendingCollections = coordinator_summary?.members_to_collect || [];
  const pendingRefunds = coordinator_summary?.members_to_refund || [];
  const rentAmount = summary.total_rent;

  const rentBill = coordinator_summary?.external_bills_pending?.find(
    (b) => b.category === 'rent' || b.category === 'landlord_rent'
  );
  const isRentCleared = rentBill ? rentBill.status === 'cleared' : summary.bill_progress_pct >= 100;

  const handleConfirm = async (member: CoordinatorPendingCollection) => {
    setActionInProgress(`confirm-${member.user_id}`);
    try {
      await onConfirmMemberPayment(member);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefund = async (member: CoordinatorPendingRefund) => {
    setActionInProgress(`refund-${member.user_id}`);
    try {
      await onDisburseRefund(member);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRentDisburse = async () => {
    setActionInProgress('rent');
    try {
      await onDisburseLandlordRent(rentAmount);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLock = async () => {
    if (
      !window.confirm(
        `Are you sure you want to lock the month? Any unrefunded credits will automatically roll over to next month.`
      )
    ) {
      return;
    }
    setActionInProgress('lock');
    try {
      await onLockMonth();
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <Card className="p-4 border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-4 print:hidden">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <div>
            <h4 className="text-sm font-bold text-foreground">Coordinator Clearing Desk</h4>
            <p className="text-xs text-muted-foreground">
              Pramukh actions for external landlord bills, roommate collections & refunds
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-4 pt-2 border-t border-amber-200 dark:border-amber-900/60">
          {/* 1. Landlord Rent Payout */}
          <div className="bg-background rounded-lg p-3 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Landlord Rent Payout</p>
                <p className="text-xs text-muted-foreground">
                  Status: {isRentCleared ? 'Paid from Pooled Funds' : 'Pending Payment to Landlord'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-base font-bold font-mono text-foreground">
                ₹{rentAmount.toFixed(2)}
              </span>
              {isRentCleared ? (
                <Badge variant="default" className="bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Paid
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={handleRentDisburse}
                  disabled={actionInProgress === 'rent' || isLocked}
                  className="h-8 text-xs"
                >
                  {actionInProgress === 'rent' ? 'Recording...' : 'Mark Rent Paid'}
                </Button>
              )}
            </div>
          </div>

          {/* 2. Pending Collections Checklist */}
          {pendingCollections.length > 0 && (
            <div className="bg-background rounded-lg p-3 border border-border space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Awaiting Roommate Collections ({pendingCollections.length})
              </h5>
              <div className="divide-y divide-border">
                {pendingCollections.map((m) => (
                  <div key={m.user_id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Owes ₹{m.amount.toFixed(2)} ·{' '}
                        {m.status === 'submitted' ? 'Marked "I\'ve paid"' : 'Unpaid'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleConfirm(m)}
                      disabled={actionInProgress === `confirm-${m.user_id}` || isLocked}
                    >
                      {actionInProgress === `confirm-${m.user_id}`
                        ? 'Confirming...'
                        : `Confirm ₹${Math.round(m.amount)}`}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Pending Refunds Checklist */}
          {pendingRefunds.length > 0 && (
            <div className="bg-background rounded-lg p-3 border border-border space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pending Member Reimbursements ({pendingRefunds.length})
                </h5>
              </div>
              <div className="divide-y divide-border">
                {pendingRefunds.map((m) => (
                  <div key={m.user_id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Overpaid by ₹{m.remaining_refund.toFixed(2)} (Fronted bills)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleRefund(m)}
                      disabled={actionInProgress === `refund-${m.user_id}` || isLocked}
                    >
                      {actionInProgress === `refund-${m.user_id}`
                        ? 'Disbursing...'
                        : `Disburse Refund`}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Month Lock and Rollover */}
          <div className="bg-background rounded-lg p-3 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isLocked ? 'Monthly Cycle Locked' : 'Close & Lock Monthly Cycle'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isLocked
                    ? 'This month is frozen. Overpayments have rolled forward into next month.'
                    : 'Locks calculation. Any unrefunded overpayments automatically roll forward as credits.'}
                </p>
              </div>
            </div>

            {!isLocked && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLock}
                disabled={actionInProgress === 'lock'}
                className="h-8 text-xs self-end sm:self-auto shrink-0"
              >
                {actionInProgress === 'lock' ? 'Locking...' : 'Lock Month & Rollover'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
