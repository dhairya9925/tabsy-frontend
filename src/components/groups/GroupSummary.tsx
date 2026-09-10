import { GroupSummaryRouter, GroupSummaryProps } from './summary/GroupSummaryRouter';

export const GroupSummary = (props: GroupSummaryProps) => {
  return <GroupSummaryRouter {...props} />;
};

export default GroupSummary;
