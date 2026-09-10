// Copied from SettlementTab.tsx
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calculator, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Lock, ClipboardCheck, Users, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ThreeStateToggle } from '@/components/ui/three-state-toggle';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useSettlementCalculation } from '@/hooks/useSettlementCalculation';
import {
    useMonthlySettlement,
    useMemberMonthlyStatus,
    useCreateMonthlySettlement,
    useMarkExpensesComplete,
    useLockSettlement,
    useMemberExclusions,
    useSetMemberExclusion,
} from '@/hooks/useSettlements';
import { useGroupMembers } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SettlementAction } from '@/utils/settlementCalculation';

interface SharedLivingSettlementProps {
    groupId: string;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const SharedLivingSettlement = ({ groupId }: SharedLivingSettlementProps) => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const { user } = useAuth();
    const { toast } = useToast();

    // Data
    const { data: settlement, isLoading: calcLoading } = useSettlementCalculation(groupId, month, year);
    const { data: monthlySettlement, isLoading: settlementLoading } = useMonthlySettlement(groupId, month, year);
    const { data: memberStatuses } = useMemberMonthlyStatus(groupId, monthlySettlement?.id);
    const { data: members } = useGroupMembers(groupId);
    const { data: exclusions } = useMemberExclusions(groupId, month, year);

    // Mutations
    const createSettlement = useCreateMonthlySettlement();
    const markComplete = useMarkExpensesComplete();
    const lockSettlement = useLockSettlement();
    const setExclusion = useSetMemberExclusion();

    // Date Window Logic for "Finalize mine" button
    const lastDayOfSelectedMonth = new Date(year, month, 0, 0, 0, 0);
    const seventhOfNextMonth = new Date(year, month, 7, 23, 59, 59, 999);
    const isFinalizeWindowOpen = now >= lastDayOfSelectedMonth && now <= seventhOfNextMonth;

    const isLoading = calcLoading || settlementLoading;
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    const isLocked = monthlySettlement?.status === 'locked';

    // Derived state
    const totalMembers = members?.length ?? 0;
    const completedCount = memberStatuses?.length ?? 0;
    const progressPercent = totalMembers > 0 ? (completedCount / totalMembers) * 100 : 0;
    const currentUserCompleted = memberStatuses?.some((s) => s.user_id === user?.id) ?? false;
    const allComplete = totalMembers > 0 && completedCount >= totalMembers;

    const exclusionMap = new Map((exclusions ?? []).map((e) => [e.user_id, e.exclusion_type as 'partial' | 'full']));

    // Auto-lock: when all members have marked complete and settlement exists and is still open
    useEffect(() => {
        if (allComplete && monthlySettlement && monthlySettlement.status === 'open') {
            lockSettlement.mutate({
                settlementId: monthlySettlement.id,
                groupId,
                month,
                year,
            });
            toast({ title: '🔒 Month locked!', description: 'All members have finalized their expenses.' });
        }
    }, [allComplete, monthlySettlement?.id, monthlySettlement?.status]);

    const handleMarkComplete = async () => {
        try {
            let settlementId = monthlySettlement?.id;
            if (!settlementId) {
                const created = await createSettlement.mutateAsync({ groupId, month, year });
                settlementId = created.id;
            }

            await markComplete.mutateAsync({ settlementId, groupId, month, year });
            toast({ title: '✅ Expenses marked as complete!' });
        } catch (err: any) {
            if (err?.code === '23505') {
                toast({ title: 'Already marked', description: 'You have already marked your expenses as complete.' });
            } else {
                toast({ title: 'Error', description: err.message, variant: 'destructive' });
            }
        }
    };

    const handleSetExclusion = (userId: string, nextValue: 0 | 1 | 2) => {
        const typeMap: Record<0 | 1 | 2, 'none' | 'partial' | 'full'> = {
            0: 'none',
            1: 'partial',
            2: 'full'
        };
        const currentType = typeMap[nextValue] || 'none';

        setExclusion.mutate(
            { groupId, userId, month, year, targetType: currentType },
            {
                onSuccess: () => {
                    const nextTitles: Record<string, string> = {
                        'none': '✅ Member fully included',
                        'partial': '🏠 Member partially away (rent only)',
                        'full': '✈️ Member fully away (0 rent & exp)'
                    };
                    toast({
                        title: nextTitles[currentType],
                    });
                },
                onError: (err: any) => {
                    toast({ title: 'Error', description: err.message, variant: 'destructive' });
                },
            },
        );
    };

