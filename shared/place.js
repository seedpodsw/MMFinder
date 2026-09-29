/** Shareable "where you are" for MMFinder. Query strings survive GitHub Pages. */

const VIEWS = new Set(["atlas", "walk", "turnins", "items", "spells", "gear", "quests"]);
const MAP_VIEWS = new Set(["atlas", "turnins", "walk"]);
const CLASS_VIEWS = new Set(["spells", "gear", "quests"]);

export const VIEW_LABELS = {
  atlas: "Atlas",
  walk: "Walk",
  turnins: "Turn-ins",
  items: "Items",
  spells: "Spells",
  gear: "Upgrades",
  quests: "Quests",
};

export function readPlace(search) {
  const q = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const viewParam = q.get("view");
  return {
    view: VIEWS.has(viewParam) ? viewParam : "atlas",
    zone: q.get("zone") || null,
    poi: q.get("poi") || null,
    class: q.get("class") || null,
    quest: q.get("quest") || null,
    item: q.get("item") || null,
  };
}

export function writePlace(place) {
  const view = VIEWS.has(place.view) ? place.view : "atlas";
  const q = new URLSearchParams();
  if (view !== "atlas") q.set("view", view);
  if (MAP_VIEWS.has(view) && place.zone) q.set("zone", place.zone);
  if ((view === "atlas" || view === "turnins") && place.poi) q.set("poi", place.poi);
  if (CLASS_VIEWS.has(view) && place.class) q.set("class", place.class);
  if (view === "quests" && place.quest) q.set("quest", place.quest);
  if (place.item && (view === "items" || view === "atlas")) q.set("item", place.item);
  const search = q.toString();
  return search ? `?${search}` : "?";
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
  if (place.item && (view === "items" || view === "atlas")) {
    crumbs.push({
      label: names.item || "Item",
      href: writePlace({
        view,
        zone: place.zone,
        poi: place.poi,
        item: place.item,
      }),
    });
  }
  return crumbs;
}
