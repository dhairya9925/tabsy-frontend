import { useState } from 'react';
import { useGroups, useGroupMembers } from '@/hooks/useGroups';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import GroupExpenseForm from '@/components/groups/GroupExpenseForm';

export const GroupExpenseTab = ({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) => {
  const { data: groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const selectedGroup = groups?.find(g => g.id === selectedGroupId);
  const { data: groupMembers } = useGroupMembers(selectedGroupId || undefined);

  return (
    <div className="space-y-4 pt-4">
      {!selectedGroupId ? (
        <div className="space-y-4">
          {(!groups || groups.length === 0) ? (
            <div className="text-sm text-center text-muted-foreground p-6 bg-muted/30 border border-dashed rounded-md">
              You don't have any groups yet. Head to the Groups tab to create one!
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                <SelectContent>
                  {groups?.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
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
            <span className="font-medium text-sm">Group: {selectedGroup?.name}</span>
            <button type="button" className="text-xs text-primary underline" onClick={() => setSelectedGroupId('')}>Change</button>
          </div>
          <div className="pt-2">
            <GroupExpenseForm 
              groupId={selectedGroupId} 
              members={groupMembers || []}
              groupType={selectedGroup?.type || 'day_to_day'}
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
