import { useState, useEffect } from "react";
import { UserPlus, Search, Users, Loader2, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAddGroupMember } from "@/hooks/useGroups";
import { getFriends, type FriendRecord } from "@/lib/friendApi";

interface AddGroupMemberDialogProps {
    groupId: string;
    existingMemberIds: string[];
}

interface FriendWithProfile extends FriendRecord {
    profile?: {
        user_id: string;
        display_name: string | null;
        email: string | null;
        is_shadow: boolean;
    };
}

const AddGroupMemberDialog = ({
    groupId,
    existingMemberIds,
}: AddGroupMemberDialogProps) => {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [friends, setFriends] = useState<FriendWithProfile[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();
    const addMember = useAddGroupMember();

    const fetchFriends = async () => {
        if (!user) return;
        setLoadingFriends(true);
        try {
            const friendsData = await getFriends();
            setFriends(friendsData as FriendWithProfile[]);
        } catch {
            // silently fail, user can still use email
        } finally {
            setLoadingFriends(false);
        }
    };

    useEffect(() => {
        if (open) fetchFriends();
    }, [open]);

    const handleAddByEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        try {
            await addMember.mutateAsync({ groupId, email: email.trim() });
            toast({ title: "Member added!" });
            setEmail("");
            setOpen(false);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const handleAddFriend = async (friendProfile: FriendWithProfile["profile"]) => {
        if (!friendProfile?.email) return;
        setAddingId(friendProfile.user_id);
        try {
            await addMember.mutateAsync({
                groupId,
                email: friendProfile.email,
            });
            toast({
                title: "Member added!",
                description: `${friendProfile.display_name || friendProfile.email} has been added to the group.`,
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setAddingId(null);
        }
    };

    const getInitials = (name: string | null) =>
        (name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    // Filter out already added members
    const availableFriends = friends.filter((f) => {
        const otherId =
            f.user_id === user?.id ? f.friend_id : f.user_id;
        return !existingMemberIds.includes(otherId);
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" id="add-group-member-btn">
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="friends">
                    <TabsList className="w-full">
                        <TabsTrigger value="friends" className="flex-1">
                            <Users className="h-4 w-4 mr-1.5" />
                            From Friends
                        </TabsTrigger>
                        <TabsTrigger value="email" className="flex-1">
                            <Search className="h-4 w-4 mr-1.5" />
                            By Email
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="friends" className="mt-4 space-y-2">
                        {loadingFriends ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : availableFriends.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p className="text-sm">
                                    {friends.length === 0
                                        ? "No friends yet. Add friends first from the Friends page!"
                                        : "All your friends are already in this group."}
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                                {availableFriends.map((f) => {
                                    const isAdding = addingId === f.profile?.user_id;
                                    const alreadyMember = existingMemberIds.includes(
                                        f.profile?.user_id || ""
                                    );

                                    return (
                                        <Card key={f.id} className="p-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                        {getInitials(f.profile?.display_name || null)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-sm truncate">
                                                            {f.profile?.display_name || "Unknown"}
                                                        </span>
                                                        {f.profile?.is_shadow && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0"
                                                            >
                                                                <Ghost className="h-2.5 w-2.5" />
                                                                Contact
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {f.profile?.email || "No email"}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={isAdding || alreadyMember}
                                                    onClick={() => handleAddFriend(f.profile)}
                                                >
                                                    {isAdding ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : alreadyMember ? (
                                                        "Added"
                                                    ) : (
                                                        "Add"
                                                    )}
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="email" className="mt-4">
                        <form onSubmit={handleAddByEmail} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="member-email">Email Address</Label>
                                <Input
                                    id="member-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={addMember.isPending}
                            >
                                {addMember.isPending ? "Adding..." : "Add Member"}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AddGroupMemberDialog;
