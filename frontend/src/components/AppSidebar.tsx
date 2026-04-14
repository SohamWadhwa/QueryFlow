import { useState, useEffect } from "react";
import { Database, Plus, MessageSquare, Search, PanelLeftClose, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

interface DatabaseItem {
  name: string;     // UI display
  rawName: string;  // backend value
}

const formatName = (name: string) => name.replace(/_/g, " ");
const toBackendName = (name: string) =>
  name.trim().replace(/ /g, "_").toLowerCase();

interface AppSidebarProps {
  selectedDb: string | null; // stores rawName
  onSelectDb: (name: string | null) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({
  selectedDb,
  onSelectDb,
  collapsed,
  onToggle,
}: AppSidebarProps) {
  const [search, setSearch] = useState("");
  const [databases, setDatabases] = useState<DatabaseItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newDbName, setNewDbName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<DatabaseItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // FETCH DATABASES
  useEffect(() => {
    const fetchDBs = async () => {
      try {
        const res = await api.get("/db/list");
        console.log("Fetched DBs:", res.data.databases);
        const formatted = res.data.databases.map((db: string) => ({
          name: formatName(db),
          rawName: db,
        }));

        setDatabases(formatted);
      } catch (err) {
        console.error("Failed to fetch databases", err);
      }
    };

    fetchDBs();
  }, []);

  const filtered = databases.filter((db) =>
    db.name.toLowerCase().includes(search.toLowerCase())
  );

  // CREATE DB
  const handleCreate = async () => {
    const formattedName = newDbName.trim();
    if (!formattedName) return;

    const rawName = toBackendName(formattedName);
    console.log(rawName);
    for (const name of databases.map((db) => db.rawName)) {
      if (name === rawName) {
        alert("A database with this name already exists.");
        return;
      }
    }
    try {
      await api.post("/db/create", { db_name: rawName });

      setDatabases((prev) => [
        { name: formatName(rawName), rawName },
        ...prev,
      ]);

      onSelectDb(rawName);
      setNewDbName("");
      setCreateOpen(false);
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  // DELETE DB
  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== "delete") return;
    console.log(deleteTarget.rawName);
    try {
      await api.post("/db/delete", {
        db_name: deleteTarget.rawName,
      });

      setDatabases((prev) =>
        prev.filter((db) => db.rawName !== deleteTarget.rawName)
      );

      if (selectedDb === deleteTarget.rawName) {
        onSelectDb(null);
      }

      setDeleteTarget(null);
      setDeleteConfirm("");
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  if (collapsed) return null;

  return (
    <>
      <aside className="w-72 flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border">
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sidebar-active" />
            <span className="font-semibold text-sm tracking-tight">QueryFlow</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-sidebar-hover transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Create */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-sidebar-border text-sm font-medium hover:bg-sidebar-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Database</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-muted" />
            <input
              type="text"
              placeholder="Search databases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-sidebar-hover text-sm rounded-md py-2 pl-8 pr-3 placeholder:text-sidebar-muted border-0 outline-none focus:ring-1 focus:ring-sidebar-active transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
            Databases
          </p>

          {filtered.map((db) => (
            <div
              key={db.rawName}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors group cursor-pointer ${
                selectedDb === db.rawName
                  ? "bg-sidebar-hover text-primary-foreground"
                  : "hover:bg-sidebar-hover"
              }`}
              onClick={() => onSelectDb(db.rawName)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-60" />
              <span className="flex-1 text-left truncate">{db.name}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(db);
                }}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        {/* <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-sidebar-active flex items-center justify-center text-primary-foreground text-xs font-semibold">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">User</p>
              <p className="text-[11px] text-sidebar-muted truncate">Free plan</p>
            </div>
          </div>
        </div> */}
      </aside>

      {/* CREATE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Database</DialogTitle>
            <DialogDescription>Enter a name for your new database.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Database name..."
            value={newDbName}
            onChange={(e) => setNewDbName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newDbName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Database</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              . Type{" "}
              <span className="font-mono font-semibold text-destructive">
                delete
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Type "delete" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== "delete"}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}