import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRecordFriendPayment } from '@/hooks/useFriendExpenses';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface Props {
    friendId: string;
    friendName: string;
    netBalance: number; // positive = they owe you, negative = you owe them
}

const FriendSettleUpDialog = ({ friendId, friendName, netBalance }: Props) => {
    const { toast } = useToast();
    const recordPayment = useRecordFriendPayment();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(Math.abs(netBalance).toString());

    const iOweThem = netBalance < 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            toast({ title: 'Enter a valid amount', variant: 'destructive' });
            return;
        }

        try {
            // If I owe them, I am the payer (auth user).
            // If they owe me, they are the payer (friendId).
            const payerId = iOweThem ? undefined : friendId; // undefined defaults to current user in the API

            await recordPayment.mutateAsync({ friendId, amount: paymentAmount, payerId });
            toast({ title: 'Payment recorded!' });
            setOpen(false);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="default" disabled={netBalance === 0}>
                    Settle Up
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record a Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    <div className="flex items-center justify-center gap-4 py-4 px-2 bg-secondary/50 rounded-lg">
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-medium">{iOweThem ? 'You' : friendName}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-medium">{iOweThem ? friendName : 'You'}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Amount (₹)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={recordPayment.isPending}>
                        {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FriendSettleUpDialog;
