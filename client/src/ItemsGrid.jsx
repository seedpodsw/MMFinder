import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDarkWarm,
  themeQuartz,
} from "ag-grid-community";
import { CLASS_ABBR, ALL_CLASS_TOKENS, tokensOf } from "./gear";

ModuleRegistry.registerModules([AllCommunityModule]);

const METHOD_LABEL = {
  quest: "Quest",
  drop: "Drop",
  vendor: "Vendor",
  craft: "Craft",
  unknown: "Other",
};

const STORE_LAST = "mmfinder.items.lastView.v1";
const STORE_VIEWS = "mmfinder.items.savedViews.v1";

const gridTheme = themeQuartz.withPart(colorSchemeDarkWarm).withParams({
  backgroundColor: "#1a120c",
  foregroundColor: "#f3e6c8",
  headerBackgroundColor: "#24180f",
  oddRowBackgroundColor: "#1f160f",
  rowHoverColor: "rgba(196, 92, 38, 0.18)",
  selectedRowBackgroundColor: "rgba(61, 92, 69, 0.35)",
  borderColor: "rgba(212, 180, 131, 0.22)",
  accentColor: "#c45c26",
  fontFamily: '"Source Sans 3", system-ui, sans-serif',
  headerFontFamily: '"Cinzel", serif',
  fontSize: 13,
  headerFontSize: 12,
  spacing: 6,
  borderRadius: 4,
});

function FarmCell({ value, data, onFarm }) {
  const canJump = Boolean(data?.primaryPoiId || data?.primaryZoneId || data?.zoneName);
  if (!value) return <span className="items-muted">—</span>;
  if (!canJump) return <span>{value}</span>;
  return (
    <button
      type="button"
      className="items-farm-link"
      title="Show on world map"
      onClick={(e) => {
        e.stopPropagation();
        onFarm?.(data);
      }}
    >
      {value}
    </button>
  );
}

function WikiCell({ value }) {
  if (!value) return <span className="items-muted">—</span>;
  return (
    <a className="items-farm-link" href={value} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      Wiki
    </a>
  );
}

