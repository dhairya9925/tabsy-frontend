import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useJoinGroup, useGroupMembers } from '@/hooks/useGroups';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const JoinGroup = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const joinGroup = useJoinGroup();

    // Also check if they are already a member to redirect gracefully
    const { data: members, isLoading: membersLoading } = useGroupMembers(id);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!id || !user) return;

        const handleJoin = async () => {
            try {
                await joinGroup.mutateAsync(id);
                setStatus('success');
                toast({ title: 'Successfully joined group!' });

                // Short delay to show success icon, then redirect
                setTimeout(() => {
                    navigate(`/groups/${id}`);
                }, 1500);
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message);

                // If they are already a member, we can just redirect them
                if (err.message === 'You are already a member of this group' || err.message.includes('already a member')) {
                    setTimeout(() => {
                        navigate(`/groups/${id}`);
                    }, 1500);
                }
            }
        };

        // Before attempting to join, if members are loaded and they are already there, redirect immediately
        if (!membersLoading && members) {
            const isMember = members.some((m) => m.user_id === user.id);
            if (isMember) {
                navigate(`/groups/${id}`);
                return;
            }
            handleJoin();
        }
    }, [id, user, membersLoading, members, navigate, joinGroup, toast]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Joining Group</h1>

                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Verifying invitation...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="pt-4 space-y-4">
                            <p className="text-green-600 font-medium">Successfully joined!</p>
                            <p className="text-sm text-muted-foreground">Redirecting you to the group...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="pt-4 space-y-4">
                            <p className="text-destructive font-medium">{errorMessage}</p>
                            <div className="flex gap-4 pt-4">
                                <Button variant="outline" className="w-full" onClick={() => navigate('/groups')}>
                                    Back to Groups
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default JoinGroup;
