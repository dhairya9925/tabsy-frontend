import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { MonthlyLedgerSummary, CoordinatorChecklist } from '@/types/monthlyLedger';

interface HouseholdProgressGaugesProps {
  summary: MonthlyLedgerSummary;
  coordinatorSummary?: CoordinatorChecklist | null;
  totalMembers?: number;
}

export const HouseholdProgressGauges: React.FC<HouseholdProgressGaugesProps> = ({
  summary,
  coordinatorSummary,
  totalMembers = 0,
}) => {
  const {
    collection_progress_pct = 0,
    bill_progress_pct = 0,
    total_paid = 0,
    grand_total = 0,
    members_to_contribute = 0,
    remaining_for_bills = 0,
    total_rent = 0,
    total_vendor_bills_paid = 0,
  } = summary;

  const pendingMembersCount = coordinatorSummary?.members_to_collect?.length ?? 0;
  const settledMembersCount = Math.max(0, totalMembers - pendingMembersCount);

  const rentBill = coordinatorSummary?.external_bills_pending?.find(
    (b) => b.category === 'rent' || b.category === 'landlord_rent'
  );
  const isRentCleared = rentBill ? rentBill.status === 'cleared' : bill_progress_pct >= 100;

  const clampedCollectionPct = Math.min(100, Math.max(0, Math.round(collection_progress_pct)));
  const clampedBillPct = Math.min(100, Math.max(0, Math.round(bill_progress_pct)));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Household Clearing Status
        </h4>
        {totalMembers > 0 && (
          <span className="text-xs text-primary font-medium">
            {settledMembersCount} of {totalMembers} members cleared
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gauge 1: Roommate Collections */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              Roommate Collections
            </div>
            <span className="font-mono font-bold text-primary">{clampedCollectionPct}%</span>
          </div>

          <Progress value={clampedCollectionPct} className="h-2" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Collected:{' '}
              <strong className="text-foreground font-mono">₹{total_paid.toFixed(2)}</strong> of{' '}
              <span className="font-mono">₹{grand_total.toFixed(2)}</span>
            </span>
            {members_to_contribute > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">
                ₹{members_to_contribute.toFixed(2)} left
              </span>
            )}
          </div>
        </div>

        {/* Gauge 2: External Bills (Landlord Rent) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              External Bills & Landlord Rent
            </div>
            <Badge
              variant={isRentCleared ? 'default' : 'outline'}
              className={`text-[10px] px-1.5 py-0 ${
                isRentCleared
                  ? 'bg-emerald-600 text-white'
                  : 'text-amber-600 border-amber-400 dark:text-amber-400'
              }`}
            >
              {isRentCleared ? (
                <CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" />
              ) : (
                <AlertCircle className="h-2.5 w-2.5 mr-1 inline" />
              )}
              {isRentCleared ? 'Rent Paid' : 'Rent Pending'}
            </Badge>
          </div>

          <Progress value={clampedBillPct} className="h-2" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Disbursed:{' '}
              <strong className="text-foreground font-mono">
                ₹{total_vendor_bills_paid.toFixed(2)}
              </strong>{' '}
              of <span className="font-mono">₹{total_rent.toFixed(2)}</span>
            </span>
            <span>
              Pool reserve:{' '}
              <strong className="text-foreground font-mono">
                ₹{remaining_for_bills.toFixed(2)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
