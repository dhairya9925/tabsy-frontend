import { useEffect, useState } from "react";
import { Check, X, Loader2, UserMinus, Ghost, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useFriendBalances } from "@/hooks/useFriendExpenses";
import FriendSettleUpDialog from "./FriendSettleUpDialog";
import {
    getFriends,
    getPendingRequests,
    getSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    type FriendRecord,
} from "@/lib/friendApi";

type FriendWithProfile = FriendRecord;

const FriendsList = ({ refreshKey }: { refreshKey?: number }) => {
    const [friends, setFriends] = useState<FriendWithProfile[]>([]);
    const [pending, setPending] = useState<FriendWithProfile[]>([]);
    const [sent, setSent] = useState<FriendWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { data: balances, isLoading: balancesLoading } = useFriendBalances();

    const fetchAll = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const [friendsData, pendingData, sentData] = await Promise.all([
                getFriends(),
                getPendingRequests(),
                getSentRequests(),
            ]);

            const currentUserId = user.id;
            const acceptedFriendIds = new Set<string>();
            const acceptedEmails = new Set<string>();

            friendsData.forEach((f) => {
                const counterpartId = f.user_id === currentUserId ? f.friend_id : f.user_id;
                if (counterpartId) acceptedFriendIds.add(counterpartId);
                if (f.profile?.user_id) acceptedFriendIds.add(f.profile.user_id);
                if (f.profile?.email) acceptedEmails.add(f.profile.email.toLowerCase());
            });

            // Filter out sent requests where counterpart is already friends or has no profile
            const validSentData = sentData.filter((s) => {
                if (!s.profile && !s.friend_id) return false;
                const counterpartId = s.user_id === currentUserId ? s.friend_id : s.user_id;
                if (counterpartId && acceptedFriendIds.has(counterpartId)) return false;
                if (s.profile?.user_id && acceptedFriendIds.has(s.profile.user_id)) return false;
                if (s.profile?.email && acceptedEmails.has(s.profile.email.toLowerCase())) return false;
                return true;
            });

            // Quietly delete stale sent requests on server
            sentData.forEach((s) => {
                const counterpartId = s.user_id === currentUserId ? s.friend_id : s.user_id;
                const isStale = (!s.profile && !s.friend_id) ||
                    (counterpartId && acceptedFriendIds.has(counterpartId)) ||
                    (s.profile?.user_id && acceptedFriendIds.has(s.profile.user_id)) ||
                    (s.profile?.email && acceptedEmails.has(s.profile.email.toLowerCase()));
                if (isStale && s.id) {
                    removeFriend(s.id).catch(() => {});
                }
            });

            // Filter out pending requests where counterpart is already friends
            const validPendingData = pendingData.filter((p) => {
                if (!p.profile && !p.user_id) return false;
                const counterpartId = p.user_id === currentUserId ? p.friend_id : p.user_id;
                if (counterpartId && acceptedFriendIds.has(counterpartId)) return false;
                if (p.profile?.user_id && acceptedFriendIds.has(p.profile.user_id)) return false;
                if (p.profile?.email && acceptedEmails.has(p.profile.email.toLowerCase())) return false;
                return true;
            });

            setFriends(friendsData);
            setPending(validPendingData);
            setSent(validSentData);
        } catch {
            toast({
                title: "Error loading friends",
                description: "Could not load your friends list.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [user, refreshKey]);

    const handleAccept = async (id: string) => {
        setActionLoading(id);
        try {
            await acceptFriendRequest(id);
            toast({ title: "Friend request accepted!" });
            fetchAll();
        } catch {
            toast({
                title: "Failed to accept",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        try {
            await rejectFriendRequest(id);
            toast({ title: "Friend request rejected." });
            fetchAll();
        } catch {
            toast({
                title: "Failed to reject",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemove = async (id: string) => {
        setActionLoading(id);
        try {
            await removeFriend(id);
            toast({ title: "Friend removed." });
            fetchAll();
        } catch {
            toast({
                title: "Failed to remove",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setActionLoading(null);
        }
    };

    const getInitials = (name: string | null) =>
        (name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    const FriendCard = ({
        friend,
        actions,
        showBalance = false,
    }: {
        friend: FriendWithProfile;
        actions?: React.ReactNode;
        showBalance?: boolean;
    }) => {
        const otherId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;
        const balanceRecord = balances?.find(b => b.friendId === otherId);
        const netBalance = balanceRecord?.netBalance || 0;

        const handleClick = (e: React.MouseEvent) => {
            if (!showBalance) return;
            // Prevent navigation if clicking inside a button or dialog
            if ((e.target as HTMLElement).closest('button')) return;
            if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
            navigate(`/friends/${otherId}`);
        };

        return (
            <Card
                className={`p-4 ${showBalance ? 'cursor-pointer hover:bg-secondary/40 transition-colors' : ''}`}
                onClick={handleClick}
            >
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {getInitials(friend.profile?.display_name || null)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                                {friend.profile?.display_name || "Unknown"}
                            </p>
                            {friend.profile?.is_shadow && (
                                <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                    <Ghost className="h-3 w-3" />
                                    Contact
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                            {friend.profile?.email || "No email"}
                        </p>
                        {showBalance && !balancesLoading && (
                            <p className={`text-xs mt-1 ${netBalance > 0 ? 'text-green-500 font-semibold' : netBalance < 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                {netBalance > 0 ? `Owes you ₹${Math.abs(netBalance).toFixed(2)}` : netBalance < 0 ? `You owe ₹${Math.abs(netBalance).toFixed(2)}` : 'Settled up'}
                            </p>
                        )}
                        {showBalance && balancesLoading && (
                            <div className="h-3 w-16 bg-muted animate-pulse rounded mt-1"></div>
                        )}
                    </div>
                    {showBalance && netBalance < 0 && (
                        <div className="shrink-0 mr-1" onClick={e => e.stopPropagation()}>
                            <FriendSettleUpDialog
                                friendId={otherId}
                                friendName={friend.profile?.display_name || friend.profile?.email || "Unknown"}
                                netBalance={netBalance}
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0 z-10" onClick={e => e.stopPropagation()}>
                        {actions}
                    </div>
                </div>
            </Card>
        );
    };

    const EmptyState = ({ message }: { message: string }) => (
        <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{message}</p>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Tabs defaultValue="friends" className="w-full">
            <TabsList className="w-full">
                <TabsTrigger value="friends" className="flex-1">
                    Friends{friends.length > 0 && ` (${friends.length})`}
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex-1">
                    Requests
                    {pending.length > 0 && (
                        <Badge variant="destructive" className="ml-1.5 h-5 w-5 p-0 text-[10px] justify-center">
                            {pending.length}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex-1">
                    Sent{sent.length > 0 && ` (${sent.length})`}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-2 mt-4">
                {friends.length === 0 ? (
                    <EmptyState message="No friends yet. Add someone using the button above!" />
                ) : (
                    friends.map((f) => (
                        <FriendCard
                            key={f.id}
                            friend={f}
                            showBalance={true}
                            actions={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemove(f.id)}
                                    disabled={actionLoading === f.id}
                                >
                                    {actionLoading === f.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <UserMinus className="h-4 w-4" />
                                    )}
                                </Button>
                            }
                        />
                    ))
                )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-2 mt-4">
                {pending.length === 0 ? (
                    <EmptyState message="No pending friend requests." />
                ) : (
                    pending.map((f) => (
                        <FriendCard
                            key={f.id}
                            friend={f}
                            actions={
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                        onClick={() => handleAccept(f.id)}
                                        disabled={actionLoading === f.id}
                                    >
                                        {actionLoading === f.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleReject(f.id)}
                                        disabled={actionLoading === f.id}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            }
                        />
                    ))
                )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-2 mt-4">
                {sent.length === 0 ? (
                    <EmptyState message="No sent friend requests." />
                ) : (
                    sent.map((f) => (
                        <FriendCard
                            key={f.id}
                            friend={f}
                            actions={
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="gap-1">
                                        <Clock className="h-3 w-3" />
                                        Pending
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemove(f.id)}
                                        disabled={actionLoading === f.id}
                                        title="Cancel request"
                                    >
                                        {actionLoading === f.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <X className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            }
                        />
                    ))
                )}
            </TabsContent>
        </Tabs>
    );
};

export default FriendsList;
