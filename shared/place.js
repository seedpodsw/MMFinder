/** Shareable "where you are" for MMFinder. Query strings survive GitHub Pages. */

const VIEWS = new Set(["atlas", "walk", "turnins", "items", "spells", "gear", "quests", "who"]);
const MAP_VIEWS = new Set(["atlas", "turnins", "walk"]);
const CLASS_VIEWS = new Set(["spells", "gear", "quests"]);
const TEXT_TYPES = new Set(["contains", "notContains", "equals", "notEqual", "startsWith", "endsWith"]);
const NUMBER_TYPES = new Set([
  "equals",
  "notEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
]);

export const VIEW_LABELS = {
  atlas: "Atlas",
  walk: "Walk",
  turnins: "Turn-ins",
  items: "Items",
  spells: "Spells",
  gear: "Upgrades",
  quests: "Quests",
  who: "Who's that",
};

function encodeSpec(spec) {
  if (!spec || typeof spec !== "object" || spec.operator || spec.conditions) return null;
  if (spec.filterType === "text") {
    if (spec.type === "blank" || spec.type === "notBlank") return `text.${spec.type}`;
    if (!TEXT_TYPES.has(spec.type)) return null;
    return `text.${spec.type}:${spec.filter ?? ""}`;
  }
  if (spec.filterType === "number") {
    if (spec.type === "blank" || spec.type === "notBlank") return `number.${spec.type}`;
    if (spec.type === "inRange") {
      const from = Number(spec.filter);
      const to = Number(spec.filterTo);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
      return `number.inRange:${from}..${to}`;
    }
    const n = Number(spec.filter);
    if (!NUMBER_TYPES.has(spec.type) || !Number.isFinite(n)) return null;
    return `number.${spec.type}:${n}`;
  }
  if (spec.filterType === "set" && Array.isArray(spec.values)) {
    return `set:${spec.values.map((value) => encodeURIComponent(String(value ?? ""))).join(",")}`;
  }
  return null;
}

function decodeSpec(raw) {
  if (raw === "text.blank" || raw === "text.notBlank") {
    return { filterType: "text", type: raw.slice(5) };
  }
  if (raw === "number.blank" || raw === "number.notBlank") {
    return { filterType: "number", type: raw.slice(7) };
  }
  if (raw.startsWith("text.")) {
    const rest = raw.slice(5);
    const colon = rest.indexOf(":");
    if (colon < 0) return null;
    const type = rest.slice(0, colon);
    if (!TEXT_TYPES.has(type)) return null;
    return { filterType: "text", type, filter: rest.slice(colon + 1) };
  }
  if (raw.startsWith("number.inRange:")) {
    const [from, to] = raw.slice("number.inRange:".length).split("..");
    const filter = Number(from);
    const filterTo = Number(to);
    if (!Number.isFinite(filter) || !Number.isFinite(filterTo)) return null;
    return { filterType: "number", type: "inRange", filter, filterTo };
  }
  if (raw.startsWith("number.")) {
    const rest = raw.slice(7);
    const colon = rest.indexOf(":");
    if (colon < 0) return null;
    const type = rest.slice(0, colon);
    const filter = Number(rest.slice(colon + 1));
    if (!NUMBER_TYPES.has(type) || !Number.isFinite(filter)) return null;
    return { filterType: "number", type, filter };
  }
  if (raw.startsWith("set:")) {
    const body = raw.slice(4);
    const values = body
      ? body.split(",").map((value) => {
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        })
      : [];
    return { filterType: "set", values };
  }
  return null;
}

function writeCols(params, model) {
  const entries = Object.entries(model);
  if (!entries.length) return;
  const encoded = entries.map(([field, spec]) => [field, encodeSpec(spec)]);
  if (encoded.every(([, value]) => value != null)) {
    for (const [field, value] of encoded) params.set(`f.${field}`, value);
    return;
  }
  params.set("cols", JSON.stringify(model));
}

function readCols(params) {
  const raw = params.get("cols");
  if (raw) {
    try {
      const model = JSON.parse(raw);
      if (model && typeof model === "object" && !Array.isArray(model)) return model;
    } catch {
      /* fall through to f.* params */
    }
  }
  const model = {};
  for (const [key, value] of params.entries()) {
    if (!key.startsWith("f.")) continue;
    const spec = decodeSpec(value);
    if (spec) model[key.slice(2)] = spec;
  }
  return Object.keys(model).length ? model : null;
}

function columnFilterLabel(cols) {
  const fields = Object.keys(cols || {});
  if (fields.length !== 1) return "Column filters";
  const field = fields[0];
  const spec = cols[field];
  if (spec?.filterType === "text" && spec.filter) return `${field}: ${spec.filter}`;
  if (spec?.filterType === "number" && spec.filter != null) {
    if (spec.type === "inRange") return `${field} ${spec.filter}–${spec.filterTo}`;
    const op = {
      equals: "=",
      notEqual: "≠",
      greaterThan: ">",
      greaterThanOrEqual: "≥",
      lessThan: "<",
      lessThanOrEqual: "≤",
    }[spec.type];
    return op ? `${field} ${op} ${spec.filter}` : field;
  }
  if (spec?.filterType === "set" && Array.isArray(spec.values)) return `${field}: ${spec.values.join(", ")}`;
  return field;
}

