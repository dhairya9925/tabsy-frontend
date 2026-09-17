import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Clock } from 'lucide-react';
import type { MemberLedgerItem, MonthlyLedgerSummary } from '@/types/monthlyLedger';

interface MonthlyLedgerTableProps {
  members: MemberLedgerItem[];
  summary: MonthlyLedgerSummary;
  currentUserId?: string;
  isCoordinator?: boolean;
  onConfirmContribution?: (member: MemberLedgerItem) => void;
  onDisburseRefund?: (member: MemberLedgerItem) => void;
}

export const MonthlyLedgerTable: React.FC<MonthlyLedgerTableProps> = ({
  members,
  summary,
  currentUserId,
  isCoordinator = false,
  onConfirmContribution,
  onDisburseRefund,
}) => {
  return (
    <Card className="overflow-hidden border border-border/80 shadow-sm print:border-none print:shadow-none">
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Monthly Household Ledger
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Roommate</TableHead>
              <TableHead className="text-right font-semibold">Rent Share</TableHead>
              <TableHead className="text-right font-semibold">Shared Expenses</TableHead>
              <TableHead className="text-right font-semibold">Adjustments</TableHead>
              <TableHead className="text-right font-semibold">Total Obligation</TableHead>
              <TableHead className="text-right font-semibold">Total Paid</TableHead>
              <TableHead className="text-right font-semibold">Balance</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
              {isCoordinator && <TableHead className="text-right font-semibold print:hidden">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isMe = m.user_id === currentUserId;
              const isLead = m.role === 'admin' || m.role === 'coordinator';
              const isOverpaid = m.balance < -0.01;
              const isDebtor = m.balance > 0.01;
              const isCleared = !isOverpaid && !isDebtor;

              return (
                <TableRow key={m.user_id} className={isMe ? 'bg-primary/5 font-medium' : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{m.display_name}</span>
                      {isMe && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 uppercase">
                          You
                        </Badge>
                      )}
                      {isLead && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
                        >
                          Lead
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    ₹{m.rent_share.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    ₹{m.expense_share.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {m.adjustments > 0 ? `₹${m.adjustments.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    ₹{m.total_expense.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-primary font-semibold">
                    ₹{m.total_paid.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isDebtor && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        -₹{m.balance.toFixed(2)}
                      </span>
                    )}
                    {isOverpaid && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        +₹{Math.abs(m.balance).toFixed(2)}
                      </span>
                    )}
                    {isCleared && (
                      <span className="text-xs text-muted-foreground font-mono">Cleared</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.status === 'confirmed' && (
                      <Badge variant="default" className="text-[10px] bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-0.5 inline" /> Confirmed
                      </Badge>
                    )}
                    {m.status === 'refunded' && (
                      <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600">
                        Refunded ✓
                      </Badge>
                    )}
                    {m.status === 'submitted' && (
                      <Badge variant="secondary" className="text-[10px] text-amber-600">
                        <Clock className="h-3 w-3 mr-0.5 inline" /> Verification
                      </Badge>
                    )}
                    {m.status === 'pending' && (
                      <span className="text-xs text-muted-foreground">
                        {isCleared ? 'Settled' : 'Unpaid'}
                      </span>
                    )}
                  </TableCell>
                  {isCoordinator && (
                    <TableCell className="text-right print:hidden">
                      {isDebtor && m.status !== 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => onConfirmContribution?.(m)}
                        >
                          Confirm
                        </Button>
                      )}
                      {isOverpaid && m.status !== 'refunded' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => onDisburseRefund?.(m)}
                        >
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {/* Summary Footer Row */}
            <TableRow className="bg-muted/60 font-bold border-t-2 border-border">
              <TableCell>TOTALS</TableCell>
              <TableCell className="text-right font-mono text-xs">
                ₹{summary.total_rent.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                ₹{summary.total_shared_expenses.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                ₹{summary.total_adjustments.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                ₹{summary.grand_total.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-primary">
                ₹{summary.total_paid.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {summary.total_balance > 0
                  ? `₹${summary.total_balance.toFixed(2)}`
                  : '₹0.00'}
              </TableCell>
              <TableCell className="text-center text-xs font-normal text-muted-foreground">
                Pool: ₹{summary.remaining_for_bills.toFixed(2)}
              </TableCell>
              {isCoordinator && <TableCell className="print:hidden" />}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
