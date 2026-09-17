import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import type { UserLedgerActionSummary } from '@/types/monthlyLedger';
import { useToast } from '@/hooks/use-toast';

interface HeroActionSlipProps {
  mySummary: UserLedgerActionSummary | null | undefined;
  monthName: string;
  year: number;
  onMarkPaid: () => void;
  isSubmittingPayment?: boolean;
}

export const HeroActionSlip: React.FC<HeroActionSlipProps> = ({
  mySummary,
  monthName,
  year,
  onMarkPaid,
  isSubmittingPayment = false,
}) => {
  const { toast } = useToast();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!mySummary) return null;

  const { action, amount, coordinator_name, coordinator_upi_id, status, upi_uri, breakdown } =
    mySummary;

  const handleCopyUPI = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    toast({ title: 'Copied UPI ID', description: upiId });
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // 1. DEBTOR STATE: Roommate owes the coordinator
  if (action === 'pay_coordinator') {
    const isSubmitted = status === 'submitted';

    return (
      <Card className="p-5 border-amber-300/60 bg-gradient-to-br from-amber-50/70 via-background to-amber-100/30 dark:from-amber-950/20 dark:to-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-100/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 font-semibold tracking-wide text-xs uppercase"
            >
              {isSubmitted ? 'Payment Awaiting Confirmation' : `${monthName} Household Dues`}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBreakdown((prev) => !prev)}
            className="text-xs text-primary self-start sm:self-auto h-7 px-2"
          >
            {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
            {showBreakdown ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            )}
          </Button>
        </div>

        <div className="my-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            You need to contribute
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              ₹{amount.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              to <strong className="text-foreground">{coordinator_name || 'Coordinator'}</strong>
            </span>
          </div>
        </div>

        {/* 5-Line Receipt Breakdown */}
        {showBreakdown && breakdown && (
          <div className="bg-background/80 rounded-lg p-3 my-3 text-xs space-y-1.5 border border-border/70">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rent Share (Ceil-rounded):</span>
              <span className="font-mono">₹{breakdown.rent_share.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shared Expenses:</span>
              <span className="font-mono">₹{breakdown.expense_share.toFixed(2)}</span>
            </div>
            {breakdown.adjustments > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Individual Adjustments:</span>
                <span className="font-mono">₹{breakdown.adjustments.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-primary">
              <span>Less fronted out-of-pocket:</span>
              <span className="font-mono">-₹{breakdown.already_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5 text-foreground">
              <span>Outstanding Balance:</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">
                ₹{amount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {upi_uri && !isSubmitted && (
            <a
              href={upi_uri}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Pay via UPI App
            </a>
          )}

          {coordinator_upi_id && !isSubmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyUPI(coordinator_upi_id)}
              className="h-9"
            >
              {copiedUpi ? (
                <Check className="h-4 w-4 mr-1 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copiedUpi ? 'Copied' : `Copy UPI ID (${coordinator_upi_id})`}
            </Button>
          )}

          {isSubmitted ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 px-3 py-2 rounded-md font-medium">
              <Clock className="h-4 w-4" />
              Payment submitted · Awaiting coordinator verification
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onMarkPaid}
              disabled={isSubmittingPayment}
              className="h-9"
            >
              <CheckCircle2 className="h-4 w-4 mr-1 text-primary" />
              {isSubmittingPayment ? 'Submitting...' : "I've Paid"}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // 2. CREDITOR STATE: Roommate gets a refund
  if (action === 'receive_refund') {
    const isRefunded = status === 'refunded';

    return (
      <Card className="p-5 border-emerald-300/60 bg-gradient-to-br from-emerald-50/70 via-background to-emerald-100/30 dark:from-emerald-950/20 dark:to-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <Badge
            variant="outline"
            className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 font-semibold tracking-wide text-xs uppercase"
          >
            {isRefunded ? 'Refund Received ✓' : `${monthName} Reimbursement`}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBreakdown((prev) => !prev)}
            className="text-xs text-primary self-start sm:self-auto h-7 px-2"
          >
            {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
            {showBreakdown ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            )}
          </Button>
        </div>

        <div className="my-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            You get back
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              ₹{amount.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              from <strong className="text-foreground">{coordinator_name || 'Coordinator'}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-100/40 dark:bg-emerald-950/30 p-2.5 rounded-lg my-2 text-xs text-foreground/90">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            {isRefunded
              ? 'Your refund has been disbursed by the coordinator.'
              : `You fronted expenses for the flat! ${coordinator_name || 'Coordinator'} will reimburse you once collections complete.`}
          </span>
        </div>

        {showBreakdown && breakdown && (
          <div className="bg-background/80 rounded-lg p-3 my-3 text-xs space-y-1.5 border border-border/70">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rent Share (Ceil-rounded):</span>
              <span className="font-mono">₹{breakdown.rent_share.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shared Expenses:</span>
              <span className="font-mono">₹{breakdown.expense_share.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Total fronted by you:</span>
              <span className="font-mono">₹{breakdown.already_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5 text-foreground">
              <span>Refund Due to You:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                ₹{amount.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Card>
    );
  }

  // 3. SETTLED STATE
  return (
    <Card className="p-4 border-muted flex items-center gap-3 bg-muted/20">
      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">
          {monthName} {year} All Squared Away
        </h4>
        <p className="text-xs text-muted-foreground">
          Your obligations for rent and shared household expenses are completely cleared.
        </p>
      </div>
    </Card>
  );
};
