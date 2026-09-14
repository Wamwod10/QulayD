import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns3,
  Download,
  PanelRightOpen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Drawer, EmptyBlock, PageShell, SearchBox, SectionCard, SecondaryButton, SummaryGrid, SummaryItem } from "./PrototypeUI";
import Checkbox from "../ui/Checkbox";
import { useLocalDb } from "../../services/localDb";
import { getDisplayValue } from "../../utils/displayValue";

function csvEscape(value) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function SmartTablePage({
  title,
  description,
  eyebrow,
  rows,
  columns,
  actions = null,
  searchFields = [],
  filters = null,
  footer = null,
  pageSize = 15,
  detailTitle = null,
  detailDescription = null,
  detailRenderer = null,
  extraSummary = [],
  bulkActions = null,
}) {
  const safeRows = useMemo(() => Array.isArray(rows) ? rows : [], [rows]);
  const safeColumns = useMemo(() => Array.isArray(columns) ? columns : [], [columns]);
  const uiState = useLocalDb((db) => ({ showSummary: db.settings.appearance.showTableSummary !== false, meta: db.meta }));
  const showSummary = uiState.showSummary;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => safeColumns.map((column) => column.key));
  const columnMenuRef = useRef(null);

  useEffect(() => {
    setVisibleColumnKeys((current) => {
      const available = safeColumns.map((column) => column.key);
      const preserved = current.filter((key) => available.includes(key));
      const newKeys = available.filter((key) => !current.includes(key));
      return [...preserved, ...newKeys];
    });
  }, [safeColumns]);

  useEffect(() => {
    const close = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) setColumnMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const found = query
      ? safeRows.filter((row) => searchFields.some((field) => String(getDisplayValue(row?.[field], "")).toLowerCase().includes(query)))
      : safeRows;

    if (!sort.key) return found;
    return [...found].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(getDisplayValue(left, "")).localeCompare(String(getDisplayValue(right, "")), "uz");
      return sort.direction === "desc" ? -result : result;
    });
  }, [safeRows, search, searchFields, sort]);

  const visibleColumns = useMemo(
    () => safeColumns.filter((column) => visibleColumnKeys.includes(column.key)),
    [safeColumns, visibleColumnKeys],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, safeRows.length]);

  const toggleSort = (column) => {
    if (column.sortable === false) return;
    setSort((current) => ({
      key: column.key,
      direction: current.key === column.key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleColumn = (key) => {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  };

  const exportCsv = (sourceRows = filteredRows) => {
    const exportColumns = visibleColumns.filter((column) => column.key !== "actions");
    const header = exportColumns.map((column) => csvEscape(column.label)).join(",");
    const body = sourceRows.map((row) => exportColumns.map((column) => csvEscape(getDisplayValue(row?.[column.key]))).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replaceAll(" ", "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const pageIds = paginatedRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const selectedRows = safeRows.filter((row) => selectedIds.includes(row.id));

  const toggleRowSelection = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const togglePageSelection = () => {
    setSelectedIds((current) => {
      if (allPageSelected) return current.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const problemStatuses = ["INACTIVE", "DISABLED", "CANCELLED", "FAILED", "REJECTED", "OVERDUE"];
  const problemCount = safeRows.filter((row) => problemStatuses.includes(row.status)).length;
  const currentCount = safeRows.filter((row) => Object.hasOwn(row, "status") && !problemStatuses.includes(row.status)).length;
  const hasStatus = safeRows.some((row) => Object.hasOwn(row, "status"));
  const defaultSummary = [
    { label: "Jami", value: safeRows.length, hint: "Barcha yozuvlar" },
    ...(hasStatus ? [
      { label: "Faol / jarayonda", value: currentCount, hint: "Joriy ish holati" },
      { label: "E’tibor talab qiladi", value: problemCount, hint: "Muammoli yoki faolsiz" },
    ] : []),
  ];
  const summaryItems = (extraSummary.length ? extraSummary : defaultSummary).slice(0, 4);

  const rowTitle = selectedRow
    ? (typeof detailTitle === "function" ? detailTitle(selectedRow) : detailTitle)
      || selectedRow.name
      || selectedRow.number
      || selectedRow.title
      || "Yozuv tafsilotlari"
    : "";
  const rowDescription = selectedRow
    ? (typeof detailDescription === "function" ? detailDescription(selectedRow) : detailDescription)
      || "Ushbu yozuv bo‘yicha tezkor ma’lumot"
    : "";

  return (
    <PageShell title={title} description={description} eyebrow={eyebrow} actions={actions}>
      {uiState.meta?.loading ? <div className="qp-empty" role="status"><strong>Ma’lumotlar yuklanmoqda...</strong><span>Backend bilan xavfsiz aloqa o‘rnatilmoqda.</span></div> : null}
      {uiState.meta?.apiError ? <div className="qp-empty" role="alert"><strong>Ma’lumotlarni olib bo‘lmadi</strong><span>{uiState.meta.apiError.data?.message || uiState.meta.apiError.message || "Tarmoq yoki server xatosi"}</span>{uiState.meta.retry ? <SecondaryButton onClick={uiState.meta.retry}>Qayta urinish</SecondaryButton> : null}</div> : null}
      {showSummary ? (
        <SummaryGrid className="qp-table-summary">
          {summaryItems.map((item) => (
            <SummaryItem className="qp-table-summary-item" key={item.label} label={item.label} value={item.value} hint={item.hint} />
          ))}
        </SummaryGrid>
      ) : null}

      {selectedIds.length ? (
        <div className="qp-selection-bar">
          <div><strong>{selectedIds.length} ta yozuv tanlandi</strong><span>Tanlangan yozuvlar bilan tezkor ishlash</span></div>
          <div className="qp-inline-actions">
            <SecondaryButton type="button" onClick={() => exportCsv(selectedRows)}><Download size={15} /> Tanlanganlarni eksport</SecondaryButton>
            {bulkActions ? bulkActions(selectedRows, () => setSelectedIds([])) : null}
            <button type="button" className="qp-button qp-button-ghost" onClick={() => setSelectedIds([])}>Tanlovni tozalash</button>
          </div>
        </div>
      ) : null}

      <div className="qp-toolbar qp-table-toolbar">
        <div className="qp-toolbar-left">
          <SearchBox value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jadvaldan qidirish..." />
          <span className="qp-result-count">{filteredRows.length} ta natija</span>
        </div>
        <div className="qp-toolbar-right">
          {filters}
          <div className="qp-table-tool-wrap" ref={columnMenuRef}>
            <SecondaryButton type="button" onClick={() => setColumnMenuOpen((value) => !value)}>
              <Columns3 size={15} /> Ustunlar
            </SecondaryButton>
            {columnMenuOpen ? (
              <div className="qp-table-column-menu">
                <div className="qp-table-column-menu-head">
                  <strong>Ko‘rinadigan ustunlar</strong>
                  <span>{visibleColumns.length}/{safeColumns.length}</span>
                </div>
                {safeColumns.map((column) => {
                  const active = visibleColumnKeys.includes(column.key);
                  return (
                    <button key={column.key} type="button" onClick={() => toggleColumn(column.key)}>
                      <span className={`qp-column-check ${active ? "active" : ""}`}>{active ? <Check size={12} /> : null}</span>
                      {column.label || "Ustun"}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <SecondaryButton type="button" onClick={exportCsv}><Download size={15} /> Eksport</SecondaryButton>
        </div>
      </div>

      <SectionCard className="qp-table-card">
        {filteredRows.length ? (
          <>
            <div className="qp-table-wrap">
              <table className="qp-table qp-smart-table">
                <thead>
                  <tr>
                    <th className="qp-select-column">
                      <Checkbox checked={allPageSelected} indeterminate={selectedIds.length > 0 && !allPageSelected} onChange={togglePageSelection} ariaLabel="Sahifadagi barcha yozuvlarni tanlash" />
                    </th>
                    {visibleColumns.map((column) => {
                      const active = sort.key === column.key;
                      return (
                        <th key={column.key}>
                          <button
                            type="button"
                            className={`qp-sort-button ${column.sortable === false ? "disabled" : ""}`}
                            onClick={() => toggleSort(column)}
                            disabled={column.sortable === false}
                          >
                            <span>{column.label}</span>
                            {active ? (sort.direction === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null}
                          </button>
                        </th>
                      );
                    })}
                    <th className="qp-detail-column"><span className="qp-visually-hidden">Tafsilot</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="qp-clickable-row"
                      tabIndex={0}
                      onClick={(event) => {
                        if (event.target.closest("a, button, input, select, textarea, label")) return;
                        setSelectedRow(row);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setSelectedRow(row);
                      }}
                    >
                      <td className="qp-select-column">
                        <Checkbox checked={selectedIds.includes(row.id)} onChange={() => toggleRowSelection(row.id)} onClick={(event) => event.stopPropagation()} ariaLabel="Yozuvni tanlash" />
                      </td>
                      {visibleColumns.map((column) => (
                        <td key={column.key}>{column.render ? column.render(row) : getDisplayValue(row?.[column.key])}</td>
                      ))}
                      <td className="qp-detail-column"><PanelRightOpen size={14} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="qp-mobile-record-list">
              {paginatedRows.map((row) => (
                <article
                  key={row.id}
                  className="qp-mobile-record"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    if (event.target.closest("a, button, input, select, textarea, label")) return;
                    setSelectedRow(row);
                  }}
                  onKeyDown={(event) => { if (event.key === "Enter") setSelectedRow(row); }}
                >
                  <div className="qp-mobile-record-select"><Checkbox checked={selectedIds.includes(row.id)} onChange={() => toggleRowSelection(row.id)} onClick={(event) => event.stopPropagation()} ariaLabel="Yozuvni tanlash" /></div>
                  <div className="qp-mobile-record-fields">
                    {visibleColumns.filter((column) => column.key !== "actions").slice(0, 4).map((column, index) => (
                      <div key={column.key} className={index === 0 ? "is-primary" : ""}>
                        <span>{column.label}</span>
                        <div>{column.render ? column.render(row) : getDisplayValue(row?.[column.key])}</div>
                      </div>
                    ))}
                  </div>
                  <PanelRightOpen size={17} className="qp-mobile-record-open" />
                </article>
              ))}
            </div>

            <div className="qp-table-footer">
              <span>
                {filteredRows.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filteredRows.length)} / {filteredRows.length}
              </span>
              <div className="qp-pagination-controls">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1} aria-label="Oldingi sahifa"><ChevronLeft size={16} /></button>
                <strong>{safePage} / {totalPages}</strong>
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages} aria-label="Keyingi sahifa"><ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        ) : <EmptyBlock title="Natija topilmadi" description="Qidiruv yoki filtrni o‘zgartirib ko‘ring." />}
        {footer ? <div>{footer}</div> : null}
      </SectionCard>

      <Drawer open={Boolean(selectedRow)} title={rowTitle} description={rowDescription} onClose={() => setSelectedRow(null)}>
        {selectedRow ? (
          detailRenderer ? detailRenderer(selectedRow) : (
            <div className="qp-drawer-details">
              {visibleColumns.filter((column) => column.label).map((column) => (
                <div className="qp-drawer-detail-row" key={column.key}>
                  <span>{column.label}</span>
                  <div>{column.render ? column.render(selectedRow) : getDisplayValue(selectedRow?.[column.key])}</div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </Drawer>
    </PageShell>
  );
}

export default SmartTablePage;
