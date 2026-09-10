import SharedLivingSettlement from './SharedLivingSettlement';
import ReimbursableSettlement from './ReimbursableSettlement';
import StandardSettlement from './StandardSettlement';

interface SettlementTabProps {
    groupId: string;
    groupType: string;
}

const SettlementTab = ({ groupId, groupType }: SettlementTabProps) => {
    switch (groupType) {
        case 'shared_living':
            return <SharedLivingSettlement groupId={groupId} />;
        case 'reimbursable':
            return <ReimbursableSettlement groupId={groupId} />;
        default:
            return <StandardSettlement groupId={groupId} />;
    }
};

export default SettlementTab;
