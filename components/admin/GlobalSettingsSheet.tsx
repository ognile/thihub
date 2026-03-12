import React, { useState } from 'react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAdminSettings, Pixel, CtaUrl } from '@/hooks/useAdminSettings';
import AdminStateView from '@/components/admin/ui/AdminStateView';
import AdminSheetScaffold from '@/components/admin/ui/AdminSheetScaffold';

interface GlobalSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function copyValueToClipboard(value: string, valueType: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${valueType} copied`);
  } catch {
    toast.error(`Failed to copy ${valueType.toLowerCase()}`);
  }
}

function RowActions({
  onCopy,
  onEdit,
  onDelete,
  deleteLabel,
  disabled,
}: {
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="admin-actions self-start pt-0.5" data-testid="admin-row-actions">
      <Button
        type="button"
        variant="ghost"
        className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={onCopy}
        disabled={disabled}
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={onEdit}
        disabled={disabled}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-9 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
        aria-label={deleteLabel}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}

export default function GlobalSettingsSheet({ open, onOpenChange }: GlobalSettingsSheetProps) {
  const {
    pixels,
    ctaUrls,
    isLoading,
    error,
    mutationState,
    addPixel,
    updatePixel,
    deletePixel,
    addCtaUrl,
    updateCtaUrl,
    deleteCtaUrl,
    refresh,
  } = useAdminSettings();

  const isMutating = mutationState.adding || mutationState.updating || mutationState.deleting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AdminSheetScaffold
        title="Global Settings"
        description="Manage your tracking pixels and CTA URLs here."
      >
        <Tabs defaultValue="pixels" className="gap-4">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-full border border-[var(--admin-outline)] bg-muted/70 p-1">
            <TabsTrigger
              value="pixels"
              className="rounded-full border border-transparent text-xs font-medium text-muted-foreground data-[state=active]:border-[var(--admin-outline)] data-[state=active]:bg-background data-[state=active]:text-[var(--admin-text-strong)] data-[state=active]:shadow-none"
            >
              Pixels
            </TabsTrigger>
            <TabsTrigger
              value="cta-urls"
              className="rounded-full border border-transparent text-xs font-medium text-muted-foreground data-[state=active]:border-[var(--admin-outline)] data-[state=active]:bg-background data-[state=active]:text-[var(--admin-text-strong)] data-[state=active]:shadow-none"
            >
              CTA URLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pixels" className="m-0">
            <section className="admin-section space-y-4">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--admin-text-strong)]">Tracking Pixels</h3>
              </header>

              {isLoading ? (
                <AdminStateView state="loading" title="Loading pixels" />
              ) : error ? (
                <AdminStateView
                  state="error"
                  title="Unable to load pixels"
                  description={error}
                  actionLabel="Retry"
                  onAction={refresh}
                />
              ) : (
                <PixelList
                  pixels={pixels}
                  onAdd={addPixel}
                  onUpdate={updatePixel}
                  onDelete={deletePixel}
                  disabled={isMutating}
                />
              )}
            </section>
          </TabsContent>

          <TabsContent value="cta-urls" className="m-0">
            <section className="admin-section space-y-4">
              <header className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--admin-text-strong)]">CTA URLs</h3>
              </header>

              {isLoading ? (
                <AdminStateView state="loading" title="Loading CTA URLs" />
              ) : error ? (
                <AdminStateView
                  state="error"
                  title="Unable to load CTA URLs"
                  description={error}
                  actionLabel="Retry"
                  onAction={refresh}
                />
              ) : (
                <CtaUrlList
                  urls={ctaUrls}
                  onAdd={addCtaUrl}
                  onUpdate={updateCtaUrl}
                  onDelete={deleteCtaUrl}
                  disabled={isMutating}
                />
              )}
            </section>
          </TabsContent>
        </Tabs>
      </AdminSheetScaffold>
    </Sheet>
  );
}

function PixelList({
  pixels,
  onAdd,
  onUpdate,
  onDelete,
  disabled,
}: {
  pixels: Pixel[];
  onAdd: (name: string, id: string) => Promise<unknown>;
  onUpdate: (id: string, name: string, pixelId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Pixel | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const canSave = Boolean(newName.trim() && newId.trim()) && !disabled;

  const handleAdd = async () => {
    setAttemptedSubmit(true);
    if (!canSave) return;
    await onAdd(newName.trim(), newId.trim());
    setIsAdding(false);
    setNewName('');
    setNewId('');
    setAttemptedSubmit(false);
  };

  return (
    <div className="space-y-4">
      {pixels.length === 0 ? (
        <AdminStateView
          state="empty"
          title="No pixels yet"
          description="Add your first tracking pixel to start assigning it to articles."
        />
      ) : (
        <div className="admin-panel divide-y divide-[var(--admin-outline-soft)]" data-testid="admin-settings-list">
          {pixels.map((pixel) => (
            <div key={pixel.id} className="px-3 py-3" data-testid="admin-settings-row">
              {editingId === pixel.id ? (
                <EditPixelForm
                  pixel={pixel}
                  disabled={disabled}
                  onSave={async (name, id) => {
                    await onUpdate(pixel.id, name, id);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="admin-row grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-5">{pixel.name}</p>
                    <p
                      className="admin-value truncate font-mono text-xs text-muted-foreground"
                      title={pixel.pixel_id}
                      data-testid="admin-row-value"
                    >
                      {pixel.pixel_id}
                    </p>
                  </div>
                  <RowActions
                    onCopy={() => copyValueToClipboard(pixel.pixel_id, 'Pixel ID')}
                    onEdit={() => setEditingId(pixel.id)}
                    onDelete={() => setPendingDelete(pixel)}
                    deleteLabel={`Delete pixel ${pixel.name}`}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="admin-section space-y-4 p-4">
          <div className="space-y-2">
            <Label className="admin-field-label">Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. FB Main"
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label className="admin-field-label">Pixel ID</Label>
            <Input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="123456789"
              className="h-9 font-mono text-sm"
              disabled={disabled}
            />
          </div>
          {attemptedSubmit && !newName.trim() ? (
            <p className="text-xs text-destructive">Name is required.</p>
          ) : null}
          {attemptedSubmit && newName.trim() && !newId.trim() ? (
            <p className="text-xs text-destructive">Pixel ID is required.</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => {
                setIsAdding(false);
                setAttemptedSubmit(false);
              }}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button type="button" className="h-9" onClick={handleAdd} disabled={disabled}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full border-dashed"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Add Pixel
        </Button>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(nextOpen) => !nextOpen && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pixel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium">{pendingDelete?.name}</span> from global settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                await onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
              disabled={disabled}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditPixelForm({
  pixel,
  disabled,
  onSave,
  onCancel,
}: {
  pixel: Pixel;
  disabled: boolean;
  onSave: (name: string, id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pixel.name);
  const [id, setId] = useState(pixel.pixel_id);
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const canSave = Boolean(name.trim() && id.trim()) && !disabled && !saving;

  const handleSave = async () => {
    setAttemptedSubmit(true);
    if (!canSave) return;
    setSaving(true);
    await onSave(name.trim(), id.trim());
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="admin-field-label">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" disabled={disabled || saving} />
      </div>
      <div className="space-y-2">
        <Label className="admin-field-label">Pixel ID</Label>
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="h-9 font-mono text-sm"
          disabled={disabled || saving}
        />
      </div>
      {attemptedSubmit && !name.trim() ? <p className="text-xs text-destructive">Name is required.</p> : null}
      {attemptedSubmit && name.trim() && !id.trim() ? <p className="text-xs text-destructive">Pixel ID is required.</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-9" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" className="h-9" onClick={handleSave} disabled={disabled || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function CtaUrlList({
  urls,
  onAdd,
  onUpdate,
  onDelete,
  disabled,
}: {
  urls: CtaUrl[];
  onAdd: (name: string, url: string) => Promise<unknown>;
  onUpdate: (id: string, name: string, url: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CtaUrl | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const canSave = Boolean(newName.trim() && newUrl.trim()) && !disabled;

  const handleAdd = async () => {
    setAttemptedSubmit(true);
    if (!canSave) return;
    await onAdd(newName.trim(), newUrl.trim());
    setIsAdding(false);
    setNewName('');
    setNewUrl('');
    setAttemptedSubmit(false);
  };

  return (
    <div className="space-y-4">
      {urls.length === 0 ? (
        <AdminStateView
          state="empty"
          title="No CTA URLs yet"
          description="Add URLs here to keep article destinations consistent."
        />
      ) : (
        <div className="admin-panel divide-y divide-[var(--admin-outline-soft)]" data-testid="admin-settings-list">
          {urls.map((urlItem) => (
            <div key={urlItem.id} className="px-3 py-3" data-testid="admin-settings-row">
              {editingId === urlItem.id ? (
                <EditCtaForm
                  urlItem={urlItem}
                  disabled={disabled}
                  onSave={async (name, value) => {
                    await onUpdate(urlItem.id, name, value);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="admin-row grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-5">{urlItem.name}</p>
                    <p
                      className="admin-value truncate text-xs text-muted-foreground"
                      title={urlItem.url}
                      data-testid="admin-row-value"
                    >
                      {urlItem.url}
                    </p>
                  </div>
                  <RowActions
                    onCopy={() => copyValueToClipboard(urlItem.url, 'URL')}
                    onEdit={() => setEditingId(urlItem.id)}
                    onDelete={() => setPendingDelete(urlItem)}
                    deleteLabel={`Delete URL ${urlItem.name}`}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="admin-section space-y-4 p-4">
          <div className="space-y-2">
            <Label className="admin-field-label">Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Product Page"
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label className="admin-field-label">URL</Label>
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>
          {attemptedSubmit && !newName.trim() ? <p className="text-xs text-destructive">Name is required.</p> : null}
          {attemptedSubmit && newName.trim() && !newUrl.trim() ? <p className="text-xs text-destructive">URL is required.</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => {
                setIsAdding(false);
                setAttemptedSubmit(false);
              }}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button type="button" className="h-9" onClick={handleAdd} disabled={disabled}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full border-dashed"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Add URL
        </Button>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(nextOpen) => !nextOpen && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CTA URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium">{pendingDelete?.name}</span> from global settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                await onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
              disabled={disabled}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditCtaForm({
  urlItem,
  disabled,
  onSave,
  onCancel,
}: {
  urlItem: CtaUrl;
  disabled: boolean;
  onSave: (name: string, url: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(urlItem.name);
  const [url, setUrl] = useState(urlItem.url);
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const canSave = Boolean(name.trim() && url.trim()) && !disabled && !saving;

  const handleSave = async () => {
    setAttemptedSubmit(true);
    if (!canSave) return;
    setSaving(true);
    await onSave(name.trim(), url.trim());
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="admin-field-label">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" disabled={disabled || saving} />
      </div>
      <div className="space-y-2">
        <Label className="admin-field-label">URL</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 text-sm" disabled={disabled || saving} />
      </div>
      {attemptedSubmit && !name.trim() ? <p className="text-xs text-destructive">Name is required.</p> : null}
      {attemptedSubmit && name.trim() && !url.trim() ? <p className="text-xs text-destructive">URL is required.</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-9" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" className="h-9" onClick={handleSave} disabled={disabled || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
