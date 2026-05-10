import { createElement, useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { IconKeyPicker } from "@/components/category/IconKeyPicker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppModal } from "@/components/modals";
import { APP_HEADER_PRIMARY_ACTION_EVENT, type AppHeaderPrimaryActionDetail } from "@/constants/headerActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { getInlineErrorMessage } from "@/lib/errors/normalize";
import { resolveCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import type {
  ApiSuccess,
  CategoryGroupRow,
  CategoryType,
} from "@/types/category";
import { Panel } from "@/components/layout/Panel";
import { SettingsSectionShell } from "@/components/settings/SettingsSectionShell";

const TYPE_LABELS: Record<CategoryType, string> = {
  income: "Income",
  expense: "Expense",
  savings: "Savings",
};

export const CategoriesSettingsPage = () => {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: groups,
    isPending: loading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["category-groups"],
    queryFn: async (): Promise<CategoryGroupRow[]> => {
      const envelope =
        await api.get<ApiSuccess<CategoryGroupRow[]>>("/category-groups");
      return envelope.data;
    },
    staleTime: 60_000,
  });

  const fetchErrorBanner = loadError
    ? getInlineErrorMessage(
        loadError,
        "Could not load category groups. Try again.",
      )
    : null;

  const rows = groups ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<CategoryType>("expense");
  const [createIconKey, setCreateIconKey] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryType>("expense");
  const [editIconKey, setEditIconKey] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryGroupRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const handleOpenCreate = () => {
    setActionError(null);
    setCreateName("");
    setCreateType("expense");
    setCreateIconKey(null);
    setCreateOpen(true);
  };

  useEffect(() => {
    const handleHeaderPrimaryAction = (event: Event) => {
      const customEvent = event as CustomEvent<AppHeaderPrimaryActionDetail>;
      if (customEvent.detail?.actionKey !== "create-category-group") {
        return;
      }
      handleOpenCreate();
    };

    window.addEventListener(APP_HEADER_PRIMARY_ACTION_EVENT, handleHeaderPrimaryAction);
    return () => {
      window.removeEventListener(APP_HEADER_PRIMARY_ACTION_EVENT, handleHeaderPrimaryAction);
    };
  }, []);

  const handleSubmitCreate = async () => {
    setActionError(null);
    const name = createName.trim();
    if (!name) {
      setActionError("Name is required.");
      return;
    }
    setCreating(true);
    try {
      await api.post<ApiSuccess<CategoryGroupRow>>("/category-groups", {
        name,
        type: createType,
        iconKey: createIconKey,
      });
      await queryClient.invalidateQueries({ queryKey: ["category-groups"] });
      setCreateOpen(false);
    } catch (error) {
      setActionError(
        getInlineErrorMessage(error, "Could not create category group."),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (group: CategoryGroupRow) => {
    setActionError(null);
    setEditGroupId(group.group_id);
    setEditName(group.name);
    setEditType(group.type);
    setEditIconKey(group.icon_key);
    setEditOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (editGroupId === null) {
      return;
    }
    setActionError(null);
    const name = editName.trim();
    if (!name) {
      setActionError("Name is required.");
      return;
    }
    setSavingEdit(true);
    try {
      await api.patch<ApiSuccess<CategoryGroupRow>>(
        `/category-groups/${editGroupId}`,
        {
          name,
          type: editType,
          iconKey: editIconKey,
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["category-groups"] });
      setEditOpen(false);
    } catch (error) {
      setActionError(
        getInlineErrorMessage(error, "Could not update category group."),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/category-groups/${deleteTarget.group_id}`);
      await queryClient.invalidateQueries({ queryKey: ["category-groups"] });
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setActionError(
        getInlineErrorMessage(error, "Could not delete category group."),
      );
    } finally {
      setDeleting(false);
    }
  };

  const groupedByType = (type: CategoryType) =>
    rows.filter((g) => g.type === type);
  const customGroupsCount = rows.filter((group) => group.user_id !== null).length;
  const systemGroupsCount = rows.length - customGroupsCount;

  return (
    <>
      <SettingsSectionShell
        title="Categories"
        description="System groups ship with icons. Custom groups can pick an optional icon from the same set."
        actions={
          <Button type="button" onClick={handleOpenCreate}>
            <Plus className="size-4" aria-hidden />
            New category group
          </Button>
        }
        main={
          <>
            {fetchErrorBanner ? (
              <Card className="border-destructive/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <p className="text-destructive text-sm">{fetchErrorBanner}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetch()}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading category groups…
              </div>
            ) : null}

            {!loading && !fetchErrorBanner ? (
              <div className="flex flex-col gap-6">
                {(["income", "expense", "savings"] as const).map((type) => (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle>{TYPE_LABELS[type]}</CardTitle>
                      <CardDescription>
                        {groupedByType(type).length} group
                        {groupedByType(type).length === 1 ? "" : "s"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {groupedByType(type).length === 0 ? (
                        <p className="text-muted-foreground text-sm">None yet.</p>
                      ) : (
                        <ul className="divide-y divide-border rounded-lg border">
                          {groupedByType(type).map((group) => {
                            const canEdit = group.user_id !== null;
                            return (
                              <li
                                key={group.group_id}
                                className="flex flex-wrap items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit]"
                              >
                                {createElement(
                                  resolveCategoryIcon(group.icon_key),
                                  {
                                    className:
                                      "size-5 shrink-0 text-muted-foreground",
                                    "aria-hidden": true,
                                  },
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{group.name}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {canEdit ? (
                                      <span className="text-foreground">
                                        Custom
                                      </span>
                                    ) : (
                                      <span>System</span>
                                    )}
                                    {group.icon_key ? (
                                      <span className="ml-2">
                                        · icon: {group.icon_key}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  {canEdit ? (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Edit ${group.name}`}
                                        onClick={() => handleOpenEdit(group)}
                                      >
                                        <Pencil className="size-4" aria-hidden />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className={cn(
                                          "text-muted-foreground",
                                          "hover:text-destructive",
                                        )}
                                        aria-label={`Delete ${group.name}`}
                                        onClick={() => {
                                          setDeleteTarget(group);
                                          setDeleteOpen(true);
                                        }}
                                      >
                                        <Trash2 className="size-4" aria-hidden />
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </>
        }
        aside={
          <>
            <Panel title="Category summary" description="Overview of current group ownership.">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Total groups</dt>
                  <dd className="font-medium">{rows.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">System groups</dt>
                  <dd className="font-medium">{systemGroupsCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Custom groups</dt>
                  <dd className="font-medium">{customGroupsCount}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Tips" description="Keep reports and budgets cleaner with a simple category strategy.">
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground text-sm">
                <li>Use fewer parent groups and richer category names.</li>
                <li>Avoid deleting groups actively used by recent transactions.</li>
                <li>Keep savings groups separate for better goal reporting.</li>
              </ul>
            </Panel>
          </>
        }
      />

      <AppModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="New category group"
          description="Choose type, name, and an optional icon. Icons match the PocketPal curated set."
          size="md"
          contentClassName="max-h-[90vh] overflow-y-auto"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmitCreate()}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4 py-2">
            {actionError && createOpen ? (
              <p className="text-destructive text-sm" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-group-name">Name</Label>
              <Input
                id="create-group-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Side projects"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-group-type">Type</Label>
              <Select
                value={createType}
                onValueChange={(v) => setCreateType(v as CategoryType)}
              >
                <SelectTrigger id="create-group-type" className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <IconKeyPicker value={createIconKey} onChange={setCreateIconKey} />
          </div>
        </AppModal>

        <AppModal
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Edit category group"
          description="Update name, type, or icon for your custom group."
          size="md"
          contentClassName="max-h-[90vh] overflow-y-auto"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmitEdit()}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4 py-2">
            {actionError && editOpen ? (
              <p className="text-destructive text-sm" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-group-name">Name</Label>
              <Input
                id="edit-group-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-group-type">Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => setEditType(v as CategoryType)}
              >
                <SelectTrigger id="edit-group-type" className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <IconKeyPicker value={editIconKey} onChange={setEditIconKey} />
          </div>
        </AppModal>

        <AppModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete category group?"
          description={
            deleteTarget
              ? `This will remove “${deleteTarget.name}”. Categories in this group may need to be reassigned first.`
              : undefined
          }
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteTarget(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </>
          }
        />
    </>
  );
};
