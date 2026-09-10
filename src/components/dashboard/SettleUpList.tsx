import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GroupBalanceSummary } from '@/hooks/useDashboardData';
import { FriendBalance } from '@/lib/friendExpensesApi';
import { ArrowDownLeft, ArrowUpRight, Scale, CheckCircle2, ChevronRight } from 'lucide-react';

interface SettleItem {
  id: string;
  name: string;
  type: 'group' | 'friend';
  targetId: string;
  amount: number;
  isOwedToUser: boolean; // true = user is owed, false = user owes
  subText: string;
  link: string;
}

interface SettleUpListProps {
  groupBalances: GroupBalanceSummary[];
  friendBalances: (FriendBalance & { friendName?: string })[];
  className?: string;
}

export const SettleUpList = ({
  groupBalances,
  friendBalances,
  className = '',
}: SettleUpListProps) => {
  const settleItems = useMemo(() => {
    const items: SettleItem[] = [];

    // Add group balances
    groupBalances.forEach((g) => {
      if (Math.abs(g.userNetBalance) > 0.01) {
        const isOwed = g.userNetBalance > 0.01;
        items.push({
          id: `group-${g.groupId}`,
          name: g.groupName,
          type: 'group',
          targetId: g.groupId,
          amount: Math.abs(g.userNetBalance),
          isOwedToUser: isOwed,
          subText: `${g.memberCount} members · Group`,
          link: `/groups/${g.groupId}`,
        });
      }
    });

    // Add friend balances
    friendBalances.forEach((f) => {
      if (Math.abs(f.netBalance) > 0.01) {
        const isOwed = f.netBalance > 0.01;
        items.push({
          id: `friend-${f.friendId}`,
          name: f.friendName || 'Friend',
          type: 'friend',
          targetId: f.friendId,
          amount: Math.abs(f.netBalance),
          isOwedToUser: isOwed,
          subText: '1-on-1 Friend',
          link: `/friends/${f.friendId}`,
        });
      }
    });

    // Sort by amount descending
    return items.sort((a, b) => b.amount - a.amount);
  }, [groupBalances, friendBalances]);

  const topItems = settleItems.slice(0, 5);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-primary" /> Needs Settlement
          </h3>
        </div>
        {settleItems.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/groups">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>

      {topItems.length > 0 ? (
        <div className="flex flex-col gap-3">
          {topItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    item.isOwedToUser
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {item.isOwedToUser ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subText}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p
                    className={`font-mono-num text-sm font-bold ${
                      item.isOwedToUser ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {item.isOwedToUser ? '+' : '-'}₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.isOwedToUser ? 'owes you' : 'you owe'}
                  </p>
                </div>

                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1 shrink-0" asChild>
                  <Link to={item.link}>
                    {item.isOwedToUser ? 'Remind' : 'Settle'}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <p className="font-semibold text-sm text-foreground">All settled up! 🎉</p>
          <p className="text-xs text-muted-foreground">
            You have no pending debts across any groups or friends.
          </p>
        </div>
      )}
    </Card>
  );
};
