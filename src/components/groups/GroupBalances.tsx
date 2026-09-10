import { ArrowRight, CheckCircle2, Handshake } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Balance, useSettleUp } from '@/hooks/useGroupExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  balances: Balance[];
  loading: boolean;
  groupId: string;
}

const GroupBalances = ({ balances, loading, groupId }: Props) => {
  const { user } = useAuth();
  const settleUp = useSettleUp();
  const { toast } = useToast();

  const handleSettle = async (b: Balance) => {
    try {
      await settleUp.mutateAsync({
        groupId,
        fromUserId: b.from_user_id,
        toUserId: b.to_user_id,
      });
      toast({ title: 'Settled up!', description: `${b.from_name} → ${b.to_name} marked as settled.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!balances.length) {
    return (
      <Card className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
        <p className="text-sm font-medium text-foreground">All settled up!</p>
        <p className="text-xs text-muted-foreground">No outstanding balances</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {balances.map((b, i) => {
        const isYouOwe = b.from_user_id === user?.id;
        const isOwedToYou = b.to_user_id === user?.id;
        const canSettle = isYouOwe || isOwedToYou;

        return (
          <Card
            key={i}
            className={`p-3 ${isYouOwe ? 'border-destructive/30' : isOwedToYou ? 'border-primary/30' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className={`font-medium truncate max-w-[40%] ${isYouOwe ? 'text-destructive' : 'text-foreground'}`}>
                {isYouOwe ? 'You' : b.from_name}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className={`font-medium truncate max-w-[40%] ${isOwedToYou ? 'text-primary' : 'text-foreground'}`}>
                {isOwedToYou ? 'You' : b.to_name}
              </span>
              <span className="ml-auto font-bold text-foreground shrink-0">
                ₹{b.amount.toFixed(2)}
              </span>
              {canSettle && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0">
                      <Handshake className="h-3 w-3 mr-1" /> Settle
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Settle up?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mark ₹{b.amount.toFixed(2)} from {b.from_name} to {b.to_name} as settled. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleSettle(b)} disabled={settleUp.isPending}>
                        {settleUp.isPending ? 'Settling...' : 'Confirm'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default GroupBalances;
