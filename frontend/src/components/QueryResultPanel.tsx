import { X, Table2, Clock, BarChart3 } from "lucide-react";

export interface QueryResult {
  sql: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
  executedAt: string;
  rowCount: number;
  duration: string;
}

interface QueryResultPanelProps {
  result: QueryResult;
  onClose: () => void;
}

export function QueryResultPanel({ result, onClose }: QueryResultPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Query Results</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>{result.rowCount} rows</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{result.duration}</span>
        </div>
      </div>

      {/* SQL preview */}
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <pre className="text-[11px] font-mono text-muted-foreground truncate">{result.sql}</pre>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 z-10">
            <tr>
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground border-b border-border whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                {result.columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2 text-foreground whitespace-nowrap font-mono text-xs"
                  >
                    {row[col] === null ? (
                      <span className="text-muted-foreground italic">NULL</span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
