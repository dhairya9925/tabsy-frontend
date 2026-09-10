import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGroupExpenses, useGroupBalances, useBulkSettle, useUpdateExpenseStatus } from '@/hooks/useGroupExpenses';
import { useGroup } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Check, Download, AlertCircle } from 'lucide-react';
import { sumMoney, formatMoney } from '@/utils/money';

interface ReimbursableSettlementProps {
    groupId: string;
}

const ReimbursableSettlement = ({ groupId }: ReimbursableSettlementProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { data: group } = useGroup(groupId);
    const { data: expenses, isLoading: expensesLoading } = useGroupExpenses(groupId);
    const { data: balances, isLoading: balancesLoading } = useGroupBalances(groupId);
    const bulkSettle = useBulkSettle();
    const updateStatus = useUpdateExpenseStatus();

    const isSponsor = group?.sponsor_id === user?.id;
    const isCompanySponsor = group?.sponsor_id === 'Company';
    const isSponsorView = isSponsor || isCompanySponsor; // Allow 'Company' sponsor logic maybe? Wait, if they are 'Company', nobody is logged in as Company. Let's just say only actual admins/sponsors can see the bulk settle.

    // For simplicity, let's say if you're the sponsor or the creator, you can manage it.
    const canManage = isSponsor || group?.created_by === user?.id;

    if (expensesLoading || balancesLoading) {
        return (
            <div className="flex justify-center flex-col items-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    const reimbursableExpenses = expenses?.filter(e => e.category !== 'system' && e.note !== 'Automated Monthly Rent') || [];

    const submitted = reimbursableExpenses.filter(e => e.status === 'submitted');
    const approved = reimbursableExpenses.filter(e => e.status === 'approved');
    const reimbursed = reimbursableExpenses.filter(e => e.status === 'reimbursed');

    const totalApproved = sumMoney(approved.map(e => e.amount));

    return (
        <div className="space-y-6">
            {/* Sponsor Summary */}
            <Card className="p-4 border-rose-500/20 bg-rose-500/5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-rose-600">Sponsor Dashboard</h3>
                        <p className="text-sm text-rose-600/80">
                            {canManage ? "Manage and settle claims." : "View your claims and reimbursements."}
                        </p>
                    </div>
                    {canManage && approved.length > 0 && (
                        <Button
                            size="sm"
                            className="bg-rose-500 hover:bg-rose-600 text-white"
                            onClick={async () => {
                                try {
                                    await bulkSettle.mutateAsync({ groupId });
                                    toast({ title: 'All approved expenses marked as reimbursed!' });
                                } catch (err: any) {
                                    toast({ title: 'Error', description: err.message, variant: 'destructive' });
                                }
                            }}
                            disabled={bulkSettle.isPending}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {bulkSettle.isPending ? 'Settling...' : 'Reimburse All Approved'}
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 bg-white dark:bg-zinc-900 border-rose-500/10 hidden md:block">
                        <p className="text-sm text-muted-foreground font-medium">Pending Claims</p>
                        <p className="text-2xl font-bold mt-1">{submitted.length}</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-zinc-900 border-rose-500/10">
                        <p className="text-sm text-muted-foreground font-medium">Ready to Reimburse</p>
                        <p className="text-2xl font-bold mt-1 text-blue-500">₹{totalApproved.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-zinc-900 border-rose-500/10">
                        <p className="text-sm text-muted-foreground font-medium">Total Settled</p>
                        <p className="text-2xl font-bold mt-1 text-emerald-500">
                            ₹{formatMoney(sumMoney(reimbursed.map(e => e.amount)))}
                        </p>
                    </Card>
                </div>
            </Card>

            {/* Claims List View */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" /> Action Required ({submitted.length})
                </h3>
                {submitted.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No pending claims.</p>
                ) : (
                    <div className="space-y-2">
                        {submitted.map(expense => (
                            <ExpenseClaimCard
                                key={expense.id}
                                expense={expense}
                                canManage={canManage}
                                onApprove={() => updateStatus.mutate({ expenseId: expense.id, groupId: groupId, status: 'approved' })}
                                onReimburse={() => updateStatus.mutate({ expenseId: expense.id, groupId: groupId, status: 'reimbursed' })}
                                isUpdating={updateStatus.isPending}
                            />
                        ))}
                    </div>
                )}

                <h3 className="font-semibold text-lg flex items-center gap-2 mt-6">
                    <Clock className="h-5 w-5 text-blue-500" /> Approved ({approved.length})
                </h3>
                {approved.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No approved claims waiting.</p>
                ) : (
                    <div className="space-y-2">
                        {approved.map(expense => (
                            <ExpenseClaimCard
                                key={expense.id}
                                expense={expense}
                                canManage={canManage}
                                onApprove={() => { }}
                                onReimburse={() => updateStatus.mutate({ expenseId: expense.id, groupId: groupId, status: 'reimbursed' })}
                                isUpdating={updateStatus.isPending}
                            />
                        ))}
                    </div>
                )}

                <h3 className="font-semibold text-lg flex items-center gap-2 mt-6">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Reimbursements ({reimbursed.length})
                </h3>
                {reimbursed.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No finalized reimbursements.</p>
                ) : (
                    <div className="space-y-2 opacity-70">
                        {reimbursed.map(expense => (
                            <ExpenseClaimCard
                                key={expense.id}
                                expense={expense}
                                canManage={false}
                                onApprove={() => { }}
                                onReimburse={() => { }}
                                isUpdating={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ExpenseClaimCard = ({ expense, canManage, onApprove, onReimburse, isUpdating }: any) => {
    return (
        <Card className="p-3 flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-medium">{expense.note || expense.category}</span>
                    <span className="font-bold">₹{expense.amount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>By {expense.payer_name}</span>
                    <span>•</span>
                    <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
                    {expense.receipt_url && (
                        <>
                            <span>•</span>
                            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <Download className="h-3 w-3" /> Receipt
                            </a>
                        </>
                    )}
                </div>
            </div>
            {canManage && (
                <div className="flex items-center gap-2">
                    {expense.status === 'submitted' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-500 hover:text-blue-600" onClick={onApprove} disabled={isUpdating}>
                            Approve
                        </Button>
                    )}
                    {(expense.status === 'submitted' || expense.status === 'approved') && (
                        <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-500 hover:text-emerald-600" onClick={onReimburse} disabled={isUpdating}>
                            <Check className="h-3 w-3 mr-1" /> Reimburse
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
}

export default ReimbursableSettlement;