    const goToPrevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else { setMonth(m => m - 1); }
    };
    const goToNextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else { setMonth(m => m + 1); }
    };

    return (
        <div className="space-y-5">
            {/* ── Month Picker ── */}
            <div className="flex items-center justify-between" data-mobile="month-picker">
                <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground">
                        {MONTH_NAMES[month - 1]} {year}
                    </h2>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        {isCurrentMonth && (
                            <Badge variant="secondary" className="text-[10px]">Current Month</Badge>
                        )}
                        {isLocked && (
                            <Badge variant="default" className="text-[10px] bg-amber-500/90">
                                <Lock className="h-3 w-3 mr-0.5" /> Locked
                            </Badge>
                        )}
                        {monthlySettlement && !isLocked && (
                            <Badge variant="outline" className="text-[10px]">Open</Badge>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}

            {/* ── Empty State ── */}
            {!isLoading && settlement && settlement.rows.length === 0 && (
                <Card className="flex flex-col items-center py-10 text-center">
                    <Calculator className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No expenses for this month yet.</p>
                </Card>
            )}

            {/* ── Main Content ── */}
            {!isLoading && settlement && settlement.rows.length > 0 && (
                <>
                    {/* Mark Complete / Progress Section */}
                    <Card className="p-4 space-y-3" data-mobile="progress-card">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium text-foreground">
                                    {completedCount}/{totalMembers} members finalized
                                </span>
                            </div>
                            {!isLocked && !currentUserCompleted && (
                                <div className="flex flex-col sm:items-end w-full sm:w-auto gap-1.5 sm:gap-1">
                                    <Button
                                        size="sm"
                                        onClick={handleMarkComplete}
                                        disabled={markComplete.isPending || createSettlement.isPending || !isFinalizeWindowOpen}
                                        className="w-full sm:w-auto"
                                    >
                                        <ClipboardCheck className="h-4 w-4 mr-1" />
                                        {markComplete.isPending ? 'Finalizing...' : 'Finalize mine'}
                                    </Button>
                                    {!isFinalizeWindowOpen && (
                                        <span className="text-[10px] text-muted-foreground leading-tight text-center sm:text-right">
                                            Available from the last day of {MONTH_NAMES[month - 1]}<br className="hidden sm:block" />
                                            <span className="sm:hidden"> </span>to the 7th of {MONTH_NAMES[month % 12]}
                                        </span>
                                    )}
                                </div>
                            )}
                            {currentUserCompleted && !isLocked && (
                                <Badge variant="secondary" className="text-xs self-start sm:self-auto">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> You're done
                                </Badge>
                            )}
                            {isLocked && (
                                <Badge variant="default" className="text-xs bg-amber-500/90">
                                    <Lock className="h-3 w-3 mr-1" /> Settled
                                </Badge>
                            )}
                        </div>
                        <Progress value={progressPercent} className="h-2" />

                        {/* Show who has/hasn't completed */}
                        {members && memberStatuses && (
                            <div className="flex flex-wrap gap-1.5">
                                {members.map((m) => {
                                    const done = memberStatuses.some((s) => s.user_id === m.user_id);
                                    const name = m.profile?.display_name || m.profile?.email || 'Unknown';
                                    return (
                                        <Badge
                                            key={m.user_id}
                                            variant={done ? 'default' : 'outline'}
                                            className={`text-[10px] ${done ? 'bg-green-600' : ''}`}
                                        >
                                            {done && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                                            {name}
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Totals summary cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Total Rent</p>
                            <p className="text-lg font-bold text-foreground">₹{settlement.totalRent.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">
                                split among {settlement.activeMembers} members
                            </p>
                        </Card>
                        <Card className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Total General</p>
                            <p className="text-lg font-bold text-foreground">₹{settlement.totalGeneralExpenses.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">
                                split among {settlement.expenseMembers} member{settlement.expenseMembers !== 1 ? 's' : ''}
                            </p>
                        </Card>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Settlement Summary</h3>
                        <div className="space-y-2">
                            {settlement.actions.map((action) => (
                                <ActionCard key={action.userId} action={action} />
                            ))}
                        </div>
                    </div>

                    {/* Per-member breakdown */}
                    <Card className="overflow-x-auto" data-mobile="settlement-table">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center">Away</TableHead>
                                    <TableHead className="text-right">Rent</TableHead>
                                    <TableHead className="text-right">Expense</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settlement.rows.map((row) => (
                                    <TableRow key={row.userId} className={row.isExcluded ? 'opacity-60' : ''}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-1.5">
                                                {row.name}
                                                {exclusionMap.get(row.userId) === 'partial' && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-500">
                                                        <Home className="h-2.5 w-2.5 mr-0.5" /> Part
                                                    </Badge>
                                                )}
                                                {exclusionMap.get(row.userId) === 'full' && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-500/50 text-red-500">
                                                        <Home className="h-2.5 w-2.5 mr-0.5" /> Away
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center items-center">
                                                <ThreeStateToggle
                                                    value={exclusionMap.get(row.userId) === 'full' ? 2 : exclusionMap.get(row.userId) === 'partial' ? 1 : 0}
                                                    onValueChange={(val) => handleSetExclusion(row.userId, val)}
                                                    disabled={isLocked || setExclusion.isPending}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">₹{row.rentShare.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            {row.isExcluded
                                                ? <span className="text-muted-foreground">—</span>
                                                : `₹${row.expenseShare.toFixed(2)}`}
                                        </TableCell>
                                        <TableCell className="text-right">₹{row.totalPaid.toFixed(2)}</TableCell>
                                        <TableCell className={`text-right font-semibold ${row.balance > 0.01
                                            ? 'text-red-500'
                                            : row.balance < -0.01
                                                ? 'text-green-500'
                                                : 'text-muted-foreground'
                                            }`}>
                                            {row.balance > 0.01
                                                ? `₹${row.balance.toFixed(2)}`
                                                : row.balance < -0.01
                                                    ? `-₹${Math.abs(row.balance).toFixed(2)}`
                                                    : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Settlement Summary */}

                </>
            )}
        </div>
    );
};

function ActionCard({ action }: { action: SettlementAction }) {
    if (action.type === 'pays') {
        return (
            <Card className="p-3 flex items-center gap-3 border-red-500/30 bg-red-500/5">
                <ArrowUpCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-foreground">
                    {action.name} pays <span className="font-bold text-red-500">₹{action.amount.toFixed(2)}</span>
                </span>
            </Card>
        );
    }

    if (action.type === 'gets') {
        return (
            <Card className="p-3 flex items-center gap-3 border-green-500/30 bg-green-500/5">
                <ArrowDownCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-foreground">
                    {action.name} gets <span className="font-bold text-green-500">₹{action.amount.toFixed(2)}</span>
                </span>
            </Card>
        );
    }

    return (
        <Card className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">{action.name} is settled</span>
        </Card>
    );
}

export default SharedLivingSettlement;
