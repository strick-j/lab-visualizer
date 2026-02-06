import { useState, useEffect } from "react";
import {
  Database,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  AlertCircle,
  FolderArchive,
  FileText,
  ChevronDown,
  ChevronRight,
  Server,
} from "lucide-react";
import {
  getTerraformBuckets,
  createTerraformBucket,
  updateTerraformBucket,
  deleteTerraformBucket,
  createTerraformPath,
  deleteTerraformPath,
  updateTerraformPath,
} from "@/api/client";
import type {
  TerraformBucket,
  TerraformBucketCreate,
  TerraformBucketUpdate,
  TerraformPath,
  TerraformPathCreate,
} from "@/types";

export function TerraformBucketsSettings() {
  const [buckets, setBuckets] = useState<TerraformBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTerraformBuckets();
      setBuckets(data.buckets);
    } catch {
      setError("Failed to load Terraform state buckets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTerraformBucket(id);
      setBuckets((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError("Failed to delete bucket");
    }
  };

  const handleToggleEnabled = async (bucket: TerraformBucket) => {
    try {
      const updated = await updateTerraformBucket(bucket.id, {
        enabled: !bucket.enabled,
      });
      setBuckets((prev) =>
        prev.map((b) =>
          b.id === bucket.id ? { ...updated, paths: b.paths } : b,
        ),
      );
    } catch {
      setError("Failed to update bucket");
    }
  };

  const handlePathAdded = (bucketId: number, newPath: TerraformPath) => {
    setBuckets((prev) =>
      prev.map((b) =>
        b.id === bucketId ? { ...b, paths: [...b.paths, newPath] } : b,
      ),
    );
  };

  const handlePathDeleted = (bucketId: number, pathId: number) => {
    setBuckets((prev) =>
      prev.map((b) =>
        b.id === bucketId
          ? { ...b, paths: b.paths.filter((p) => p.id !== pathId) }
          : b,
      ),
    );
  };

  const handlePathUpdated = (bucketId: number, updatedPath: TerraformPath) => {
    setBuckets((prev) =>
      prev.map((b) =>
        b.id === bucketId
          ? {
              ...b,
              paths: b.paths.map((p) =>
                p.id === updatedPath.id ? updatedPath : p,
              ),
            }
          : b,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Database className="mt-1 h-8 w-8 text-purple-500" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Terraform State Buckets
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure S3 buckets containing Terraform state files. Add specific
            paths to scan, or leave empty for auto-discovery of .tfstate files.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {buckets.length === 0 && !showAddForm ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
              <FolderArchive className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No Terraform state buckets configured
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Add an S3 bucket to start aggregating Terraform state files
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {buckets.map((bucket) =>
                editingId === bucket.id ? (
                  <BucketEditForm
                    key={bucket.id}
                    bucket={bucket}
                    onSave={async (data) => {
                      const updated = await updateTerraformBucket(
                        bucket.id,
                        data,
                      );
                      setBuckets((prev) =>
                        prev.map((b) =>
                          b.id === bucket.id
                            ? { ...updated, paths: b.paths }
                            : b,
                        ),
                      );
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <BucketCard
                    key={bucket.id}
                    bucket={bucket}
                    onEdit={() => setEditingId(bucket.id)}
                    onDelete={() => handleDelete(bucket.id)}
                    onToggleEnabled={() => handleToggleEnabled(bucket)}
                    onPathAdded={(p) => handlePathAdded(bucket.id, p)}
                    onPathDeleted={(pathId) =>
                      handlePathDeleted(bucket.id, pathId)
                    }
                    onPathUpdated={(p) => handlePathUpdated(bucket.id, p)}
                  />
                ),
              )}
            </div>
          )}

          {showAddForm ? (
            <BucketAddForm
              onSave={async (data) => {
                const created = await createTerraformBucket(data);
                setBuckets((prev) => [...prev, created]);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              Add S3 Bucket
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BucketCardProps {
  bucket: TerraformBucket;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  onPathAdded: (path: TerraformPath) => void;
  onPathDeleted: (pathId: number) => void;
  onPathUpdated: (path: TerraformPath) => void;
}

function BucketCard({
  bucket,
  onEdit,
  onDelete,
  onToggleEnabled,
  onPathAdded,
  onPathDeleted,
  onPathUpdated,
}: BucketCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAddPath, setShowAddPath] = useState(false);

  const isEnvBucket = bucket.source === "env";
  const pathCount = bucket.paths.length;

  return (
    <div
      className={`rounded-lg border ${
        bucket.enabled
          ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          : "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-800/50"
      }`}
    >
      {/* Bucket header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <Database className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {bucket.bucket_name}
            </span>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                bucket.enabled
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {bucket.enabled ? "Active" : "Disabled"}
            </span>
            {isEnvBucket && (
              <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <Server className="mr-1 inline h-3 w-3" />
                ENV
              </span>
            )}
          </div>
          {bucket.description && (
            <p className="mt-1 ml-10 text-sm text-gray-500 dark:text-gray-400">
              {bucket.description}
            </p>
          )}
          <div className="mt-2 ml-10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {bucket.region && <span>Region: {bucket.region}</span>}
            {bucket.prefix && (
              <span>
                Prefix: <code className="text-xs">{bucket.prefix}</code>
              </span>
            )}
            <span>
              {pathCount > 0
                ? `${pathCount} path${pathCount !== 1 ? "s" : ""} configured`
                : "Auto-discovery"}
            </span>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleEnabled}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              bucket.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            }`}
            title={bucket.enabled ? "Disable" : "Enable"}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                bucket.enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {!isEnvBucket &&
            (confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Confirm delete"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ))}
        </div>
      </div>

      {/* Expanded: paths section */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
          <div className="ml-10">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              State File Paths
            </h5>
            {bucket.paths.length === 0 && !showAddPath ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                No explicit paths configured &mdash; all .tfstate files under
                the prefix will be auto-discovered.
              </p>
            ) : (
              <div className="space-y-2">
                {bucket.paths.map((p) => (
                  <PathRow
                    key={p.id}
                    tfPath={p}
                    onDelete={async () => {
                      await deleteTerraformPath(p.id);
                      onPathDeleted(p.id);
                    }}
                    onToggle={async () => {
                      const updated = await updateTerraformPath(p.id, {
                        enabled: !p.enabled,
                      });
                      onPathUpdated(updated);
                    }}
                  />
                ))}
              </div>
            )}

            {showAddPath ? (
              <PathAddForm
                bucketId={bucket.id}
                onSave={(newPath) => {
                  onPathAdded(newPath);
                  setShowAddPath(false);
                }}
                onCancel={() => setShowAddPath(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddPath(true)}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Plus className="h-3 w-3" />
                Add Path
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Path sub-components
// ---------------------------------------------------------------------------

interface PathRowProps {
  tfPath: TerraformPath;
  onDelete: () => Promise<void>;
  onToggle: () => Promise<void>;
}

function PathRow({ tfPath, onDelete, onToggle }: PathRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div
      className={`flex items-center justify-between rounded border px-3 py-2 ${
        tfPath.enabled
          ? "border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
          : "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/30"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <code className="text-xs text-gray-700 dark:text-gray-300 truncate">
          {tfPath.path}
        </code>
        {tfPath.description && (
          <span className="text-xs text-gray-400 truncate hidden sm:inline">
            &mdash; {tfPath.description}
          </span>
        )}
      </div>
      <div className="ml-2 flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
            tfPath.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
          title={tfPath.enabled ? "Disable" : "Enable"}
        >
          <span
            className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
              tfPath.enabled ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={async () => {
                setIsDeleting(true);
                await onDelete();
                setIsDeleting(false);
              }}
              disabled={isDeleting}
              className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Confirm"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Cancel"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface PathAddFormProps {
  bucketId: number;
  onSave: (path: TerraformPath) => void;
  onCancel: () => void;
}

function PathAddForm({ bucketId, onSave, onCancel }: PathAddFormProps) {
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!path.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const data: TerraformPathCreate = {
        path: path.trim(),
        description: description.trim() || undefined,
        enabled: true,
      };
      const created = await createTerraformPath(bucketId, data);
      onSave(created);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosError.response?.data?.detail || "Failed to add path");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/10">
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="env/production/terraform.tfstate"
            className="block flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="block w-48 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        {saveError && (
          <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!path.trim() || isSaving}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Adding..." : "Add"}
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bucket forms
// ---------------------------------------------------------------------------

interface BucketAddFormProps {
  onSave: (data: TerraformBucketCreate) => Promise<void>;
  onCancel: () => void;
}

function BucketAddForm({ onSave, onCancel }: BucketAddFormProps) {
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!bucketName.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        bucket_name: bucketName.trim(),
        region: region.trim() || undefined,
        description: description.trim() || undefined,
        prefix: prefix.trim() || undefined,
        enabled: true,
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosError.response?.data?.detail || "Failed to add bucket");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
        Add S3 Bucket
      </h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bucket Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            placeholder="my-terraform-state-bucket"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Region
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="us-east-1 (optional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Key Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="lab/ (optional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Production infrastructure state files"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!bucketName.trim() || isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Adding..." : "Add Bucket"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface BucketEditFormProps {
  bucket: TerraformBucket;
  onSave: (data: TerraformBucketUpdate) => Promise<void>;
  onCancel: () => void;
}

function BucketEditForm({ bucket, onSave, onCancel }: BucketEditFormProps) {
  const [bucketName, setBucketName] = useState(bucket.bucket_name);
  const [region, setRegion] = useState(bucket.region || "");
  const [description, setDescription] = useState(bucket.description || "");
  const [prefix, setPrefix] = useState(bucket.prefix || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEnvBucket = bucket.source === "env";

  const handleSubmit = async () => {
    if (!bucketName.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const data: TerraformBucketUpdate = {
        region: region.trim() || undefined,
        description: description.trim() || undefined,
        prefix: prefix.trim() || undefined,
      };
      // Only allow renaming non-env buckets
      if (!isEnvBucket) {
        data.bucket_name = bucketName.trim();
      }
      await onSave(data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(
        axiosError.response?.data?.detail || "Failed to update bucket",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-800 dark:bg-yellow-900/10">
      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
        Edit Bucket
      </h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bucket Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            disabled={isEnvBucket}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          />
          {isEnvBucket && (
            <p className="mt-1 text-xs text-gray-400">
              Bucket name is set by the TF_STATE_BUCKET environment variable
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Region
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="us-east-1 (optional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Key Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="lab/ (optional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!bucketName.trim() || isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
