import { useState, useEffect, useRef } from "react";
import {
  SendHorizonal,
  Sparkles,
  Database,
  TableProperties,
  Code2,
  PanelLeftOpen,
  Check,
  X,
  Pencil,
  TerminalSquare,
  ChevronRight,
  Table2,
  Loader2,
  LayoutList,
} from "lucide-react";
import { QueryResultPanel, QueryResult } from "./QueryResultPanel";
import { AllTablesPanel } from "./AllTablesPanel";
import api from "@/lib/api";

interface PromptWorkspaceProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedDb: string | null;
}

interface SchemaColumn {
  name: string;
  type: string;
  primary_key: boolean;
  not_null: boolean;
  default_value: string | null;
  unique: boolean;
  foreign_key: { table: string; column: string } | null;
  constraints: string[];
}

interface SchemaTable {
  table: string;
  columns: SchemaColumn[];
}

type PreviewState = "idle" | "preview" | "editing" | "approved" | "denied";

// Defined at module level so it's stable and not re-created on each render.
// run_query returns: list-of-dicts for SELECT, {message} for writes.
function parseResult(raw: any, sql: string): QueryResult {
  if (Array.isArray(raw)) {
    const columns = raw.length > 0 ? Object.keys(raw[0]) : [];
    return { sql, columns, rows: raw, executedAt: new Date().toLocaleTimeString(), rowCount: raw.length, duration: "–" };
  }
  return {
    sql, columns: ["message"],
    rows: [{ message: raw?.message ?? "Query executed successfully" }],
    executedAt: new Date().toLocaleTimeString(), rowCount: 1, duration: "–",
  };
}

