import { useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    searchUserByEmail,
    sendFriendRequest,
    createShadowProfile,
    type ProfileSearchResult,
} from "@/lib/friendApi";

interface AddFriendDialogProps {
    onFriendAdded?: () => void;
}

const AddFriendDialog = ({ onFriendAdded }: AddFriendDialogProps) => {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [result, setResult] = useState<ProfileSearchResult | null>(null);
    const [shadowName, setShadowName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const resetState = () => {
        setEmail("");
        setSearching(false);
        setSearched(false);
        setResult(null);
        setShadowName("");
        setSubmitting(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setSearching(true);
        setSearched(false);
        setResult(null);

        try {
            const found = await searchUserByEmail(email);
            setResult(found);
            setSearched(true);
        } catch {
            toast({
                title: "Search failed",
                description: "Could not search for this email. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async () => {
        if (!result) return;
        setSubmitting(true);

        try {
            await sendFriendRequest(result.user_id);
            toast({
                title: "Friend request sent!",
                description: `A request has been sent to ${result.display_name || email}.`,
            });
            setOpen(false);
            resetState();
            onFriendAdded?.();
        } catch (err: any) {
            const isDuplicate = err?.code === "23505" || err?.message?.toLowerCase().includes("already");
            toast({
                title: isDuplicate ? "Already added" : "Failed to send request",
                description: isDuplicate
                    ? (err?.message || "You already have a connection with this user.")
                    : "Something went wrong. Please try again.",
                variant: isDuplicate ? "default" : "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateShadow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shadowName.trim()) return;
        setSubmitting(true);

        try {
            await createShadowProfile({
                displayName: shadowName.trim(),
                email: email.trim(),
            });
            toast({
                title: "Contact added!",
                description: `${shadowName} has been added to your contacts. You can now add them to groups.`,
            });
            setOpen(false);
            resetState();
            onFriendAdded?.();
        } catch {
            toast({
                title: "Failed to add contact",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getInitials = (name: string | null) =>
        (name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetState();
            }}
        >
            <DialogTrigger asChild>
                <Button id="add-friend-btn">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add a Friend</DialogTitle>
                    <DialogDescription>
                        Search by email. If they're on SplitTrack, send a request. If not,
                        add them as a contact.
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Email Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        id="friend-email-input"
                        type="email"
                        placeholder="friend@example.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setSearched(false);
                            setResult(null);
                        }}
                        required
                        disabled={searching}
                    />
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={searching || !email.trim()}
                        id="search-email-btn"
                    >
                        {searching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                    </Button>
                </form>

                {/* Step 2a: User Found (Branch A) */}
                {searched && result && (
                    <div className="mt-2 p-4 rounded-lg border bg-card space-y-3 animate-in fade-in-50">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                    {getInitials(result.display_name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {result.display_name || "User"}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {email}
                                </p>
                            </div>
                            <Badge variant="secondary">Registered</Badge>
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleSendRequest}
                            disabled={submitting}
                            id="send-request-btn"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <UserPlus className="h-4 w-4 mr-2" />
                            )}
                            Send Friend Request
                        </Button>
                    </div>
                )}

                {/* Step 2b: User Not Found (Branch B) */}
                {searched && !result && (
                    <div className="mt-2 p-4 rounded-lg border bg-card space-y-3 animate-in fade-in-50">
                        <p className="text-sm text-muted-foreground">
                            No account found for <span className="font-medium text-foreground">{email}</span>.
                            Add them as a contact and they'll be invited to join.
                        </p>
                        <form onSubmit={handleCreateShadow} className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="shadow-name-input">Their Name</Label>
                                <Input
                                    id="shadow-name-input"
                                    placeholder="e.g. Alex Johnson"
                                    value={shadowName}
                                    onChange={(e) => setShadowName(e.target.value)}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={submitting || !shadowName.trim()}
                                id="create-shadow-btn"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4 mr-2" />
                                )}
                                Add as Contact
                            </Button>
                        </form>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AddFriendDialog;