export function readPlace(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const viewParam = params.get("view");
  const view = VIEWS.has(viewParam) ? viewParam : "atlas";
  const onItems = view === "items";
  const lvlRaw = onItems ? params.get("lvl") : null;
  const lvl = lvlRaw == null || lvlRaw === "" ? null : Number(lvlRaw);
  return {
    view,
    zone: params.get("zone") || null,
    poi: params.get("poi") || null,
    class: params.get("class") || null,
    quest: params.get("quest") || null,
    item: params.get("item") || null,
    q: onItems ? params.get("q") || null : null,
    slot: onItems && params.get("slot") ? params.get("slot").toUpperCase() : null,
    type: onItems ? params.get("type") || null : null,
    farm: onItems && params.get("farm") === "1",
    lvl: Number.isFinite(lvl) ? lvl : null,
    cols: onItems ? readCols(params) : null,
  };
}

export function writePlace(place) {
  const view = VIEWS.has(place.view) ? place.view : "atlas";
  const params = new URLSearchParams();
  if (view !== "atlas") params.set("view", view);
  if (MAP_VIEWS.has(view) && place.zone) params.set("zone", place.zone);
  if ((view === "atlas" || view === "turnins") && place.poi) params.set("poi", place.poi);
  if ((CLASS_VIEWS.has(view) || view === "items") && place.class) params.set("class", place.class);
  if (view === "quests" && place.quest) params.set("quest", place.quest);
  if (place.item && (view === "items" || view === "atlas")) params.set("item", place.item);
  if (view === "items") {
    if (place.q) params.set("q", place.q);
    if (place.slot) params.set("slot", String(place.slot).toUpperCase());
    if (place.type) params.set("type", place.type);
    if (place.farm) params.set("farm", "1");
    if (place.farm && place.lvl != null && place.lvl !== "") params.set("lvl", String(place.lvl));
    if (place.cols && Object.keys(place.cols).length) writeCols(params, place.cols);
  }
  const search = params.toString();
  return search ? `?${search}` : "?";
}

/** Filters the items grid is showing, read back from a place. */
export function itemLinkFilters(place) {
  if (!place || place.view !== "items") {
    return { q: "", classId: "", slot: "", kind: "", onlyFarmable: false, level: null, cols: null };
  }
  return {
    q: place.q || "",
    classId: place.class || "",
    slot: place.slot || "",
    kind: place.type || "",
    onlyFarmable: Boolean(place.farm),
    level: place.lvl ?? null,
    cols: place.cols,
  };
}

export function hasItemLinkFilters(filters) {
  if (!filters) return false;
  return Boolean(
    filters.q ||
      filters.classId ||
      filters.slot ||
      filters.kind ||
      filters.onlyFarmable ||
      (filters.cols && Object.keys(filters.cols).length)
  );
}

/** App view id. Turn-ins and quests are filters/screens, not separate view states. */
export function appView(place) {
  if (place.view === "quests") return "enhance";
  if (place.view === "turnins") return "atlas";
  return VIEWS.has(place.view) ? place.view : "atlas";
}

export function kindFor(place) {
  return place.view === "turnins" ? "quest" : "all";
}

export function breadcrumb(place, names = {}) {
  const view = VIEWS.has(place.view) ? place.view : "atlas";
  const crumbs = [
    { label: "MMFinder", href: "?" },
    { label: VIEW_LABELS[view], href: writePlace({ view }) },
  ];

  if (MAP_VIEWS.has(view) && place.zone) {
    crumbs.push({
      label: names.zone || "Zone",
      href: writePlace({ view, zone: place.zone }),
    });
  }
  if ((view === "atlas" || view === "turnins") && place.poi) {
    crumbs.push({
      label: names.poi || "Place",
      href: writePlace({ view, zone: place.zone, poi: place.poi }),
    });
  }
  if (CLASS_VIEWS.has(view) && place.class) {
    crumbs.push({
      label: names.class || "Class",
      href: writePlace({ view, class: place.class }),
    });
  }
  if (view === "quests" && place.quest) {
    crumbs.push({
      label: names.quest || "Quest",
      href: writePlace({ view, class: place.class, quest: place.quest }),
    });
  }

  if (view === "items") {
    const filtered = { view };
    if (place.class) {
      filtered.class = place.class;
      crumbs.push({ label: names.class || place.class, href: writePlace(filtered) });
    }
    if (place.type) {
      filtered.type = place.type;
      crumbs.push({ label: names.kind || place.type, href: writePlace(filtered) });
    }
    if (place.slot) {
      filtered.slot = place.slot;
      crumbs.push({ label: names.slot || place.slot, href: writePlace(filtered) });
    }
    if (place.q) {
      filtered.q = place.q;
      crumbs.push({ label: place.q, href: writePlace(filtered) });
    }
    if (place.farm) {
      filtered.farm = true;
      filtered.lvl = place.lvl;
      crumbs.push({
        label: place.lvl != null ? `Farmable ≤ ${place.lvl}` : "Farmable",
        href: writePlace(filtered),
      });
    }
    if (place.cols && Object.keys(place.cols).length) {
      filtered.cols = place.cols;
      crumbs.push({ label: columnFilterLabel(place.cols), href: writePlace(filtered) });
    }
  }

  if (place.item && (view === "items" || view === "atlas")) {
    crumbs.push({
      label: names.item || "Item",
      href: writePlace({
        view,
        zone: place.zone,
        poi: place.poi,
        class: view === "items" ? place.class : null,
        q: place.q,
        slot: place.slot,
        type: place.type,
        farm: place.farm,
        lvl: place.lvl,
        cols: place.cols,
        item: place.item,
      }),
    });
  }
  return crumbs;
}