function parseNum(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function numCol(field, headerName, width = 78) {
  return {
    field,
    headerName,
    filter: "agNumberColumnFilter",
    width,
    type: "numericColumn",
    valueFormatter: (p) => (p.value == null ? "" : String(p.value)),
    comparator: (a, b) => {
      const av = a == null ? Number.NEGATIVE_INFINITY : Number(a);
      const bv = b == null ? Number.NEGATIVE_INFINITY : Number(b);
      return av - bv;
    },
  };
}

const NUM_FIELDS = [
  "ac", "dmg", "delay", "str", "sta", "agi", "dex", "int", "wis", "cha",
  "hp", "mana", "hp_regen", "mana_regen", "haste", "spell_haste", "ranged_haste",
  "cr", "cor", "dr", "er", "fr", "hr", "mr", "pr", "weight",
];

/** Column presets: which fields are visible. */
const COLUMN_PRESETS = {
  Compact: ["name", "kind", "slot", "ac", "dmg", "delay", "skill", "classReq", "farmAt", "zoneName", "level", "wikiUrl"],
  Combat: ["name", "slot", "ac", "dmg", "delay", "skill", "str", "sta", "agi", "dex", "hp", "haste", "classReq", "farmAt", "zoneName", "level", "wikiUrl"],
  Caster: ["name", "slot", "ac", "int", "wis", "cha", "hp", "mana", "mana_regen", "effect", "classReq", "farmAt", "zoneName", "level", "wikiUrl"],
  Resists: ["name", "slot", "ac", "mr", "fr", "cr", "dr", "pr", "er", "hr", "cor", "classReq", "farmAt", "zoneName", "wikiUrl"],
};

function toRows(items) {
  return (items || []).map((item) => {
    const nums = {};
    for (const key of NUM_FIELDS) nums[key] = parseNum(item[key]);
    return {
      id: item.id,
      name: item.name || "",
      kind: item.kind || "item",
      slot: item.slot || "",
      skill: item.skill || "",
      classReq: item.class || "",
      race: item.race || "",
      size: item.size || "",
      magic: item.magic || "",
      unique: item.unique || "",
      effect: [item.effect, item.effect1, item.effect2, item.effect3].filter(Boolean).join(" · "),
      method: METHOD_LABEL[item.method] || item.method || "",
      farmAt: item.farmAt || item.how || "",
      zoneName: item.zoneName || "",
      campName: item.campName || "",
      npc: item.npc || "",
      level: item.level || "",
      levelMin: item.levelMin ?? null,
      levelMax: item.levelMax ?? null,
      how: item.how || "",
      origin: item.origin || "",
      notes: item.notes || "",
      categories: Array.isArray(item.categories) ? item.categories.join(", ") : "",
      wikiUrl: item.wikiUrl || "",
      primaryPoiId: item.primaryPoiId || null,
      primaryZoneId: item.primaryZoneId || null,
      primaryQuestId: item.primaryQuestId || null,
      ...nums,
      _item: item,
    };
  });
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

const EMPTY_PRESETS = { classId: "", slot: "", kind: "", onlyFarmable: false, level: 1 };

function useFilterOptions(api, getValues) {
  const [options, setOptions] = useState(() => getValues?.() || []);
  useEffect(() => {
    if (!api) return undefined;
    const refresh = () => setOptions(getValues?.() || []);
    refresh();
    api.addEventListener("rowDataUpdated", refresh);
    return () => api.removeEventListener("rowDataUpdated", refresh);
  }, [api, getValues]);
  return options;
}

function FilterChoices({ value, options, label, onChange }) {
  const shown = !value || options.includes(value) ? options : [value, ...options];
  return (
    <select className="items-col-filter" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Any</option>
      {shown.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

/** Kind/slot dropdowns in the column filter row. Slot matches any token on the item. */
const TokenSetFilter = forwardRef(function TokenSetFilter(props, ref) {
  const propsRef = useRef(props);
  propsRef.current = props;
  const valueRef = useRef("");
  const [value, setValue] = useState("");
  const getValues = props.getValues || props.filterParams?.getValues;
  const options = useFilterOptions(props.api, getValues);
  const label = props.colDef?.headerName || "Filter";

  const choose = useCallback((next) => {
    const picked = next || "";
    valueRef.current = picked;
    setValue(picked);
    const current = propsRef.current;
    (current.onToken || current.filterParams?.onToken)?.(picked);
    current.filterChangedCallback?.();
  }, []);

  useImperativeHandle(ref, () => ({
    isFilterActive() {
      return Boolean(valueRef.current);
    },
    doesFilterPass(params) {
      const picked = valueRef.current;
      if (!picked) return true;
      const data = params.data || params.node?.data;
      if (!data) return true;
      const current = propsRef.current;
      const field = current.colDef?.field;
      const raw = data[field];
      const tokenize = current.tokenize ?? current.filterParams?.tokenize;
      if (tokenize) return tokensOf(raw).includes(picked);
      return String(raw || "") === picked;
    },
    getModel() {
      return valueRef.current ? { filterType: "token", value: valueRef.current } : null;
    },
    setModel(model) {
      const next = model?.value || "";
      const changed = next !== valueRef.current;
      valueRef.current = next;
      setValue(next);
      if (changed) {
        const current = propsRef.current;
        (current.onToken || current.filterParams?.onToken)?.(next);
      }
    },
    onFloatingFilterChanged(_type, next) {
      choose(next);
    },
  }));

  return (
    <div className="items-filter-popup">
      <FilterChoices label={label} value={value} options={options} onChange={choose} />
    </div>
  );
});

const TokenSetFloatingFilter = forwardRef(function TokenSetFloatingFilter(props, ref) {
  const [value, setValue] = useState("");
  const options = useFilterOptions(props.api, props.filterParams?.getValues || props.getValues);
  const label = props.column?.getColDef?.().headerName || "Filter";

  useImperativeHandle(ref, () => ({
    onParentModelChanged(model) {
      setValue(model?.value || "");
    },
  }));

  return (
    <FilterChoices
      label={label}
      value={value}
      options={options}
      onChange={(next) => {
        setValue(next);
        props.parentFilterInstance((instance) => {
          instance.onFloatingFilterChanged?.(null, next);
        });
      }}
    />
  );
});

export default function ItemsGrid({
  items,
  classes = [],
  level = 1,
  klass = "",
  linkFilters = null,
  onLinkFilters,
  onFarm,
  onSelectItem,
}) {
  const gridRef = useRef(null);
  const apiRef = useRef(null);
  const restoredRef = useRef(false);
  const linkFiltersRef = useRef(linkFilters);
  const onLinkFiltersRef = useRef(onLinkFilters);
  const publishedRef = useRef("");
  const seenFilters = useRef(linkFilters);
  linkFiltersRef.current = linkFilters;
  onLinkFiltersRef.current = onLinkFilters;

  const [quickFilter, setQuickFilter] = useState(() => linkFilters?.q || "");
  const [presets, setPresets] = useState(() => ({
    ...EMPTY_PRESETS,
    level: linkFilters?.level || level || 1,
    classId: linkFilters?.classId || klass || "",
    slot: linkFilters?.slot || "",
    kind: linkFilters?.kind || "",
    onlyFarmable: Boolean(linkFilters?.onlyFarmable),
  }));
  const [displayedCount, setDisplayedCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colVisibility, setColVisibility] = useState({});
  const [savedViews, setSavedViews] = useState(() => loadJSON(STORE_VIEWS, []));

  const presetsRef = useRef(presets);
  presetsRef.current = presets;
  const quickRef = useRef(quickFilter);
  quickRef.current = quickFilter;

  const farmHandler = useCallback((row) => onFarm?.(row?._item || row), [onFarm]);
  const rowData = useMemo(() => toRows(items), [items]);

  const classOptions = useMemo(
    () => (classes || []).filter((c) => CLASS_ABBR[c.id]).map((c) => ({ id: c.id, name: c.name })),
    [classes]
  );

  const slotOptions = useMemo(() => {
    const set = new Set();
    for (const r of rowData) for (const t of tokensOf(r.slot)) set.add(t);
    return [...set].sort();
  }, [rowData]);

  const kindOptions = useMemo(() => {
    const set = new Set();
    for (const r of rowData) if (r.kind) set.add(r.kind);
    return [...set].sort();
  }, [rowData]);

  const slotOptionsRef = useRef(slotOptions);
  const kindOptionsRef = useRef(kindOptions);
  slotOptionsRef.current = slotOptions;
  kindOptionsRef.current = kindOptions;
  const slotValues = useCallback(() => slotOptionsRef.current, []);
  const kindValues = useCallback(() => kindOptionsRef.current, []);
  const onSlotToken = useCallback((value) => {
    const prev = presetsRef.current;
    const slot = value || "";
    if ((prev.slot || "") === slot) return;
    const next = { ...prev, slot };
    presetsRef.current = next;
    setPresets(next);
  }, []);
  const onKindToken = useCallback((value) => {
    const prev = presetsRef.current;
    const kind = value || "";
    if ((prev.kind || "") === kind) return;
    const next = { ...prev, kind };
    presetsRef.current = next;
    setPresets(next);
  }, []);

  const columnDefs = useMemo(
    () => [
      { field: "name", headerName: "Item", filter: "agTextColumnFilter", minWidth: 200, flex: 1.4, pinned: "left" },
      {
        field: "kind",
        headerName: "Kind",
        width: 130,
        filter: TokenSetFilter,
        floatingFilterComponent: TokenSetFloatingFilter,
        filterParams: { getValues: kindValues, onToken: onKindToken },
        suppressFloatingFilterButton: true,
        suppressHeaderFilterButton: true,
      },
      {
        field: "slot",
        headerName: "Slot",
        width: 150,
        filter: TokenSetFilter,
        floatingFilterComponent: TokenSetFloatingFilter,
        filterParams: { tokenize: true, getValues: slotValues, onToken: onSlotToken },
        suppressFloatingFilterButton: true,
        suppressHeaderFilterButton: true,
      },
      numCol("ac", "AC"),
      numCol("dmg", "DMG"),
      numCol("delay", "Delay", 86),
      { field: "skill", headerName: "Skill", filter: "agSetColumnFilter", width: 86 },
      numCol("str", "STR"),
      numCol("sta", "STA"),
      numCol("agi", "AGI"),
      numCol("dex", "DEX"),
      numCol("int", "INT"),
      numCol("wis", "WIS"),
      numCol("cha", "CHA"),
      numCol("hp", "HP"),
      numCol("mana", "Mana", 86),
      numCol("hp_regen", "HP Reg", 86),
      numCol("mana_regen", "Mana Reg", 94),
      numCol("haste", "Haste", 86),
      numCol("spell_haste", "SpHaste", 90),
      numCol("ranged_haste", "RngHaste", 94),
      numCol("mr", "MR"),
      numCol("fr", "FR"),
      numCol("cr", "CR"),
      numCol("dr", "DR"),
      numCol("pr", "PR"),
      numCol("er", "ER"),
      numCol("hr", "HR"),
      numCol("cor", "CoR"),
      numCol("weight", "Wt", 72),
      { field: "size", headerName: "Size", filter: "agSetColumnFilter", width: 90 },
      { field: "classReq", headerName: "Class", filter: "agTextColumnFilter", minWidth: 140, flex: 1 },
      { field: "race", headerName: "Race", filter: "agSetColumnFilter", width: 90 },
      { field: "magic", headerName: "Magic", filter: "agSetColumnFilter", width: 90 },
      { field: "unique", headerName: "Unique", filter: "agSetColumnFilter", width: 90 },
      { field: "effect", headerName: "Effect", filter: "agTextColumnFilter", minWidth: 160, flex: 1 },
      { field: "method", headerName: "Method", filter: "agSetColumnFilter", width: 100 },
      {
        field: "farmAt",
        headerName: "Where to farm",
        filter: "agTextColumnFilter",
        minWidth: 220,
        flex: 1.6,
        cellRenderer: FarmCell,
        cellRendererParams: { onFarm: farmHandler },
        cellClass: "items-farm-cell",
      },
      { field: "zoneName", headerName: "Zone", filter: "agSetColumnFilter", width: 140 },
      { field: "campName", headerName: "Camp", filter: "agTextColumnFilter", width: 130 },
      { field: "npc", headerName: "NPC / Mob", filter: "agTextColumnFilter", minWidth: 140, flex: 1 },
      { field: "level", headerName: "Level", filter: "agTextColumnFilter", width: 90 },
      { field: "how", headerName: "How to get", filter: "agTextColumnFilter", minWidth: 160, flex: 1 },
      { field: "origin", headerName: "Origin", filter: "agSetColumnFilter", width: 90 },
      { field: "notes", headerName: "Notes", filter: "agTextColumnFilter", minWidth: 140, flex: 1 },
      { field: "wikiUrl", headerName: "Wiki", width: 80, filter: false, sortable: false, cellRenderer: WikiCell },
    ],
    [farmHandler, kindValues, slotValues, onKindToken, onSlotToken]
  );

  const allColumns = useMemo(
    () => columnDefs.map((c) => ({ field: c.field, header: c.headerName })),
    [columnDefs]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: true,
      menuTabs: ["filterMenuTab"],
      suppressHeaderMenuButton: true,
      suppressHeaderFilterButton: false,
    }),
    []
  );

  // Class and farmable stay outside the columns. Kind and slot are column filters.
  const isExternalFilterPresent = useCallback(() => {
    const p = presetsRef.current;
    return Boolean(p.classId || p.onlyFarmable);
  }, []);

  const doesExternalFilterPass = useCallback((node) => {
    const p = presetsRef.current;
    const d = node.data;
    if (!d) return true;

    if (p.classId) {
      const abbrs = CLASS_ABBR[p.classId] || [];
      const tokens = tokensOf(d.classReq);
      const usableByAll = tokens.length === 0 || tokens.some((t) => ALL_CLASS_TOKENS.has(t));
      const match = usableByAll || tokens.some((t) => abbrs.includes(t));
      if (!match) return false;
    }
    if (p.onlyFarmable) {
      const lvl = Number(p.level) || 0;
      if (d.levelMin != null && d.levelMin > lvl) return false;
    }
    return true;
  }, []);

  useEffect(() => {
    apiRef.current?.onFilterChanged();
  }, [presets]);

  const updatePreset = useCallback((patch) => {
    setPresets((prev) => ({ ...prev, ...patch }));
  }, []);

  // ---- Column visibility ---------------------------------------------------
  const applyColumnVisibility = useCallback((visMap) => {
    const api = apiRef.current;
    if (!api) return;
    for (const { field } of allColumns) {
      api.setColumnsVisible([field], visMap[field] !== false);
    }
  }, [allColumns]);

  const toggleColumn = useCallback((field) => {
    setColVisibility((prev) => {
      const next = { ...prev, [field]: prev[field] === false ? true : false };
      apiRef.current?.setColumnsVisible([field], next[field] !== false);
      return next;
    });
  }, []);

  const applyColumnPreset = useCallback(
    (name) => {
      const visibleFields = COLUMN_PRESETS[name];
      const next = {};
      for (const { field } of allColumns) next[field] = visibleFields ? visibleFields.includes(field) : true;
      setColVisibility(next);
      applyColumnVisibility(next);
    },
    [allColumns, applyColumnVisibility]
  );

  const showAllColumns = useCallback(() => {
    const next = {};
    for (const { field } of allColumns) next[field] = true;
    setColVisibility(next);
    applyColumnVisibility(next);
  }, [allColumns, applyColumnVisibility]);

  // ---- Persisted view state ------------------------------------------------
  const captureView = useCallback(() => {
    const api = apiRef.current;
    if (!api) return null;
    return {
      presets: presetsRef.current,
      quickFilter,
      columnState: api.getColumnState(),
      filterModel: api.getFilterModel(),
    };
  }, [quickFilter]);

  const persistLast = useCallback(() => {
    const view = captureView();
    if (view) saveJSON(STORE_LAST, view);
  }, [captureView]);

  const publish = useCallback(() => {
    const api = apiRef.current;
    if (!api || !onLinkFiltersRef.current) return;
    const model = { ...(api.getFilterModel() || {}) };
    delete model.slot;
    delete model.kind;
    const p = presetsRef.current;
    const next = {
      q: quickRef.current || "",
      classId: p.classId || "",
      slot: p.slot || "",
      kind: p.kind || "",
      onlyFarmable: Boolean(p.onlyFarmable),
      level: p.onlyFarmable ? Number(p.level) || 1 : null,
      cols: Object.keys(model).length ? model : null,
    };
    const key = JSON.stringify(next);
    if (key === publishedRef.current) return;
    publishedRef.current = key;
    onLinkFiltersRef.current(next);
  }, []);

  const applyLinkFilters = useCallback((filters, api, initial = false) => {
    const current = presetsRef.current;
    const nextPresets = {
      ...EMPTY_PRESETS,
      ...current,
      classId: filters?.classId || (initial ? current.classId : "") || "",
      slot: filters?.slot || "",
      kind: filters?.kind || "",
      onlyFarmable: Boolean(filters?.onlyFarmable),
      level: filters?.level || current.level || 1,
    };
    presetsRef.current = nextPresets;
    quickRef.current = filters?.q || "";
    setQuickFilter(quickRef.current);
    setPresets(nextPresets);
    const model = { ...(filters?.cols || {}) };
    if (nextPresets.slot) model.slot = { filterType: "token", value: nextPresets.slot };
    if (nextPresets.kind) model.kind = { filterType: "token", value: nextPresets.kind };
    api.setFilterModel(Object.keys(model).length ? model : null);
  }, []);

  const setTokenFilter = useCallback((field, value) => {
    const api = apiRef.current;
    const prev = presetsRef.current;
    const nextPresets = { ...prev, [field]: value };
    presetsRef.current = nextPresets;
    setPresets(nextPresets);
    if (!api) return;
    const model = { ...(api.getFilterModel() || {}) };
    if (value) model[field] = { filterType: "token", value };
    else delete model[field];
    api.setFilterModel(Object.keys(model).length ? model : null);
  }, []);

  useEffect(() => {
    publish();
  }, [quickFilter, publish]);

  useEffect(() => {
    if (linkFilters === seenFilters.current) return;
    seenFilters.current = linkFilters;
    const key = JSON.stringify(linkFilters || null);
    if (key === publishedRef.current) return;
    const api = apiRef.current;
    if (!api) return;
    publishedRef.current = key;
    applyLinkFilters(linkFilters, api, false);
  }, [linkFilters, applyLinkFilters]);

  const applyView = useCallback((view) => {
    const api = apiRef.current;
    if (!api || !view) return;
    if (view.columnState) api.applyColumnState({ state: view.columnState, applyOrder: true });
    const nextPresets = { ...EMPTY_PRESETS, level: presetsRef.current.level || 1, ...(view.presets || {}) };
    const model = { ...(view.filterModel || {}) };
    if (model.slot?.filterType !== "token" && nextPresets.slot) {
      model.slot = { filterType: "token", value: nextPresets.slot };
    }
    if (model.kind?.filterType !== "token" && nextPresets.kind) {
      model.kind = { filterType: "token", value: nextPresets.kind };
    }
    if (!nextPresets.slot) delete model.slot;
    if (!nextPresets.kind) delete model.kind;
    if (model.slot?.filterType === "token") nextPresets.slot = model.slot.value || "";
    if (model.kind?.filterType === "token") nextPresets.kind = model.kind.value || "";
    presetsRef.current = nextPresets;
    quickRef.current = view.quickFilter || "";
    setQuickFilter(quickRef.current);
    setPresets(nextPresets);
    api.setFilterModel(Object.keys(model).length ? model : null);
    const vis = {};
    for (const cs of view.columnState || []) vis[cs.colId] = !cs.hide;
    setColVisibility(vis);
    api.onFilterChanged();
  }, []);

  const onGridReady = useCallback(
    (e) => {
      apiRef.current = e.api;
      if (!restoredRef.current) {
        restoredRef.current = true;
        const last = loadJSON(STORE_LAST, null);
        if (last?.columnState) {
          e.api.applyColumnState({ state: last.columnState, applyOrder: true });
          const vis = {};
          for (const cs of last.columnState) vis[cs.colId] = !cs.hide;
          setColVisibility(vis);
        }
        applyLinkFilters(linkFiltersRef.current, e.api, true);
      }
      setDisplayedCount(e.api.getDisplayedRowCount());
      publish();
    },
    [applyLinkFilters, publish]
  );

  const onStateChanged = useCallback(() => {
    setDisplayedCount(apiRef.current?.getDisplayedRowCount() || 0);
    publish();
    persistLast();
  }, [persistLast, publish]);

  const resetView = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const nextPresets = { ...EMPTY_PRESETS, level: level || 1 };
    presetsRef.current = nextPresets;
    quickRef.current = "";
    api.setFilterModel(null);
    api.applyColumnState({ defaultState: { hide: false, sort: null }, applyOrder: false });
    setQuickFilter("");
    setPresets(nextPresets);
    showAllColumns();
    try {
      localStorage.removeItem(STORE_LAST);
    } catch {
      /* ignore */
    }
  }, [level, showAllColumns]);

  const exportCsv = useCallback(() => {
    apiRef.current?.exportDataAsCsv({
      fileName: `mmfinder-items-${new Date().toISOString().slice(0, 10)}.csv`,
      allColumns: false,
    });
  }, []);

  // ---- Named saved views ---------------------------------------------------
  const saveNamedView = useCallback(() => {
    const view = captureView();
    if (!view) return;
    const name = (typeof window !== "undefined" && window.prompt("Name this view", ""))?.trim();
    if (!name) return;
    setSavedViews((prev) => {
      const next = [...prev.filter((v) => v.name !== name), { name, view }];
      saveJSON(STORE_VIEWS, next);
      return next;
    });
  }, [captureView]);

  const applyNamedView = useCallback(
    (name) => {
      const found = savedViews.find((v) => v.name === name);
      if (found) applyView(found.view);
    },
    [savedViews, applyView]
  );

  const deleteNamedView = useCallback(
    (name) => {
      setSavedViews((prev) => {
        const next = prev.filter((v) => v.name !== name);
        saveJSON(STORE_VIEWS, next);
        return next;
      });
    },
    []
  );

  const onCellClicked = useCallback(
    (e) => {
      if (e.colDef?.field === "farmAt") {
        if (e.data?.primaryPoiId || e.data?.primaryZoneId || e.data?.zoneName) farmHandler(e.data);
        return;
      }
      if (e.colDef?.field === "wikiUrl") return;
      if (e.data?._item) onSelectItem?.(e.data._item);
    },
    [farmHandler, onSelectItem]
  );

  const activePresetCount =
    (presets.classId ? 1 : 0) + (presets.slot ? 1 : 0) + (presets.kind ? 1 : 0) + (presets.onlyFarmable ? 1 : 0);

  return (
    <div className="items-view">
      <div className="items-toolbar">
        <div className="items-title">
          <p className="eyebrow">Catalog</p>
          <h2>Items</h2>
        </div>

        <label className="items-search">
          <span>Search</span>
          <input
            value={quickFilter}
            onChange={(e) => {
              quickRef.current = e.target.value;
              setQuickFilter(e.target.value);
            }}
            placeholder="Name, AC, zone, mob, slot…"
          />
        </label>

        <div className="items-actions">
          <div className="items-menu-wrap">
            <button type="button" className="items-btn" onClick={() => setMenuOpen((v) => !v)}>
              Columns ▾
            </button>
            {menuOpen && (
              <div className="items-menu" onMouseLeave={() => setMenuOpen(false)}>
                <div className="items-menu-presets">
                  {Object.keys(COLUMN_PRESETS).map((name) => (
                    <button key={name} type="button" className="items-chip" onClick={() => applyColumnPreset(name)}>
                      {name}
                    </button>
                  ))}
                  <button type="button" className="items-chip" onClick={showAllColumns}>
                    All
                  </button>
                </div>
                <div className="items-menu-list">
                  {allColumns.map((c) => (
                    <label key={c.field} className="items-menu-item">
                      <input
                        type="checkbox"
                        checked={colVisibility[c.field] !== false}
                        onChange={() => toggleColumn(c.field)}
                      />
                      <span>{c.header}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button type="button" className="items-btn" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="items-btn ghost" onClick={resetView}>
            Reset
          </button>
        </div>
      </div>

      <div className="items-presetbar">
        <label>
          <span>Class</span>
          <select value={presets.classId} onChange={(e) => updatePreset({ classId: e.target.value })}>
            <option value="">Any class</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Slot</span>
          <select value={presets.slot} onChange={(e) => setTokenFilter("slot", e.target.value)}>
            <option value="">Any slot</option>
            {slotOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Kind</span>
          <select value={presets.kind} onChange={(e) => setTokenFilter("kind", e.target.value)}>
            <option value="">Any kind</option>
            {kindOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label className="items-farmable">
          <input
            type="checkbox"
            checked={presets.onlyFarmable}
            onChange={(e) => updatePreset({ onlyFarmable: e.target.checked })}
          />
          <span>Farmable ≤</span>
          <input
            className="items-lvl"
            type="number"
            min="1"
            max="60"
            value={presets.level}
            onChange={(e) => updatePreset({ level: Number(e.target.value) || 1 })}
          />
        </label>

        {activePresetCount > 0 && (
          <button
            type="button"
            className="items-chip clear"
            onClick={() => {
              const next = { ...EMPTY_PRESETS, level: presets.level };
              presetsRef.current = next;
              setPresets(next);
              const api = apiRef.current;
              if (!api) return;
              const model = { ...(api.getFilterModel() || {}) };
              delete model.slot;
              delete model.kind;
              api.setFilterModel(Object.keys(model).length ? model : null);
            }}
          >
            Clear presets ({activePresetCount})
          </button>
        )}

        <div className="items-views">
          <span>Saved views</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) applyNamedView(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Load…</option>
            {savedViews.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
          <button type="button" className="items-btn small" onClick={saveNamedView}>
            Save
          </button>
          {savedViews.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) deleteNamedView(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Delete…</option>
              {savedViews.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="items-count">
          {displayedCount.toLocaleString()} / {rowData.length.toLocaleString()} items
        </p>
      </div>

      <div className="items-grid-wrap">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.id}
          quickFilterText={quickFilter}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onFilterChanged={onStateChanged}
          onSortChanged={onStateChanged}
          onColumnVisible={persistLast}
          onColumnMoved={persistLast}
          onColumnResized={persistLast}
          onModelUpdated={() => setDisplayedCount(apiRef.current?.getDisplayedRowCount() || 0)}
          animateRows
          rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
          onCellClicked={onCellClicked}
          suppressCellFocus
        />
      </div>
    </div>
  );
}
