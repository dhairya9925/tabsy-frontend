import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calculator,
  Lock,
  Download,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useGroupMembers } from '@/hooks/useGroups';
import {
  useMonthlyLedger,
  useRecordMonthlyContribution,
  useRecordMonthlyDisbursement,
  useLockMonthlyLedger,
} from '@/hooks/useMonthlyLedger';
import { exportMonthlyLedgerToExcel } from '@/lib/exportMonthlyLedger';
import { HeroActionSlip } from './HeroActionSlip';
import { HouseholdProgressGauges } from './HouseholdProgressGauges';
import { MonthlyLedgerTable } from './MonthlyLedgerTable';
import { CoordinatorClearingDesk } from './CoordinatorClearingDesk';
import type {
  MemberLedgerItem,
  CoordinatorPendingCollection,
  CoordinatorPendingRefund,
} from '@/types/monthlyLedger';

interface SharedLivingSettlementProps {
  groupId: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SharedLivingSettlement: React.FC<SharedLivingSettlementProps> = ({ groupId }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { user } = useAuth();
  const { toast } = useToast();

  // Queries
  const { data: ledger, isLoading, error } = useMonthlyLedger(groupId, month, year);
  const { data: members } = useGroupMembers(groupId);

  // Mutations
  const recordContribution = useRecordMonthlyContribution();
  const recordDisbursement = useRecordMonthlyDisbursement();
  const lockLedger = useLockMonthlyLedger();

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const isLocked = ledger?.settlement_status === 'locked';

  // Check if current user is admin / coordinator
  const currentMember = members?.find((m) => m.user_id === user?.id);
  const isCoordinator =
    currentMember?.role === 'admin' ||
    currentMember?.role === 'coordinator' ||
    ledger?.members.find((m) => m.user_id === user?.id)?.role === 'admin';

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Handlers
  const handleMarkMyPayment = async () => {
    if (!ledger?.my_summary || !user?.id) return;
    try {
      await recordContribution.mutateAsync({
        groupId,
        month,
        year,
        payload: {
          from_user_id: user.id,
          amount: ledger.my_summary.amount,
          note: `Payment self-reported via web for ${MONTH_NAMES[month - 1]} ${year}`,
        },
      });
      toast({
        title: 'Payment Submitted',
        description: 'Your payment was recorded and is awaiting coordinator verification.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCoordinatorConfirmPayment = async (member: CoordinatorPendingCollection | MemberLedgerItem) => {
    try {
      const amount = 'amount' in member ? member.amount : member.balance;
      await recordContribution.mutateAsync({
        groupId,
        month,
        year,
        payload: {
          from_user_id: member.user_id,
          amount,
          note: `Confirmed received by coordinator for ${MONTH_NAMES[month - 1]} ${year}`,
        },
      });
      toast({
        title: 'Payment Confirmed',
        description: `Payment from ${member.display_name} verified.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCoordinatorDisburseRefund = async (member: CoordinatorPendingRefund | MemberLedgerItem) => {
    try {
      const amount = 'remaining_refund' in member ? member.remaining_refund : Math.abs(member.balance);
      await recordDisbursement.mutateAsync({
        groupId,
        month,
        year,
        payload: {
          disbursement_type: 'member_refund',
          amount,
          recipient_user_id: member.user_id,
          category: 'refund',
          reference_note: `Refund fronted costs for ${MONTH_NAMES[month - 1]} ${year}`,
        },
      });
      toast({
        title: 'Refund Recorded',
        description: `Refund of ₹${amount.toFixed(2)} disbursed to ${member.display_name}.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCoordinatorDisburseRent = async (amount: number) => {
    try {
      await recordDisbursement.mutateAsync({
        groupId,
        month,
        year,
        payload: {
          disbursement_type: 'vendor_bill',
          amount,
          recipient_name: 'Landlord',
          category: 'landlord_rent',
          reference_note: `House rent payment for ${MONTH_NAMES[month - 1]} ${year}`,
        },
      });
      toast({
        title: 'Landlord Rent Cleared',
        description: `Rent of ₹${amount.toFixed(2)} marked paid from collective funds.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCoordinatorLockMonth = async () => {
    try {
      await lockLedger.mutateAsync({
        groupId,
        month,
        year,
        payload: {
          rollover_unclaimed_refunds: true,
          note: `Cycle locked for ${MONTH_NAMES[month - 1]} ${year}`,
        },
      });
      toast({
        title: 'Month Locked',
        description: `${MONTH_NAMES[month - 1]} ${year} locked and overpayments rolled forward.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    if (!ledger) return;
    exportMonthlyLedgerToExcel(ledger);
    toast({ title: 'Excel Export Ready', description: 'Downloaded monthly household ledger file.' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* ── Month Selector Strip & Actions ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {MONTH_NAMES[month - 1]} {year}
              </h2>
              {isCurrentMonth && (
                <Badge variant="secondary" className="text-[10px]">
                  Current
                </Badge>
              )}
              {isLocked && (
                <Badge variant="default" className="text-[10px] bg-amber-600 text-white">
                  <Lock className="h-3 w-3 mr-0.5 inline" /> Locked
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Monthly Household Clearing Ledger</p>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {ledger && (
            <>
              <Button size="sm" variant="outline" onClick={handleExportExcel} className="h-8 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" /> Export Excel
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Loading Spinner ── */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* ── Error State ── */}
      {!isLoading && error && (
        <Card className="p-6 text-center text-muted-foreground border-destructive/40">
          <p className="text-sm text-destructive">Failed to load monthly ledger: {error.message}</p>
        </Card>
      )}

      {/* ── Empty State ── */}
      {!isLoading && ledger && ledger.members.length === 0 && (
        <Card className="flex flex-col items-center py-10 text-center">
          <Calculator className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">No household ledger for this month yet.</p>
          <p className="text-xs text-muted-foreground">Add expenses or rent obligations to populate.</p>
        </Card>
      )}

      {/* ── Main Ledger Experience ── */}
      {!isLoading && ledger && ledger.members.length > 0 && (
        <>
          {/* Personalized Hero Slip */}
          <div className="print:hidden">
            <HeroActionSlip
              mySummary={ledger.my_summary}
              monthName={MONTH_NAMES[month - 1]}
              year={year}
              onMarkPaid={handleMarkMyPayment}
              isSubmittingPayment={recordContribution.isPending}
            />
          </div>

          {/* Dual Progress Gauges */}
          <HouseholdProgressGauges
            summary={ledger.summary}
            coordinatorSummary={ledger.coordinator_summary}
            totalMembers={ledger.members.length}
          />

          {/* Full Flatmates Ledger Table */}
          <MonthlyLedgerTable
            members={ledger.members}
            summary={ledger.summary}
            currentUserId={user?.id}
            isCoordinator={isCoordinator}
            onConfirmContribution={handleCoordinatorConfirmPayment}
            onDisburseRefund={handleCoordinatorDisburseRefund}
          />

          {/* Coordinator Clearing Desk (For Admins / Pramukh) */}
          {isCoordinator && (
            <CoordinatorClearingDesk
              ledger={ledger}
              onConfirmMemberPayment={handleCoordinatorConfirmPayment}
              onDisburseRefund={handleCoordinatorDisburseRefund}
              onDisburseLandlordRent={handleCoordinatorDisburseRent}
              onLockMonth={handleCoordinatorLockMonth}
            />
          )}
        </>
      )}
    </div>
  );
};

export default SharedLivingSettlement;
