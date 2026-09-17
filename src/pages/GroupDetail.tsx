import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Crown, Mail, Download, Plus, ShieldCheck, ShieldOff, Pencil, Search } from 'lucide-react';
import { useExpenseFilters } from '@/hooks/useExpenseFilters';
import ExpenseFilterBar from '@/components/expenses/ExpenseFilterBar';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useGroup, useGroupMembers, useRemoveGroupMember, useUpdateMemberRole } from '@/hooks/useGroups';

import { useGroupExpenses, useGroupBalances, useUpdateExpenseStatus, useBulkSettle, useDeleteGroupExpense } from '@/hooks/useGroupExpenses';
import { getCategoryById } from '@/lib/categories';
import { exportGroupExpensesToExcel } from '@/lib/exportGroupExpenses';
import { getGroupTypeConfig } from '@/lib/groupTypes';
import GroupExpenseForm from '@/components/groups/GroupExpenseForm';
import GroupedExpenseList from '@/components/expenses/GroupedExpenseList';
import GroupSummary from '@/components/groups/GroupSummary';
import GroupBalances from '@/components/groups/GroupBalances';
import AddGroupMemberDialog from '@/components/groups/AddGroupMemberDialog';
import SettlementTab from '@/components/groups/SettlementTab';
import GroupSettings from '@/components/groups/GroupSettings';
import BulkGroupExpenseForm from '@/components/groups/BulkGroupExpenseForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { generateSampleData } from '@/utils/mockData';

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const { data: expenses, isLoading: expensesLoading } = useGroupExpenses(id);
  const {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedMember,
    setSelectedMember,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    activePreset,
    applyPreset,
    yearOptions,
    monthOptions,
    memberOptions,
    filteredExpenses,
    filteredTotal,
    clearFilters,
    isFiltered,
  } = useExpenseFilters(expenses);
  const { data: balances, isLoading: balancesLoading } = useGroupBalances(id);
  const updateStatus = useUpdateExpenseStatus();
  const bulkSettle = useBulkSettle();
  const removeMember = useRemoveGroupMember();
  const updateMemberRole = useUpdateMemberRole();
  const deleteExpense = useDeleteGroupExpense();
  const [isGenerating, setIsGenerating] = useState(false);

  // Admin if current user's role in group_members is 'admin'
  const currentMember = members?.find(m => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin' || group?.created_by === user?.id;



  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      await removeMember.mutateAsync({ groupId: id, userId });
      toast({ title: 'Member removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    if (!id) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await updateMemberRole.mutateAsync({ groupId: id, userId, role: newRole });
      toast({ title: newRole === 'admin' ? 'Member promoted to admin' : 'Admin demoted to member' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleGenerateData = async () => {
    if (!user || !id) return;
    setIsGenerating(true);
    toast({ title: 'Generating sample data...' });

    const result = await generateSampleData(user.id, id);

    if (result.success) {
      toast({ title: 'Sample data generated successfully' });
      window.location.reload(); // Refresh to fetch new balances and expenses
    } else {
      toast({ title: 'Error', description: result.error?.message || 'Failed to generate data', variant: 'destructive' });
      setIsGenerating(false);
    }
  };

  if (groupLoading || membersLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="link" onClick={() => navigate('/groups')}>Back to groups</Button>
      </div>
    );
  }

  const groupType = getGroupTypeConfig(group.type);
  const TypeIcon = groupType.icon;

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return '??';
  };

  const handleCopyLink = () => {
    const code = group.invite_code || group.id;
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied to clipboard!' });
  };

  const handleCopyCode = () => {
    const code = group.invite_code || group.id;
    navigator.clipboard.writeText(code);
    toast({ title: 'Invite code copied to clipboard!' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3" data-mobile="group-header">
        <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground truncate">{group.name}</h1>
            <div className={`flex shrink-0 items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${groupType.color}`}>
              <TypeIcon className="h-4 w-4" />
              {groupType.label}
            </div>
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground truncate">{group.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" data-mobile="invite-buttons">
        <Button variant="outline" size="sm" onClick={handleCopyCode}>
          Copy Invite Code
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          Copy Invite Link
        </Button>
      </div>

      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="balances" className="flex-1 min-w-[5rem]">Balances</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 min-w-[5rem]">Expenses</TabsTrigger>
          <TabsTrigger value="settlement" className="flex-1 min-w-[5rem]">Settlement</TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 min-w-[5rem]">Summary</TabsTrigger>
          <TabsTrigger value="members" className="flex-1 min-w-[5rem]">Members</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 min-w-[5rem]">Settings</TabsTrigger>
        </TabsList>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Who Owes Whom</h2>
          </div>
          <GroupBalances balances={balances ?? []} loading={balancesLoading} groupId={id!} />
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <GroupSummary
            expenses={expenses ?? []}
            balances={balances ?? []}
            members={members ?? []}
            group={group}
            currentUserId={user?.id}
            loading={expensesLoading}
          />
        </TabsContent>

        {/* Settlement Tab */}
        <TabsContent value="settlement" className="space-y-4">
          <SettlementTab groupId={id!} groupType={group.type} />
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground mr-auto">Expenses</h2>
            
            <div className="flex items-center gap-2">
              {import.meta.env.DEV && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateData}
                  disabled={isGenerating}
                  className="hidden md:inline-flex"
                >
                  {isGenerating ? "Generating..." : "Generate Dummy Data"}
                </Button>
              )}
              {expenses && expenses.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => exportGroupExpensesToExcel(expenses, group.name)}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              )}
              <BulkGroupExpenseForm groupId={id!} members={members || []} groupType={group?.type || 'shared'} />
            </div>
            
            <div className="w-full sm:w-auto sm:ml-2">
              <GroupExpenseForm 
                groupId={id!} 
                members={members || []} 
                groupType={group?.type || 'shared'} 
                trigger={
                  <Button size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Add Expense
                  </Button>
                }
              />
            </div>
          </div>

          {/* Enhanced Filter Bar + Presets + Search + Category */}
          {!expensesLoading && expenses && expenses.length > 0 && (
            <ExpenseFilterBar
              yearOptions={yearOptions}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              monthOptions={monthOptions}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              memberOptions={memberOptions}
              selectedMember={selectedMember}
              onMemberChange={setSelectedMember}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activePreset={activePreset}
              onApplyPreset={applyPreset}
              filteredCount={filteredExpenses.filter(e => e.category !== 'system').length}
              totalCount={expenses.filter(e => e.category !== 'system').length}
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
            <Card className="flex flex-col items-center py-10 text-center">
              <p className="text-sm text-muted-foreground">No expenses yet. Add one to start splitting!</p>
            </Card>
          ) : filteredExpenses.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Search className="h-8 w-8 text-primary opacity-60 mb-1" />
              <p className="text-sm font-medium text-foreground">No expenses match your active filters.</p>
              <p className="text-xs text-muted-foreground">Try selecting a different month or member.</p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                Clear Filters
              </Button>
            </Card>
          ) : (
            <GroupedExpenseList
              expenses={filteredExpenses}
              group={group}
              members={members || []}
              user={user}
              onUpdateStatus={(expenseId, status) =>
                updateStatus.mutate({ expenseId, groupId: id!, status })
              }
              onDeleteExpense={(expenseId) => {
                deleteExpense.mutate({ expenseId, groupId: id! }, {
                  onSuccess: () => toast({ title: 'Expense deleted' }),
                  onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
                });
              }}
            />
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Members ({members?.length ?? 0})</h2>
            {isAdmin && (
              <AddGroupMemberDialog
                groupId={id!}
                existingMemberIds={members?.map((m) => m.user_id) || []}
              />
            )}
          </div>

          <div className="space-y-2">
            {members?.map(member => (
              <Card key={member.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                      {getInitials(member.profile?.display_name ?? null, member.profile?.email ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {member.profile?.display_name || member.profile?.email || 'Unknown'}
                      </span>
                      {member.role === 'admin' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Crown className="h-3 w-3 mr-0.5" /> Admin
                        </Badge>
                      )}
                    </div>
                    {member.profile?.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {member.profile.email}
                      </p>
                    )}
                  </div>
                  {isAdmin && member.user_id !== user?.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title={member.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                        onClick={() => handleToggleAdmin(member.user_id, member.role)}
                        disabled={updateMemberRole.isPending}
                      >
                        {member.role === 'admin' ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove {member.profile?.display_name || 'this member'} from the group.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          </div>
          <GroupSettings group={group} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GroupDetail;
