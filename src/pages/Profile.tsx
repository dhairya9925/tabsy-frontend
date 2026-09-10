import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Save, CheckCircle2, Trash2, Plus, Tag, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import { CATEGORIES, DEFAULT_CATEGORY_IDS } from '@/lib/categories';
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
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const { profile, user, refreshProfile, deleteAccount } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await apiClient.patch('/api/v1/users/me', {
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });

    if (error) {
      toast.error(error);
    } else {
      await refreshProfile();
      toast.success('Profile updated!');
    }
    setSaving(false);
  };

  const initials = (profile?.display_name || profile?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      console.error("Account deletion failed:", error);
      toast.error('Failed to delete account');
      setDeleting(false);
    } else {
      toast.success('Account successfully deleted');
      // Navigation is not needed here as AuthContext handles state 
      // and ProtectedRoute will automatically redirect to login.
    }
  };

  return (
    <div className="animate-slide-up max-w-lg mx-auto">
      <p className="section-header mb-4">Account</p>
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="glass-card glass-glow p-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{profile?.display_name || 'No name set'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="bg-secondary/50 border-border/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
            className="bg-secondary/50 border-border/50"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Custom Categories Management */}
      <CategoriesCard />

      <div className="glass-card glass-glow p-8 mt-8 border-destructive/20">
        <h2 className="text-xl font-bold mb-2 text-destructive">Danger Zone</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2" disabled={deleting}>
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account
                and remove all associated data including expenses, group memberships, and splits.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Profile;

// ── Custom Categories Card ────────────────────────────────────────────────────

function CategoriesCard() {
  const { customRows, addCategory, updateCategory, deleteCategory, isAdding, isUpdating, isDeleting } = useCategories();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRename = async () => {
    if (!editingId) return;
    try {
      await updateCategory({ id: editingId, name: editName.trim() });
      setEditingId(null);
      toast.success('Category renamed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename category');
    }
  };

  const defaultCats = CATEGORIES.filter(c => c.id !== 'system');

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      toast.error('Category name must be at least 2 characters');
      return;
    }
    if (customRows.length >= 20) {
      toast.error('Maximum 20 custom categories allowed');
      return;
    }
    try {
      await addCategory(trimmed);
      setNewName('');
      toast.success(`Category "${trimmed}" added!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCategory(id);
      toast.success(`Category "${name}" deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="glass-card glass-glow p-8 mt-8">
      <h2 className="text-xl font-bold mb-1">Categories</h2>
      <p className="text-muted-foreground text-sm mb-5">
        Default categories are always available. Add your own below.
      </p>

      {/* Default categories (read-only) */}
      <div className="flex flex-wrap gap-2 mb-5">
        {defaultCats.map(cat => {
          const Icon = cat.icon;
          return (
            <span
              key={cat.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cat.color} opacity-70`}
            >
              <Icon className="h-3 w-3" />
              {cat.label}
            </span>
          );
        })}
      </div>

      {/* Custom categories */}
      {customRows.length > 0 && (
        <div className="space-y-2 mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Your Categories</p>
          {customRows.map(row => (
            <div key={row.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
              {editingId === row.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Input aria-label="Category name" value={editName} maxLength={30}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); }} />
                  <Button size="icon" variant="ghost" aria-label="Save category name"
                    disabled={isUpdating || editName.trim().length < 2} onClick={handleRename}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Cancel rename"
                    onClick={() => setEditingId(null)} disabled={isUpdating}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : <div className="flex min-w-0 flex-1 items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{row.name}</span>
              </div>}
              {editingId !== row.id && <Button variant="ghost" size="icon"
                aria-label={`Rename ${row.name}`} disabled={isUpdating || isDeleting}
                onClick={() => { setEditingId(row.id); setEditName(row.name); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={`Delete ${row.name}`}
                onClick={() => handleDelete(row.id, row.name)}
                disabled={isDeleting || isUpdating}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new category */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New category name..."
          className="bg-secondary/50 border-border/50"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          maxLength={30}
        />
        <Button
          onClick={handleAdd}
          disabled={isAdding || newName.trim().length < 2}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {customRows.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {customRows.length}/20 custom categories used
        </p>
      )}
    </div>
  );
}
