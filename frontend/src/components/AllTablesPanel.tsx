import { useState, useEffect } from "react";
import { X, Loader2, Database, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import api from "@/lib/api";

interface TableData {
  table: string;
  columns: string[];
  rows: Record<string, any>[];
  total_shown: number;
  capped: boolean;
}

interface AllTablesPanelProps {
  selectedDb: string | null;
  onClose: () => void;
}

export function AllTablesPanel({ selectedDb, onClose }: AllTablesPanelProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track which tables are collapsed — all expanded by default
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedDb) return;
    const fetchAllTables = async () => {
      setLoading(true);
      setError(null);
      setTables([]);
      setCollapsed({});
      try {
        const res = await api.post("/db/all-tables", { db_name: selectedDb });
        setTables(res.data.tables ?? []);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Failed to load tables.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllTables();
  }, [selectedDb]);

  const toggleCollapse = (tableName: string) => {
    setCollapsed((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  return (
    <aside className="w-full h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">All Tables</span>
          {selectedDb && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
              {selectedDb}
            </span>
          )}
          {tables.length > 0 && (
            <span className="text-xs text-muted-foreground">
              · {tables.length} table{tables.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tables…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-500 py-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && tables.length === 0 && (
          <p className="text-xs text-muted-foreground py-8 text-center">No tables found in this database.</p>
        )}

        {/* Tables */}
        {!loading && tables.map((t) => {
          const isCollapsed = collapsed[t.table] ?? false;

          return (
            <div key={t.table} className="rounded-xl border border-border overflow-hidden shadow-sm">
              {/* Table header row */}
              <button
                onClick={() => toggleCollapse(t.table)}
                className="w-full px-4 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2 hover:bg-muted/80 transition-colors text-left"
              >
                {isCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                }
                <Database className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground font-mono">{t.table}</span>

                <div className="ml-auto flex items-center gap-2">
                  {t.capped && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      50 row limit
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {t.total_shown} row{t.total_shown !== 1 ? "s" : ""}
                    · {t.columns.length} col{t.columns.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>

              {/* Table data */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  {t.rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-3 italic">Table is empty.</p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/30">
                          {t.columns.map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left font-semibold text-muted-foreground font-mono border-b border-border whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.rows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            {t.columns.map((col) => {
                              const val = row[col];
                              const isNull = val === null || val === undefined;
                              return (
                                <td
                                  key={col}
                                  className="px-3 py-2 font-mono text-foreground whitespace-nowrap max-w-[240px] overflow-hidden text-ellipsis"
                                  title={isNull ? "NULL" : String(val)}
                                >
                                  {isNull
                                    ? <span className="text-muted-foreground italic">NULL</span>
                                    : String(val)
                                  }
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}