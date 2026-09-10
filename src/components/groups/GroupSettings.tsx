import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUpdateGroup, useDeleteGroup } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GROUP_TYPES } from '@/lib/groupTypes';

interface GroupSettingsProps {
    group: any;
}

const GroupSettings = ({ group }: GroupSettingsProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const updateGroup = useUpdateGroup();
    const deleteGroup = useDeleteGroup();

    const [name, setName] = useState(group.name || '');
    const [description, setDescription] = useState(group.description || '');
    const [type, setType] = useState(group.type || 'day_to_day');
    const [monthlyRent, setMonthlyRent] = useState(group.monthly_rent?.toString() || '');

    const isCreator = group.created_by === user?.id;

    useEffect(() => {
        setName(group.name || '');
        setDescription(group.description || '');
        setType(group.type || 'day_to_day');
        setMonthlyRent(group.monthly_rent?.toString() || '');
    }, [group]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            await updateGroup.mutateAsync({
                id: group.id,
                updates: {
                    name: name.trim(),
                    description: description.trim() || null,
                    type,
                    monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
                },
            });
            toast({ title: 'Group updated successfully!' });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        try {
            await deleteGroup.mutateAsync(group.id);
            toast({ title: 'Group deleted' });
            navigate('/groups');
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    if (!isCreator) {
        return (
            <Card className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground">Access Denied</h3>
                <p className="text-sm text-muted-foreground mt-2">
                    Only the group creator can modify settings or delete the group.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-2">
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
                        <Input
                            id="group-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Roommates"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="group-desc">Description (optional)</Label>
                        <Textarea
                            id="group-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this group for?"
                            rows={2}
                        />
                    </div>

                    {type === 'shared_living' && (
                        <div className="space-y-2">
                            <Label htmlFor="monthly-rent">Default Monthly Rent (₹)</Label>
                            <Input
                                id="monthly-rent"
                                type="number"
                                step="0.01"
                                min="0"
                                value={monthlyRent}
                                onChange={(e) => setMonthlyRent(e.target.value)}
                                placeholder="e.g. 15000"
                            />
                            <p className="text-xs text-muted-foreground">
                                Set a default expected rent for the group. (Optional)
                            </p>
                        </div>
                    )}

                    <Button type="submit" disabled={updateGroup.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </Card>

            <Card className="p-6 border-destructive/50">
                <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Once you delete a group, there is no going back. Please be certain.
                </p>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Group
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the group "{group.name}" and remove all members, expenses, and settlement data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Yes, delete group
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>
        </div>
    );
};

export default GroupSettings;
