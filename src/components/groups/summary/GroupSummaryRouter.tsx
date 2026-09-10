import { GroupExpense, Balance } from '@/hooks/useGroupExpenses';
import { GroupMember, Group } from '@/hooks/useGroups';
import { useInsightEngine } from '@/hooks/useInsightEngine';
import { InsightCards } from './shared/InsightCards';
import { exportSummaryReport } from '@/lib/exportSummary';
import { GenericSummary } from './GenericSummary';
import { SharedLivingSummary } from './SharedLivingSummary';
import { ReimbursableSummary } from './ReimbursableSummary';
import { TripSummary } from './TripSummary';
import { EventSummary } from './EventSummary';
import { DayToDaySummary } from './DayToDaySummary';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface GroupSummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

export const GroupSummaryRouter = (props: GroupSummaryProps) => {
  const { group, expenses, balances, members, currentUserId } = props;
  const insights = useInsightEngine(expenses, balances, members, group, currentUserId);

  const handleExport = () => {
    exportSummaryReport(group, expenses ?? [], balances ?? [], members ?? []);
  };

  const renderDashboard = () => {
    switch (group?.type) {
      case 'shared_living':
        return <SharedLivingSummary {...props} />;
      case 'reimbursable':
        return <ReimbursableSummary {...props} />;
      case 'trip':
        return <TripSummary {...props} />;
      case 'event':
        return <EventSummary {...props} />;
      case 'day_to_day':
        return <DayToDaySummary {...props} />;
      default:
        return <GenericSummary {...props} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Header & Export Button */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Summary & Analytics</h2>
        {expenses && expenses.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport} className="h-8 text-xs shrink-0">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export Report
          </Button>
        )}
      </div>

      {/* Smart Insights Cards */}
      <InsightCards insights={insights} />

      {/* Active Group Type Summary Component */}
      {renderDashboard()}
    </div>
  );
};

export default GroupSummaryRouter;
