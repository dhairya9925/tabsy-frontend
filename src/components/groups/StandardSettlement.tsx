import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useGroupBalances } from '@/hooks/useGroupExpenses';
import GroupBalances from '@/components/groups/GroupBalances';
import { Calculator } from 'lucide-react';

interface StandardSettlementProps {
    groupId: string;
}

const StandardSettlement = ({ groupId }: StandardSettlementProps) => {
    const { data: balances, isLoading } = useGroupBalances(groupId);

    return (
        <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Calculator className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Debt Resolution</CardTitle>
                        <p className="text-sm text-muted-foreground font-normal">Settle up outstanding balances directly.</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <GroupBalances balances={balances ?? []} loading={isLoading} groupId={groupId} />
            </CardContent>
        </Card>
    );
};

export default StandardSettlement;
