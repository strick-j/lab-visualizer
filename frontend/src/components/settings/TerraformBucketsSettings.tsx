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
} from "lucide-react";
import {
  getTerraformBuckets,
  createTerraformBucket,
  updateTerraformBucket,
  deleteTerraformBucket,
} from "@/api/client";
import type {
  TerraformBucket,
  TerraformBucketCreate,
  TerraformBucketUpdate,
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
      setBuckets((prev) => prev.map((b) => (b.id === bucket.id ? updated : b)));
    } catch {
      setError("Failed to update bucket");
    }
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
            Configure S3 buckets containing Terraform state files. State files
            (.tfstate) are auto-discovered within each bucket.
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
          {/* Bucket list */}
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
                        prev.map((b) => (b.id === bucket.id ? updated : b)),
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
                  />
                ),
              )}
            </div>
          )}

          {/* Add form */}
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
}

function BucketCard({
  bucket,
  onEdit,
  onDelete,
  onToggleEnabled,
}: BucketCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={`rounded-lg border p-4 ${
        bucket.enabled
          ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          : "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-800/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
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
          </div>
          {bucket.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {bucket.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {bucket.region && <span>Region: {bucket.region}</span>}
            {bucket.prefix && (
              <span>
                Prefix: <code className="text-xs">{bucket.prefix}</code>
              </span>
            )}
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
          {confirmDelete ? (
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
          )}
        </div>
      </div>
    </div>
  );
}

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
      setSaveError(
        axiosError.response?.data?.detail || "Failed to add bucket",
      );
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
      });
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