export function PromptWorkspace({ sidebarCollapsed, onToggleSidebar, selectedDb }: PromptWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [manualSql, setManualSql] = useState("");
  const [showManualSql, setShowManualSql] = useState(false);
  const [showSchema, setShowSchema] = useState(true);
  const [showAllTables, setShowAllTables] = useState(false);

  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [generatedSql, setGeneratedSql] = useState("");
  const [editableSql, setEditableSql] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Ref guard: useState setter is async — rapid Enter presses fire handleSubmit
  // twice before the re-render that disables the button. Ref updates synchronously.
  const isSubmittingRef = useRef(false);

  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const suggestions = [
    { icon: TableProperties, text: "Show all tables in the database" },
    { icon: Code2, text: "Get total revenue by month" },
    { icon: Database, text: "Find top 10 customers by orders" },
    { icon: Sparkles, text: "Create a summary report" },
  ];

  useEffect(() => {
    if (!selectedDb) { setSchema([]); return; }
    const fetchSchema = async () => {
      setSchemaLoading(true);
      setSchemaError(null);
      try {
        const res = await api.post("/db/schema", { db_name: selectedDb });
        setSchema(res.data.schema ?? []);
      } catch (err: any) {
        setSchemaError(err?.response?.data?.detail ?? "Failed to load schema.");
        setSchema([]);
      } finally {
        setSchemaLoading(false);
      }
    };
    fetchSchema();
  }, [selectedDb]);

  const handleSubmit = async () => {
    if (isSubmittingRef.current || !query.trim() || !selectedDb) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setQueryId(null);
    setGeneratedSql("");
    setPreviewState("idle");
    try {
      const res = await api.post("/query/generate", { db_name: selectedDb, user_query: query });
      const { sql_query, query_id } = res.data;
      setGeneratedSql(sql_query);
      setEditableSql(sql_query);
      setQueryId(query_id);
      setQuery("");
      setPreviewState("preview");
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? "Failed to generate SQL.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!queryId) return;
    setIsApproving(true);
    setSubmitError(null);
    try {
      const res = await api.post(`/query/approve?query_id=${queryId}`);
      setQueryResult(parseResult(res.data.result, generatedSql));
      setPreviewState("approved");
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? "Failed to approve query.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (!queryId) return;
    try { await api.post(`/query/reject?query_id=${queryId}`); } catch { /* best-effort */ }
    setPreviewState("denied");
    setTimeout(() => { setPreviewState("idle"); setGeneratedSql(""); setQueryId(null); }, 1200);
  };

  const handleEdit = () => { setEditableSql(generatedSql); setPreviewState("editing"); };

  const handleSaveEdit = async () => {
    if (!queryId) return;
    try {
      await api.post(`/query/edit?query_id=${queryId}&new_sql=${encodeURIComponent(editableSql)}`);
      setGeneratedSql(editableSql);
      setPreviewState("preview");
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? "Failed to save edit.");
    }
  };

  const handleRunManualSql = async () => {
    if (!manualSql.trim() || !selectedDb) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await api.post("/query/run-manual", { db_name: selectedDb, sql: manualSql });
      setQueryResult(parseResult(res.data.result, res.data.sql));
      // console.log("Running manual SQL:", manualSql);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail ?? "Failed to run manual SQL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showHero = previewState === "idle" && !isSubmitting;
  const hasResult = queryResult !== null;

  return (
    <main className="flex-1 flex flex-col h-screen bg-background overflow-hidden">

      {/* Top bar */}
      <header className="h-12 flex items-center px-4 border-b border-border justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {sidebarCollapsed && (
            <button onClick={onToggleSidebar} className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <span className="text-sm font-medium text-muted-foreground">NL-to-SQL Workspace</span>
          {selectedDb && (
            <span className="flex items-center gap-1 text-xs text-primary bg-primary/8 px-2 py-0.5 rounded-full font-medium">
              <Database className="h-3 w-3" />{selectedDb}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAllTables((v) => !v); if (!showAllTables) setShowSchema(false); }}
            disabled={!selectedDb}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${showAllTables ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
          >
            <LayoutList className="h-3.5 w-3.5" />All Tables
          </button>
          <button
            onClick={() => { setShowSchema((v) => !v); if (!showSchema) setShowAllTables(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showSchema ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
          >
            <Table2 className="h-3.5 w-3.5" />Schema
          </button>
        </div>
      </header>

      {/* Body — flat flex row: input | result | schema
          ─────────────────────────────────────────────────────────────────────
          THE LAYOUT FIX:
          Previously the input panel toggled between `flex-1` and `w-1/2
          flex-shrink-0`. Browsers cannot interpolate between a flex-grow
          value and a fixed percentage — so the "slide" was instant.
          Now input is always `flex-1 min-w-0` and only the result panel
          animates its explicit `width`. flex-1 naturally surrenders space
          as the sibling expands, giving a smooth push transition.
          ───────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Input area */}
        <div className="flex-1 min-w-0 flex flex-col items-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-2xl flex flex-col items-center">

            {showHero && (
              <div className="w-full">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-5">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">Ask anything about your data</h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Describe what you need in plain English and we'll generate the SQL for you.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(s.text)}
                      disabled={!selectedDb}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground hover:border-primary/30 hover:shadow-sm transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <s.icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="line-clamp-1">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt input */}
            <div className="w-full">
              <div className={`relative rounded-2xl border bg-prompt shadow-lg shadow-prompt-shadow/50 transition-colors ${isSubmitting ? "border-primary/40" : "border-prompt-border"}`}>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  placeholder={selectedDb ? "Describe your query in plain English..." : "Select a database first…"}
                  disabled={!selectedDb || isSubmitting}
                  rows={3}
                  className="w-full resize-none rounded-2xl bg-transparent px-5 py-4 pr-14 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 transition-opacity"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim() || !selectedDb || isSubmitting}
                  className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                </button>
              </div>

              {submitError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                  <X className="h-3 w-3 flex-shrink-0" />{submitError}
                </div>
              )}

              {/* Manual SQL toggle */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setShowManualSql((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <TerminalSquare className="h-3.5 w-3.5" />
                  Write SQL manually
                  <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${showManualSql ? "rotate-90" : ""}`} />
                </button>
                <p className="text-[11px] text-muted-foreground">Verify generated SQL before running.</p>
              </div>

              {showManualSql && (
                <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center gap-2">
                    <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Manual SQL</span>
                  </div>
                  <textarea
                    value={manualSql}
                    onChange={(e) => setManualSql(e.target.value)}
                    placeholder="SELECT * FROM ..."
                    rows={4}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <div className="px-4 py-2 border-t border-border flex justify-end">
                    <button
                      onClick={handleRunManualSql}
                      disabled={!manualSql.trim() || !selectedDb || isSubmitting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-30 hover:opacity-90 transition-all"
                    >
                      {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Run Query
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SQL Preview Panel */}
            {previewState !== "idle" && (
              <div className="w-full mt-5 rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-4 py-2.5 border-b border-border bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Generated SQL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewState === "approved" && <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✓ Approved</span>}
                    {previewState === "denied" && <span className="text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">✗ Denied</span>}
                    {previewState === "editing" && <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Editing</span>}
                  </div>
                </div>

                <div className="px-4 py-3">
                  {previewState === "editing" ? (
                    <textarea
                      value={editableSql}
                      onChange={(e) => setEditableSql(e.target.value)}
                      rows={5}
                      className="w-full resize-none bg-muted/30 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  ) : (
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg px-3 py-2.5 overflow-x-auto">{generatedSql}</pre>
                  )}
                </div>

                {(previewState === "preview" || previewState === "editing") && (
                  <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 justify-end">
                    {previewState === "editing" ? (
                      <>
                        <button onClick={() => setPreviewState("preview")} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                        <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all">
                          <Check className="h-3 w-3" />Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleDeny} disabled={isApproving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-30">
                          <X className="h-3 w-3" />Deny
                        </button>
                        <button onClick={handleEdit} disabled={isApproving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-30">
                          <Pencil className="h-3 w-3" />Edit
                        </button>
                        <button onClick={handleApprove} disabled={isApproving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-primary-foreground text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60">
                          {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Approve
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result panel — always in DOM, only width animates.
            ─────────────────────────────────────────────────────────────────
            The inner div is sized to the final width (480px) so content
            renders at full size inside the clipping overflow-hidden wrapper.
            This prevents the QueryResultPanel from seeing a shrinking
            container width during the animation. */}
        <div className={`flex-shrink-0 overflow-hidden border-l border-border transition-[width] duration-500 ease-in-out ${hasResult ? "w-[480px]" : "w-0"}`}>
          {queryResult && (
            <div className="w-[480px] h-full">
              <QueryResultPanel result={queryResult} onClose={() => setQueryResult(null)} />
            </div>
          )}
        </div>

        {/* All Tables panel — animated width, same pattern as result panel */}
        <div className={`flex-shrink-0 overflow-hidden border-l border-border transition-[width] duration-500 ease-in-out ${showAllTables && selectedDb ? "w-[640px]" : "w-0"}`}>
          {showAllTables && selectedDb && (
            <div className="w-[640px] h-full">
              <AllTablesPanel
                selectedDb={selectedDb}
                onClose={() => setShowAllTables(false)}
              />
            </div>
          )}
        </div>

        {/* Schema panel */}
        {showSchema && (
          <aside className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0 animate-in slide-in-from-right-4 duration-200">
            <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Schema</span>
                </div>
                <button onClick={() => setShowSchema(false)} className="p-1 rounded-md hover:bg-accent transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {!selectedDb && <p className="text-xs text-muted-foreground mt-2">Select a database to view its schema.</p>}
            </div>

            {selectedDb && (
              <div className="p-3 space-y-3">
                {schemaLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading schema…
                  </div>
                )}
                {schemaError && <p className="text-xs text-red-500 px-1">{schemaError}</p>}
                {!schemaLoading && !schemaError && schema.length === 0 && <p className="text-xs text-muted-foreground px-1">No tables found.</p>}

                {!schemaLoading && schema.map((t) => (
                  <div key={t.table} className="rounded-lg border border-border overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-1.5">
                      <Database className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-semibold text-foreground font-mono">{t.table}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{t.columns.length} col{t.columns.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {t.columns.map((col) => (
                        <div key={col.name} className="px-3 py-2 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {col.primary_key ? (
                              <span title="Primary Key" className="flex-shrink-0 text-[11px]">🔑</span>
                            ) : col.foreign_key ? (
                              <span title={`FK → ${col.foreign_key.table}.${col.foreign_key.column}`} className="flex-shrink-0 text-[11px]">🔗</span>
                            ) : (
                              <span className="flex-shrink-0 w-4" />
                            )}
                            <span className="font-mono text-xs font-medium text-foreground truncate">{col.name}</span>
                            <span className="ml-auto font-mono text-[10px] text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded flex-shrink-0">{col.type}</span>
                          </div>
                          {col.constraints.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
                              {col.primary_key && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">PK</span>}
                              {col.not_null && !col.primary_key && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">NOT NULL</span>}
                              {col.unique && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">UNIQUE</span>}
                              {col.foreign_key && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200" title={`References ${col.foreign_key.table}.${col.foreign_key.column}`}>
                                  FK → {col.foreign_key.table}
                                </span>
                              )}
                              {col.default_value !== null && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">DEFAULT {col.default_value}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}