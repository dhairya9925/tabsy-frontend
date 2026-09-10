import { useState } from "react";
import { Users } from "lucide-react";
import AddFriendDialog from "@/components/friends/AddFriendDialog";
import FriendsList from "@/components/friends/FriendsList";

const Friends = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleFriendAdded = () => {
        setRefreshKey((k) => k + 1);
    };

    return (
        <div className="space-y-6 animate-in fade-in-50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Friends
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your friends and contacts
                    </p>
                </div>
                <AddFriendDialog onFriendAdded={handleFriendAdded} />
            </div>

            <FriendsList refreshKey={refreshKey} />
        </div>
    );
};

export default Friends;
