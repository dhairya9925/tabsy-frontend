import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useGroups, useCreateGroup, useJoinGroup } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { GROUP_TYPES, getGroupTypeConfig } from '@/lib/groupTypes';

const Groups = () => {
  const { data: groups, isLoading, isError, refetch } = useGroups();
  const createGroup = useCreateGroup();
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('day_to_day');
  const [inviteCode, setInviteCode] = useState('');
  const [sponsorId, setSponsorId] = useState('auto');

  const joinGroup = useJoinGroup();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await joinGroup.mutateAsync(inviteCode.trim());
      toast({ title: 'Successfully joined group!' });
      setInviteCode('');
      setJoinOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        sponsor_id: type === 'reimbursable' ? (sponsorId === 'auto' ? user?.id : sponsorId) : undefined
      });
      toast({ title: 'Group created!' });
      setName('');
      setDescription('');
      setType('day_to_day');
      setSponsorId('auto');
      setCreateOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Groups</h1>
          <p className="text-sm text-muted-foreground">Manage your expense groups</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-1" /> Join Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Group</DialogTitle>
                <DialogDescription>
                  Enter an invite code to join an existing group.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input id="invite-code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Paste the code here" required />
                </div>
                <Button type="submit" className="w-full" disabled={joinGroup.isPending}>
                  {joinGroup.isPending ? 'Joining...' : 'Join Group'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group</DialogTitle>
                <DialogDescription>
                  Set up a new group and choose its type.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2 mb-2">
                  <Label>Group Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(GROUP_TYPES).map((t) => {
                      const Icon = t.icon;
                      const isSelected = type === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setType(t.id)}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-left transition-all ${isSelected
                            ? 'border-primary ring-1 ring-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                            }`}
                        >
                          <div className={`p-2 rounded-md ${t.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-xs">{t.label}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input id="group-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Roommates" required />
                </div>
                {type === 'reimbursable' && (
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-id">Sponsor</Label>
                    <select
                      id="sponsor-id"
                      value={sponsorId}
                      onChange={(e) => setSponsorId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="auto">You (Default)</option>
                      <option value="Company">Company / External</option>
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="group-desc">Description (optional)</Label>
                  <Textarea id="group-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this group for?" rows={2} />
                </div>
                <Button type="submit" className="w-full" disabled={createGroup.isPending}>
                  {createGroup.isPending ? 'Creating...' : 'Create Group'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-semibold text-foreground">Failed to load groups</h3>
          <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : !groups?.length ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No groups yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a group to start splitting expenses</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const groupType = getGroupTypeConfig(group.type);
            const TypeIcon = groupType.icon;

            return (
              <Card key={group.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Link to={`/groups/${group.id}`} className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                      <div className={`flex shrink-0 items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${groupType.color}`}>
                        <TypeIcon className="h-3 w-3" />
                        {groupType.label}
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(group.created_at), 'MMM d, yyyy')}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 ml-3">

                    <Link to={`/groups/${group.id}`}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Groups;
