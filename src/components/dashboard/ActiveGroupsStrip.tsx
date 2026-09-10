import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GroupBalanceSummary } from '@/hooks/useDashboardData';
import { Home, Plane, Calendar, Briefcase, Coffee, Users, Plus, ChevronRight } from 'lucide-react';

interface ActiveGroupsStripProps {
  groups: GroupBalanceSummary[];
  className?: string;
}

const getGroupIcon = (type: string) => {
  switch (type) {
    case 'shared_living':
      return Home;
    case 'trip':
      return Plane;
    case 'event':
      return Calendar;
    case 'reimbursable':
      return Briefcase;
    case 'day_to_day':
      return Coffee;
    default:
      return Users;
  }
};

const getGroupTypeLabel = (type: string) => {
  switch (type) {
    case 'shared_living':
      return 'Shared Living';
    case 'trip':
      return 'Trip';
    case 'event':
      return 'Event';
    case 'reimbursable':
      return 'Reimbursable';
    case 'day_to_day':
      return 'Day to Day';
    default:
      return 'Group';
  }
};

export const ActiveGroupsStrip = ({ groups, className = '' }: ActiveGroupsStripProps) => {
  if (!groups.length) {
    return (
      <div className={`glass-card p-6 text-center space-y-3 ${className}`}>
        <div className="text-3xl">👥</div>
        <div>
          <p className="font-semibold text-foreground text-sm">No active groups yet</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Create or join a group to split rent, trips, or daily expenses with friends.
          </p>
        </div>
        <Link to="/groups">
          <Badge variant="outline" className="cursor-pointer hover:bg-muted gap-1 text-xs py-1 px-3 mt-1">
            <Plus className="h-3.5 w-3.5" /> Explore Groups
          </Badge>
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" /> Active Groups ({groups.length})
        </h2>
        <Link to="/groups" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {groups.map((group) => {
          const IconComponent = getGroupIcon(group.groupType);
          const isOwed = group.userNetBalance > 0.01;
          const isOwes = group.userNetBalance < -0.01;

          return (
            <Link key={group.groupId} to={`/groups/${group.groupId}`} className="shrink-0">
              <Card className="p-3.5 w-52 transition-all duration-200 hover:shadow-md hover:border-primary/40 space-y-2.5 bg-card/60 backdrop-blur-sm border-border/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-normal">
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-foreground truncate">{group.groupName}</h3>
                  <p className="text-[11px] text-muted-foreground">{getGroupTypeLabel(group.groupType)}</p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Your balance:</span>
                  <span
                    className={`font-semibold font-mono-num ${
                      isOwed
                        ? 'text-emerald-500'
                        : isOwes
                        ? 'text-rose-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isOwed
                      ? `+₹${group.userNetBalance.toLocaleString('en-IN')}`
                      : isOwes
                      ? `-₹${Math.abs(group.userNetBalance).toLocaleString('en-IN')}`
                      : 'Settled ✓'}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
