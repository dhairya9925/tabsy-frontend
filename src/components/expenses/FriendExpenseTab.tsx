import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import FriendExpenseForm from '@/components/friends/FriendExpenseForm';
import { getFriends } from '@/lib/friendApi';
import { useAuth } from '@/contexts/AuthContext';

export const FriendExpenseTab = ({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) => {
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<string>('');
  const { user } = useAuth();

  const { data: friends } = useQuery({
    queryKey: ['friends', 'enriched', user?.id],
    queryFn: async () => {
      const friendsData = await getFriends();
      if (!friendsData.length) return [];
      
      return friendsData.map(f => {
        const otherId = f.user_id === user?.id ? f.friend_id : f.user_id;
        return {
          ...f,
          friend_user_id: otherId,
          friend_name: f.profile?.display_name || f.profile?.email || 'Unknown'
        };
      });
    },
    enabled: !!user
  });

  const selectedFriend = friends?.find(f => f.id === selectedFriendshipId);

  return (
    <div className="space-y-4 pt-4">
      {!selectedFriendshipId ? (
        <div className="space-y-4">
          {(!friends || friends.length === 0) ? (
            <div className="text-sm text-center text-muted-foreground p-6 bg-muted/30 border border-dashed rounded-md">
              You don't have any friends added. Head to the Friends tab to add one!
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select a Friend</Label>
              <Select value={selectedFriendshipId} onValueChange={setSelectedFriendshipId}>
                <SelectTrigger><SelectValue placeholder="Choose a friend..." /></SelectTrigger>
                <SelectContent>
                  {friends?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.friend_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-4 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
            <span className="font-medium text-sm">Friend: {selectedFriend?.friend_name}</span>
            <button type="button" className="text-xs text-primary underline" onClick={() => setSelectedFriendshipId('')}>Change</button>
          </div>
          
          <div className="pt-2">
            <FriendExpenseForm 
              friendId={selectedFriend?.friend_user_id || ''} 
              friendName={selectedFriend?.friend_name || ''} 
              inline
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};
