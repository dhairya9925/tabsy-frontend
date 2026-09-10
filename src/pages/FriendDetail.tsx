import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ghost, Mail, Pencil, Trash2, Search } from 'lucide-react';
import { useFriendExpenseFilters } from '@/hooks/useFriendExpenseFilters';
import FriendFilterBar from '@/components/friends/FriendFilterBar';
import GroupedFriendExpenseList from '@/components/friends/GroupedFriendExpenseList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { format } from 'date-fns';
import { getCategoryById } from '@/lib/categories';
import { useFriendExpenses, useFriendBalances, useDeleteFriendExpense } from '@/hooks/useFriendExpenses';
import FriendSettleUpDialog from '@/components/friends/FriendSettleUpDialog';
import FriendExpenseForm from '@/components/friends/FriendExpenseForm';
import { useToast } from '@/hooks/use-toast';

const FriendDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const deleteExpense = useDeleteFriendExpense();

    // Fetch friend basic profile info
    const { data: friendProfile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', id],
        queryFn: async () => {
            const res = await apiClient.get<{
                id: string;
                user_id: string;
                display_name: string | null;
                email: string | null;
                avatar_url: string | null;
                is_shadow: boolean;
            }>(`/api/v1/friends/${id}/profile`);
            if (res.error) throw new Error(res.error);
            return res.data;
        },
        enabled: !!id,
    });

    // Fetch balances and expenses
    const { data: balances, isLoading: balancesLoading } = useFriendBalances();
    const { data: expenses, isLoading: expensesLoading } = useFriendExpenses(id);

    const friendName = friendProfile?.display_name || friendProfile?.email || 'Unknown';
    const {
        selectedYear,
        setSelectedYear,
        selectedMonth,
        setSelectedMonth,
        selectedPayer,
        setSelectedPayer,
        searchQuery,
        setSearchQuery,
        activePreset,
        applyPreset,
        yearOptions,
        monthOptions,
        payerOptions,
        filteredExpenses,
        filteredTotal,
        clearFilters,
        isFiltered,
    } = useFriendExpenseFilters(expenses, user?.id, friendName);

    if (profileLoading || balancesLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!friendProfile) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Friend not found</p>
                <Button variant="link" onClick={() => navigate('/friends')}>Back to friends</Button>
            </div>
        );
    }

    // Find the specific balance for this friend
    const balanceRecord = balances?.find(b => b.friendId === id);
    const netBalance = balanceRecord?.netBalance || 0;

    const getInitials = (name: string | null, email: string | null) => {
        if (name) return name.slice(0, 2).toUpperCase();
        if (email) return email.slice(0, 2).toUpperCase();
        return '??';
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/friends')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </div>

            <Card className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <Avatar className="h-20 w-20">
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                            {getInitials(friendProfile?.display_name, friendProfile?.email)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold truncate">{friendName}</h1>
                            {friendProfile.is_shadow && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Ghost className="h-3 w-3" /> Contact
                                </Badge>
                            )}
                        </div>
                        {friendProfile.email && (
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                <Mail className="h-4 w-4" /> {friendProfile.email}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-1 min-w-[140px] bg-secondary/30 p-4 rounded-xl">
                        <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
                        {netBalance === 0 ? (
                            <span className="text-lg font-bold text-muted-foreground">Settled up</span>
                        ) : netBalance > 0 ? (
                            <span className="text-lg font-bold text-green-500">Owes you ₹{Math.abs(netBalance).toFixed(2)}</span>
                        ) : (
                            <span className="text-lg font-bold text-red-500">You owe ₹{Math.abs(netBalance).toFixed(2)}</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
                    <FriendExpenseForm friendId={id!} friendName={friendName} />
                    {netBalance !== 0 && (
                        <FriendSettleUpDialog friendId={id!} friendName={friendName} netBalance={netBalance} />
                    )}
                </div>
            </Card>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold px-1">Shared Expenses</h2>

                {/* Filter Bar */}
                {!expensesLoading && expenses && expenses.length > 0 && (
                    <FriendFilterBar
                        yearOptions={yearOptions}
                        selectedYear={selectedYear}
                        onYearChange={setSelectedYear}
                        monthOptions={monthOptions}
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                        payerOptions={payerOptions}
                        selectedPayer={selectedPayer}
                        onPayerChange={setSelectedPayer}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activePreset={activePreset}
                        onApplyPreset={applyPreset}
                        filteredCount={filteredExpenses.length}
                        totalCount={expenses.length}
                        filteredTotal={filteredTotal}
                        isFiltered={isFiltered}
                        onClearFilters={clearFilters}
                    />
                )}

                {expensesLoading ? (
                    <div className="flex justify-center py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                ) : !expenses?.length ? (
                    <Card className="flex flex-col items-center py-10 text-center text-muted-foreground text-sm">
                        No shared expenses found. Add one to get started!
                    </Card>
                ) : filteredExpenses.length === 0 ? (
                    <Card className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                        <Search className="h-8 w-8 text-primary opacity-60 mb-1" />
                        <p className="text-sm font-medium text-foreground">No shared items match your active filters.</p>
                        <p className="text-xs text-muted-foreground">Try searching another term or resetting filters.</p>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                            Clear Filters
                        </Button>
                    </Card>
                ) : (
                    <GroupedFriendExpenseList
                        expenses={filteredExpenses}
                        friendId={id!}
                        friendName={friendName}
                        user={user}
                        onDeleteExpense={(expenseId) => {
                            deleteExpense.mutate({ expenseId, friendId: id! }, {
                                onSuccess: () => toast({ title: 'Expense deleted' }),
                                onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
                            });
                        }}
                    />
                )}
            </div>

        </div>
    );
};

export default FriendDetail;
