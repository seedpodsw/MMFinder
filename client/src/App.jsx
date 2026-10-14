import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { api } from "./api";
const Walk = lazy(() => import("./Walk"));
const Spells = lazy(() => import("./Spells"));
import WorldMap, { campFits, hasHuntLevel, rangeLabel, KIND_LABEL } from "./WorldMap";
import Enhance, { ZoneQuestTab, searchQuests } from "./Enhance";
import ItemsGrid from "./ItemsGrid";
import ItemCard from "./ItemCard";
import GearFinder from "./GearFinder";
import WhoIsThat from "./WhoIsThat";
import Notes from "./Notes";
import Characters from "./Characters";
import Hunt from "./Hunt";
import Trades from "./Trades";
import {
  adoptLegacy,
  characterLabel,
  equipItem,
  loadCharacters,
  patchCharacter,
  readLegacyLoadout,
  saveCharacters,
  selectCharacter,
  unequipItem,
} from "./characters-store.js";
import { huntsHere, huntsAtLevel, huntZonesNear, huntSide, nextForYou, questTarget, routeBetween, startCityFor } from "./finder";
import { loadHero } from "../../shared/field.js";
import { appView, breadcrumb, itemLinkFilters, kindFor, readPlace, writePlace } from "../../shared/place.js";

let characterSeedClaimed = false;

const SITE_TABS = [
  { view: "atlas", label: "Atlas" },
  { view: "hunt", label: "Hunt" },
  { view: "trades", label: "Trades" },
  { view: "turnins", label: "Turn-ins" },
  { view: "items", label: "Items" },
  { view: "spells", label: "Spells" },
  { view: "characters", label: "Characters" },
  { view: "gear", label: "Upgrades" },
  { view: "quests", label: "Quests" },
  { view: "notes", label: "Notes" },
  { view: "walk", label: "Walk" },
];

const emptyPoiForm = {
  name: "",
  kind: "camp",
  soloMin: "",
  soloMax: "",
  groupMin: "",
  groupMax: "",
  monsters: "",
  notes: "",
};

const POI_KINDS = [
  "camp",
  "quest",
  "vendor",
  "tradeskill",
  "trainer",
  "zoneline",
  "dungeon",
  "named",
  "landmark",
  "dock",
  "custom",
];

function tokensMatch(hay, q) {
  const h = String(hay || "").toLowerCase();
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => h.includes(t));
}

export default function App() {
  const [world, setWorld] = useState(null);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [layer, setLayer] = useState("surface");
  const [selectedId, setSelectedId] = useState(
    () => readPlace(window.location.search).zone || "night-harbor"
  );
  const [focusPoi, setFocusPoi] = useState(() => readPlace(window.location.search).poi);
  const [hoverPoi, setHoverPoi] = useState(null);
  const [book, setBook] = useState(() => loadCharacters(localStorage));
  const [looseLevel, setLooseLevel] = useState(1);
  const [query, setQuery] = useState("");
  const [searchSlot, setSearchSlot] = useState(null);
  const [dropMode, setDropMode] = useState(false);
  const [kindFilter, setKindFilter] = useState(() => kindFor(readPlace(window.location.search)));
  const [tab, setTab] = useState("pois");
  const [noteDraft, setNoteDraft] = useState({ title: "", body: "" });
  const [poiForm, setPoiForm] = useState(emptyPoiForm);
  const [dropHit, setDropHit] = useState(null);
  const [addingPoi, setAddingPoi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(() => appView(readPlace(window.location.search)));
  const [looseKlass, setLooseKlass] = useState(() => {
    const place = readPlace(window.location.search);
    return place.view === "items" ? "" : place.class || "";
  });
  const [itemFilters, setItemFilters] = useState(() => itemLinkFilters(readPlace(window.location.search)));
  const [completed, setCompleted] = useState([]);
  const [flyNonce, setFlyNonce] = useState(0);
  const [huntFit, setHuntFit] = useState(true);
  const [focusQuestId, setFocusQuestId] = useState(() => readPlace(window.location.search).quest);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const [blipPoiId, setBlipPoiId] = useState(null);
  const [blipNonce, setBlipNonce] = useState(0);
  const [landed, setLanded] = useState(null);
  const [itemDraft, setItemDraft] = useState({ name: "", how: "", kind: "item" });
  const [addingItem, setAddingItem] = useState(false);
  const activeChar = book.characters.find((character) => character.id === book.activeId) || null;
  const level = activeChar ? activeChar.level : looseLevel;
  const klass = activeChar ? activeChar.classId : looseKlass;

  function commitBook(next) {
    if (next === book) return;
    if (!next.characters.length && book.characters.length) {
      const gone = book.characters.find((character) => character.id === book.activeId) || book.characters[0];
      if (gone) {
        setLooseLevel(gone.level);
        setLooseKlass(gone.classId);
      }
    }
    setBook(next);
    try {
      saveCharacters(localStorage, next);
    } catch {
      setError("Couldn't save characters in this browser.");
    }
  }

  function setLevel(next) {
    const n = Number(next);
    if (!activeChar) {
      setLooseLevel(Number.isFinite(n) ? Math.min(60, Math.max(1, Math.round(n))) : 1);
      return;
    }
    commitBook(patchCharacter(book, activeChar.id, { level: n }));
  }

  function setKlass(next) {
    const id = String(next || "");
    if (!activeChar) {
      setLooseKlass(id);
      return;
    }
    commitBook(patchCharacter(book, activeChar.id, { classId: id }));
  }

  function chooseCharacter(id) {
    commitBook(selectCharacter(book, id));
  }

  async function reload() {
    const stored = loadCharacters(localStorage);
    let mode = "ready";
    if (!stored.seeded) mode = characterSeedClaimed ? "wait" : "adopt";
    if (mode === "adopt") characterSeedClaimed = true;
    const [w, n] = await Promise.all([api.world(), api.notes()]);
    setWorld(w);
    setNotes(n);
    if (Array.isArray(w.settings?.completedSteps)) setCompleted(w.settings.completedSteps);
    if (mode === "wait") return;

    const opened = readPlace(window.location.search);
    const classId = w.settings?.characterClass || "";
    let nextBook =
      mode === "adopt"
        ? adoptLegacy(stored, {
            level: w.settings?.characterLevel || 1,
            classId,
            className: (w.classes || []).find((c) => c.id === classId)?.name || "",
            loadout: readLegacyLoadout(localStorage),
          })
        : stored;
    if (opened.class && opened.view !== "items" && nextBook.activeId) {
      const active = nextBook.characters.find((character) => character.id === nextBook.activeId);
      if (active && active.classId !== opened.class) {
        nextBook = patchCharacter(nextBook, active.id, { classId: opened.class });
      }
    }
    if (nextBook !== stored) {
      try {
        saveCharacters(localStorage, nextBook);
      } catch {
        setError("Couldn't save characters in this browser.");
      }
      setBook(nextBook);
    }
    if (!nextBook.characters.length) {
      if (w.settings?.characterLevel) setLooseLevel(w.settings.characterLevel);
      if (w.settings?.characterClass && !(opened.view !== "items" && opened.class)) {
        setLooseKlass(w.settings.characterClass);
      }
    }
  }

  useEffect(() => {
    reload().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!world) return;
    const t = setTimeout(() => {
      api.saveSettings({ characterLevel: level, characterClass: klass, completedSteps: completed }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [level, klass, completed, world]);

  useEffect(() => {
    if (!world) return;
    const place = readPlace(window.location.search);
    if (place.zone) {
      const z = world.zones.find((x) => x.id === place.zone);
      if (z?.layer) setLayer(z.layer);
    }
    if (place.item) {
      const item = (world.items || []).find((x) => x.id === place.item);
      if (item) setSelectedItem(item);
    }
  }, [world]);

  const currentPlace = useMemo(() => {
    const placeView =
      view === "enhance" ? "quests" : view === "atlas" && kindFilter === "quest" ? "turnins" : view;
    const onItems = placeView === "items";
    return {
      view: placeView,
      zone: selectedId,
      poi: focusPoi,
      class: onItems ? itemFilters.classId || null : klass || null,
      quest: focusQuestId,
      item: selectedItem?.id || null,
      q: onItems ? itemFilters.q || null : null,
      slot: onItems ? itemFilters.slot || null : null,
      type: onItems ? itemFilters.kind || null : null,
      farm: Boolean(onItems && itemFilters.onlyFarmable),
      lvl: onItems && itemFilters.onlyFarmable ? itemFilters.level : null,
      cols: onItems ? itemFilters.cols : null,
    };
  }, [view, kindFilter, selectedId, focusPoi, klass, focusQuestId, selectedItem, itemFilters]);

  useEffect(() => {
    const desired = writePlace(currentPlace);
    const next = desired === "?" ? "" : desired;
    if (window.location.search === next) return;
    window.history.replaceState(null, "", next || window.location.pathname);
  }, [currentPlace]);

  function updateItemFilters(next) {
    setItemFilters((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }

  const zones = world?.zones || [];
  const allPois = world?.pois || [];
  const selected = zones.find((z) => z.id === selectedId) || zones[0];
  const regionName = world?.regions.find((r) => r.id === selected?.regionId)?.name;
  const zonePois = useMemo(
    () =>
      allPois.filter(
        (p) => p.zoneId === selected?.id && (kindFilter === "all" || p.kind === kindFilter)
      ),
    [allPois, selected, kindFilter]
  );

  const filteredZones = useMemo(() => {
    const q = query.trim().toLowerCase();
    return zones.filter((z) => {
      if (!q) return z.layer === layer;
      const hay = hayZone(z);
      return hay.includes(q) || tokensMatch(hay, q);
    });
  }, [zones, layer, query, allPois, world]);

  function hayZone(z) {
    const region = world?.regions?.find((r) => r.id === z.regionId)?.name || "";
    const adj = (z.adjacent || []).map((id) => zones.find((x) => x.id === id)?.name).filter(Boolean);
    const poiText = allPois
      .filter((p) => p.zoneId === z.id)
      .map((p) => `${p.name} ${p.monsters || ""} ${p.notes || ""} ${(p.quests || []).join(" ")}`)
      .join(" ");
    return [z.name, z.id.replace(/-/g, " "), z.kind, z.description, z.layer, region, ...adj, poiText, "zone"]
      .join(" ")
      .toLowerCase();
  }

  const matchedZones = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return zones
      .filter((z) => hayZone(z).includes(q) || tokensMatch(hayZone(z), q))
      .sort((a, b) => {
        const an = a.name.toLowerCase().includes(q) ? 0 : 1;
        const bn = b.name.toLowerCase().includes(q) ? 0 : 1;
        return an - bn || a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [query, zones, allPois, world]);

  const matchedPois = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPois.filter((p) => {
      const z = zones.find((x) => x.id === p.zoneId);
      if (!q && z && z.layer !== layer) return false;
      if (kindFilter !== "all" && p.kind !== kindFilter) return false;
      if (huntFit && (p.kind === "camp" || p.kind === "named") && hasHuntLevel(p) && !campFits(p, level)) return false;
      if (!q) return kindFilter !== "all";
      const hay = [
        p.name,
        p.kind,
        p.kind === "quest" ? "turn-in turn in vendor quest npc" : "",
        p.monsters,
        p.notes,
        z?.name,
        ...(p.quests || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q) || tokensMatch(hay, q);
    });
  }, [query, allPois, zones, layer, kindFilter, huntFit, level]);

  const matchedQuests = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchQuests(world?.quests || [], world?.classes || [], query).slice(0, 12);
  }, [query, world]);

  const matchedItems = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    return (world?.items || [])
      .filter((item) => {
        const hay = [
          item.name,
          item.kind,
          item.slot,
          item.how,
          item.notes,
          item.sellTo,
          item.recipe,
          item.materials,
          item.usedIn,
          ...(item.quests || []),
          ...(item.sources || []).flatMap((s) => [s.label, s.npc, s.method, s.notes, s.role]),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q) || tokens.every((t) => hay.includes(t));
      })
      .sort((a, b) => {
        const an = a.name.toLowerCase().startsWith(q) ? 0 : a.name.toLowerCase().includes(q) ? 1 : 2;
        const bn = b.name.toLowerCase().startsWith(q) ? 0 : b.name.toLowerCase().includes(q) ? 1 : 2;
        return an - bn || a.name.localeCompare(b.name);
      })
      .slice(0, 16);
  }, [query, world]);

  const huntNow = useMemo(() => huntsAtLevel(allPois, level), [allPois, level]);
  const soloNow = useMemo(() => huntNow.filter((p) => huntSide(p, level) === "solo").slice(0, 6), [huntNow, level]);
  const groupNow = useMemo(() => huntNow.filter((p) => huntSide(p, level) === "group").slice(0, 6), [huntNow, level]);

  const zoneNotes = useMemo(() => {
    if (!selected) return [];
    const poiIds = new Set(zonePois.map((p) => p.id));
    return notes.filter(
      (n) =>
        (n.targetType === "zone" && n.targetId === selected.id) ||
        (n.targetType === "poi" && poiIds.has(n.targetId)) ||
        (n.targetType === "camp" && poiIds.has(n.targetId))
    );
  }, [notes, selected, zonePois]);

  const journal = notes.filter((n) => n.targetType === "journal" || n.targetType === "pin");

  function selectZone(id, poiId, opts = {}) {
    if (view !== "walk") setView("atlas");
    setSelectedId(id);
    setFocusPoi(poiId || null);
    setTab(opts.tab || "pois");
    setDropMode(false);
    if (!opts.keepLanded) setLanded(null);
    const z = world?.zones.find((x) => x.id === id);
    if (z?.layer) setLayer(z.layer);
  }

  function revealZone(id, opts) {
    selectZone(id, null, opts);
    setKindFilter("all");
    setFlyNonce((n) => n + 1);
  }

  function peekZone(id) {
    if (!id || id === selectedId) return;
    setSelectedId(id);
    setFocusPoi(null);
  }

  function noteWalkZone(id) {
    if (!id || id === selectedId) return;
    setSelectedId(id);
  }

  function bindHero(zoneId) {
    if (!zoneId) return;
    const z = zones.find((x) => x.id === zoneId);
    if (z?.layer) setLayer(z.layer);
    setSelectedId(zoneId);
    setFocusPoi(null);
  }

  function selectPoi(poiOrId, opts = {}) {
    const poi = typeof poiOrId === "string" ? allPois.find((p) => p.id === poiOrId) : poiOrId;
    if (!poi) return;
    if (view !== "walk") setView("atlas");
    setKindFilter("all");
    setSelectedId(poi.zoneId);
    setFocusPoi(poi.id);
    setTab(opts.tab || "pois");
    setDropMode(false);
    if (!opts.keepLanded) setLanded(null);
    const z = world?.zones.find((x) => x.id === poi.zoneId);
    if (z?.layer) setLayer(z.layer);
  }

  function showSellStop(item, stop) {
    if (!item || !stop) return;
    setSelectedItem(item);
    if (view !== "walk") setView("atlas");
    setDropMode(false);
    setKindFilter("all");
    setLanded({
      item: item.name,
      type: stop.type,
      name: stop.name,
      zone: stop.zone,
      place: stop.place,
      pin: stop.pin,
      buys: stop.buys,
    });
    if (stop.poiId) selectPoi(stop.poiId, { keepLanded: true, tab: "item" });
    else if (stop.zoneId) {
      revealZone(stop.zoneId, { keepLanded: true, tab: "item" });
    } else setTab("item");
  }

  function showSellers(item) {
    if (!item) return;
    const stops = item.sellTos || [];
    if (stops.length === 1) {
      showSellStop(item, stops[0]);
      return;
    }
    setSelectedItem(item);
    if (view !== "walk") setView("atlas");
    setLanded(null);
    setTab("item");
  }

  function showVendor(poiId) {
    if (!poiId) return;
    selectPoi(poiId);
  }

  function openQuest(quest) {
    if (!quest) return;
    const target = questTarget(quest, completed, level);
    setFocusQuestId(quest.id);
    if (target.poiId) selectPoi(target.poiId);
    else if (target.zoneId) revealZone(target.zoneId);
    else setView("enhance");
  }

  function selectItem(itemOrId) {
    const item =
      typeof itemOrId === "string" ? (world?.items || []).find((x) => x.id === itemOrId) : itemOrId;
    if (!item) return;
    setSelectedItem(item);
    if (view !== "walk") setView("atlas");
    setDropMode(false);
    if (item.primaryPoiId) {
      const poi = allPois.find((p) => p.id === item.primaryPoiId);
      if (poi) {
        setKindFilter("all");
        setSelectedId(poi.zoneId);
        setFocusPoi(poi.id);
        const z = world?.zones.find((x) => x.id === poi.zoneId);
        if (z?.layer) setLayer(z.layer);
      }
    } else if (item.primaryZoneId) {
      setSelectedId(item.primaryZoneId);
      setFocusPoi(null);
      setKindFilter("all");
      setFlyNonce((n) => n + 1);
      const z = world?.zones.find((x) => x.id === item.primaryZoneId);
      if (z?.layer) setLayer(z.layer);
    }
    setTab("item");
  }

  function goToItemPlace(item, place) {
    if (!item || !place) return;
    setItemModal(null);
    setSelectedItem(item);
    if (place.poiId && allPois.some((p) => p.id === place.poiId)) {
      setBlipPoiId(place.poiId);
      setBlipNonce((n) => n + 1);
      selectPoi(place.poiId);
      return;
    }
    setBlipPoiId(null);
    if (place.zoneId) revealZone(place.zoneId);
  }

  function showItemOnMap(itemOrId) {
    const item =
      typeof itemOrId === "string" ? (world?.items || []).find((x) => x.id === itemOrId) : itemOrId;
    if (!item) return;
    setSelectedItem(item);
    setDropMode(false);
    if (item.primaryPoiId) {
      selectPoi(item.primaryPoiId);
      setTab("item");
      return;
    }
    let zoneId = item.primaryZoneId;
    if (!zoneId && item.zoneName) {
      const needle = String(item.zoneName).toLowerCase().replace(/[^a-z0-9]+/g, "");
      const z = zones.find((x) => x.name.toLowerCase().replace(/[^a-z0-9]+/g, "") === needle);
      if (z) zoneId = z.id;
    }
    if (zoneId) {
      revealZone(zoneId);
      setTab("item");
      return;
    }
    setView("atlas");
    setTab("item");
  }

  async function saveCuratedItem() {
    const name = itemDraft.name.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.createItem({
        name,
        kind: itemDraft.kind || "item",
        sources: itemDraft.how.trim()
          ? [{ method: "unknown", label: itemDraft.how.trim() }]
          : [],
      });
      setItemDraft({ name: "", how: "", kind: "item" });
      setAddingItem(false);
      await reload();
      if (created) selectItem(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!focusPoi) return;
    const el = document.getElementById(focusPoi);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusPoi, tab]);

  useEffect(() => {
    if (!itemModal) return;
    function onKey(e) {
      if (e.key === "Escape") setItemModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemModal]);

  async function saveNote(extra) {
    if (!noteDraft.body.trim() && !noteDraft.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.createNote({
        title: noteDraft.title,
        body: noteDraft.body,
        ...extra,
      });
      setNoteDraft({ title: "", body: "" });
      setNotes(await api.notes());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDropPoi(hit) {
    const zoneId = hit?.zoneId || selectedId;
    if (!zoneId) return;
    setSelectedId(zoneId);
    setDropHit({ ...hit, zoneId });
    setTab("pois");
    setAddingPoi(true);
    setDropMode(false);
    setPoiForm(emptyPoiForm);
  }

  async function savePoi(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.createPoi({
        ...poiForm,
        zoneId: dropHit?.zoneId || selected.id,
        mx: dropHit?.mx,
        my: dropHit?.my,
        lng: dropHit?.lng,
        lat: dropHit?.lat,
      });
      setPoiForm(emptyPoiForm);
      setDropHit(null);
      setAddingPoi(false);
      const w = await api.world();
      setWorld(w);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removePoi(id) {
    await api.deletePoi(id);
    const w = await api.world();
    setWorld(w);
  }

  async function removeNote(id) {
    await api.deleteNote(id);
    setNotes(await api.notes());
  }

  function applyPlace(place, { syncItems = false } = {}) {
    setView(appView(place));
    setKindFilter(kindFor(place));
    setDropMode(false);
    if (place.zone) {
      const z = (world?.zones || []).find((x) => x.id === place.zone);
      if (z?.layer) setLayer(z.layer);
      setSelectedId(place.zone);
    }
    setFocusPoi(place.poi || null);
    if (place.class && place.view !== "items") setKlass(place.class);
    setFocusQuestId(place.quest || null);
    if (place.item) {
      const item = (world?.items || []).find((x) => x.id === place.item);
      if (item) setSelectedItem(item);
    }
    if (place.view === "items" && syncItems) setItemFilters(itemLinkFilters(place));
  }

  function followLink(event, place) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const href = writePlace(place);
    const next = readPlace(href === "?" ? "" : href);
    window.history.pushState(null, "", href === "?" ? window.location.pathname : href);
    applyPlace(next, { syncItems: next.view === "items" });
  }

  function openCharacters() {
    followLink({ button: 0, preventDefault() {} }, { view: "characters" });
  }

  useEffect(() => {
    function onPop() {
      applyPlace(readPlace(window.location.search), { syncItems: true });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  function showZone(id) {
    if (view !== "walk") setView("atlas");
    revealZone(id);
    if (view !== "walk") setTab("quests");
  }

  function toggleStep(stepId) {
    setCompleted((prev) => (prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]));
  }

  if (!world) {
    return (
      <div className="boot">
        <p>{error || "Unrolling the atlas…"}</p>
      </div>
    );
  }

  const classLabel = (world.classes || []).find((c) => c.id === klass)?.name;
  const crumbs = breadcrumb(currentPlace, {
    zone: selected?.name,
    poi: allPois.find((poi) => poi.id === focusPoi)?.name,
    class: (world.classes || []).find((c) => c.id === currentPlace.class)?.name,
    quest: (world.quests || []).find((quest) => quest.id === focusQuestId)?.title,
    item: selectedItem?.name,
  });

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">Monsters & Memories</p>
          <h1>MMFinder</h1>
        </div>
        <div className="tabs view-tabs">
          {SITE_TABS.map((siteTab) => {
            const on =
              siteTab.view === "turnins"
                ? view === "atlas" && kindFilter === "quest"
                : siteTab.view === "quests"
                  ? view === "enhance"
                  : siteTab.view === "atlas"
                    ? view === "atlas" && kindFilter !== "quest"
                    : view === siteTab.view;
            return (
              <a
                key={siteTab.view}
                className={on ? "on" : ""}
                href={writePlace({ view: siteTab.view })}
                onClick={(event) => {
                  followLink(event, { view: siteTab.view });
                  if (!event.defaultPrevented) return;
                  if (siteTab.view === "turnins") setQuery("");
                  if (siteTab.view !== "walk") return;
                  const saved = loadHero();
                  const zoneId = saved?.zoneId || saved?.originId;
                  if (!zoneId) return;
                  const z = zones.find((x) => x.id === zoneId);
                  if (z?.layer) setLayer(z.layer);
                  setSelectedId(zoneId);
                  setFocusPoi(null);
                }}
              >
                {siteTab.label}
              </a>
            );
          })}
        </div>
        {view !== "walk" && view !== "who" && activeChar && (
          <div className="char-ctl">
            <label>
              <span>Character</span>
              <select
                value={activeChar.id}
                aria-label="Active character"
                onChange={(e) => chooseCharacter(e.target.value)}
              >
                {book.characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {characterLabel(character, world.classes || [])}
                  </option>
                ))}
              </select>
            </label>
            <label className="level-ctl">
              <span>Level</span>
              <strong>{level}</strong>
              <input
                type="range"
                min="1"
                max="60"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
              />
            </label>
          </div>
        )}
        {view !== "walk" && view !== "who" && !activeChar && (
          <>
            <label className="level-ctl">
              <span>Your level</span>
              <strong>{level}</strong>
              <input
                type="range"
                min="1"
                max="60"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
              />
            </label>
            <label className="class-ctl">
              <span>Class</span>
              <select value={klass} onChange={(e) => setKlass(e.target.value)}>
                <option value="">Pick a class</option>
                {(world.classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <a className="char-add" href={writePlace({ view: "characters" })} onClick={(event) => followLink(event, { view: "characters" })}>
              Add character
            </a>
          </>
        )}
        {(view === "atlas" || (view !== "walk" && crumbs.length > 2)) && (
          <div className={view === "atlas" ? "crumb-row crumb-row-map" : "crumb-row"}>
            {view !== "walk" && crumbs.length > 2 && (
              <nav className="crumb-nav" aria-label="Place">
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.href}-${crumb.label}`} className="crumb">
                    {index > 0 && <span className="crumb-sep">/</span>}
                    <a href={crumb.href} onClick={(event) => followLink(event, readPlace(crumb.href))}>
                      {crumb.label}
                    </a>
                  </span>
                ))}
              </nav>
            )}
            {view === "atlas" && <div className="map-search-slot" ref={setSearchSlot} />}
          </div>
        )}
      </header>

      {error && <div className="banner">{error}</div>}

      {itemModal && (
        <div className="item-modal-back" onClick={() => setItemModal(null)}>
          <div
            className="item-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="item-modal-bar">
              <button type="button" className="tiny ghost" onClick={() => setItemModal(null)}>
                Close
              </button>
            </div>
            <ItemCard
              key={itemModal.id}
              item={itemModal}
              titleId="item-modal-title"
              columns
              goLabel="Go to Location"
              onSellStop={(stop) => goToItemPlace(itemModal, stop)}
              onShowPoi={(poiId) => goToItemPlace(itemModal, { poiId })}
              onShowZone={(zoneId) => goToItemPlace(itemModal, { zoneId })}
              onOpenQuest={(src) => {
                setItemModal(null);
                setFocusQuestId(src.questId);
                setQuery(itemModal.name);
                setView("enhance");
              }}
            />
          </div>
        </div>
      )}

      {view === "enhance" ? (
        <Enhance
          classes={world.classes || []}
          quests={world.quests || []}
          zones={zones}
          klass={klass}
          onClass={setKlass}
          level={level}
          completed={completed}
          onToggleStep={toggleStep}
          onShowZone={showZone}
          onShowVendor={showVendor}
          focusQuestId={focusQuestId}
          searchQuery={query}
        />
      ) : view === "spells" ? (
        <Suspense fallback={<div className="boot">Opening the spellbook…</div>}>
          <Spells klass={klass} onClass={setKlass} level={level} />
        </Suspense>
      ) : view === "items" ? (
        <ItemsGrid
          items={world.items || []}
          classes={world.classes || []}
          level={level}
          klass={klass}
          linkFilters={itemFilters}
          onLinkFilters={updateItemFilters}
          onSelectItem={setItemModal}
        />
      ) : view === "walk" ? (
        <div className="walk-screen">
          <Suspense fallback={<div className="walk-boot">The ground is waking…</div>}>
            <Walk
              atlas={world.atlas}
              zones={zones}
              pois={allPois}
              layer={layer}
              selectedId={selected?.id}
              focusPoiId={focusPoi}
              onEnterZone={noteWalkZone}
              onBind={bindHero}
            />
          </Suspense>
        </div>
      ) : view === "who" ? (
        <WhoIsThat />
      ) : view === "notes" ? (
        <Notes />
      ) : view === "characters" ? (
        <Characters
          book={book}
          classes={world.classes || []}
          items={world.items || []}
          onChange={commitBook}
          onOpenItem={setItemModal}
        />
      ) : view === "hunt" ? (
        <Hunt zones={zones} pois={allPois} level={level} onShowPoi={selectPoi} />
      ) : view === "trades" ? (
        <Trades
          items={world.items || []}
          pois={allPois}
          zones={zones}
          onShowPoi={selectPoi}
          onSelectItem={setItemModal}
        />
      ) : view === "gear" ? (
        <GearFinder
          items={world.items || []}
          classes={world.classes || []}
          characters={book.characters}
          activeId={book.activeId || ""}
          level={level}
          klass={klass}
          loadout={activeChar?.gear || {}}
          onSelectCharacter={chooseCharacter}
          onEquip={(slot, itemId) => activeChar && commitBook(equipItem(book, activeChar.id, slot, itemId))}
          onUnequip={(slot) => activeChar && commitBook(unequipItem(book, activeChar.id, slot))}
          onOpenCharacters={openCharacters}
          onFarm={showItemOnMap}
          onSelectItem={selectItem}
        />
      ) : (
      <div className="layout">
        <aside className="rail">
          {!query.trim() && kindFilter === "all" && (soloNow.length > 0 || groupNow.length > 0) && (
            <>
              {soloNow.length > 0 && (
                <>
                  <p className="hit-label">Solo now · lvl {level}</p>
                  <ul className="poi-hits">
                    {soloNow.map((poi) => {
                      const z = zones.find((x) => x.id === poi.zoneId);
                      return (
                        <li key={poi.id}>
                          <button
                            className={focusPoi === poi.id ? "active" : ""}
                            onClick={() => selectPoi(poi)}
                            onMouseEnter={() => setHoverPoi(poi)}
                            onMouseLeave={() => setHoverPoi((cur) => (cur?.id === poi.id ? null : cur))}
                          >
                            <span className={`gpoi-dot kind-${poi.kind}`}></span>
                            <span className="zn">{poi.name}</span>
                            <span className="lv">
                              {z?.name || poi.kind} · {rangeLabel(poi)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {groupNow.length > 0 && (
                <>
                  <p className="hit-label">Group now · lvl {level}</p>
                  <ul className="poi-hits">
                    {groupNow.map((poi) => {
                      const z = zones.find((x) => x.id === poi.zoneId);
                      return (
                        <li key={poi.id}>
                          <button
                            className={focusPoi === poi.id ? "active" : ""}
                            onClick={() => selectPoi(poi)}
                            onMouseEnter={() => setHoverPoi(poi)}
                            onMouseLeave={() => setHoverPoi((cur) => (cur?.id === poi.id ? null : cur))}
                          >
                            <span className={`gpoi-dot kind-${poi.kind}`}></span>
                            <span className="zn">{poi.name}</span>
                            <span className="lv">
                              {z?.name || poi.kind} · {rangeLabel(poi)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
          {matchedZones.length > 0 && (
            <>
              <p className="hit-label">Zones</p>
              <ul className="poi-hits">
                {matchedZones.map((zone) => (
                  <li key={zone.id}>
                    <button
                      className={selected?.id === zone.id ? "active" : ""}
                      onClick={() => revealZone(zone.id)}
                    >
                      <span className="gpoi-dot kind-landmark"></span>
                      <span className="zn">{zone.name}</span>
                      <span className="lv">
                        {zone.kind} · {zone.levelMin}–{zone.levelMax}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {matchedPois.length > 0 && (
            <>
              {kindFilter === "quest" && !query.trim() && <p className="hit-label">Turn-in vendors</p>}
              <ul className="poi-hits">
              {matchedPois.slice(0, 24).map((poi) => {
                const z = zones.find((x) => x.id === poi.zoneId);
                return (
                  <li key={poi.id}>
                    <button
                      className={focusPoi === poi.id ? "active" : ""}
                      onClick={() => selectPoi(poi)}
                      onMouseEnter={() => setHoverPoi(poi)}
                      onMouseLeave={() => setHoverPoi((cur) => (cur?.id === poi.id ? null : cur))}
                    >
                      <span className={`gpoi-dot kind-${poi.kind}`}></span>
                      <span className="zn">{poi.name}</span>
                      <span className="lv">{z?.name || poi.kind}</span>
                    </button>
                  </li>
                );
              })}
              </ul>
            </>
          )}
          {matchedItems.length > 0 && (
            <>
              <p className="hit-label">Items / gear</p>
              <ul className="poi-hits">
                {matchedItems.map((item) => (
                  <li key={item.id}>
                    <button
                      className={selectedItem?.id === item.id ? "active" : ""}
                      onClick={() => selectItem(item)}
                    >
                      <span className="gpoi-dot kind-item"></span>
                      <span className="zn">{item.name}</span>
                      <span className="lv">
                        {(item.quests || []).length
                          ? item.quests.slice(0, 2).join(" · ")
                          : item.how || item.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {matchedQuests.length > 0 && (
            <>
              <p className="hit-label">Quests / NPCs</p>
              <ul className="poi-hits">
                {matchedQuests.map((quest) => (
                  <li key={quest.id}>
                    <button onClick={() => openQuest(quest)}>
                      <span className="gpoi-dot kind-quest"></span>
                      <span className="zn">{quest.title}</span>
                      <span className="lv">{quest.npc}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <ul className="zone-list">
            {filteredZones.map((zone) => (
              <li key={zone.id}>
                <button
                  className={zone.id === selected?.id ? "active" : ""}
                  onClick={() => revealZone(zone.id)}
                >
                  <span className={`tag ${zone.kind}`}>{zone.kind}</span>
                  <span className="zn">{zone.name}</span>
                  <span className="lv">
                    {zone.levelMin}–{zone.levelMax}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="stage">
          <WorldMap
            atlas={world.atlas}
            zones={zones}
            pois={allPois}
            selectedId={selected?.id}
            focusPoiId={focusPoi}
            hoverPoiId={hoverPoi?.id}
            layer={layer}
            onLayer={(next) => {
              setFocusPoi(null);
              setLayer(next);
              setSelectedId((id) => {
                const z = zones.find((x) => x.id === id);
                if (z?.layer === next) return id;
                return next === "deep" ? "ail-vorith" : "night-harbor";
              });
            }}
            dropMode={dropMode}
            onToggleDrop={() => setDropMode((v) => !v)}
            kindFilter={kindFilter}
            onKindFilter={setKindFilter}
            query={query}
            onQuery={setQuery}
            searchSlot={searchSlot}
            regions={world.regions || []}
            quests={world.quests || []}
            items={world.items || []}
            flyNonce={flyNonce}
            blipPoiId={blipPoiId}
            blipNonce={blipNonce}
            level={level}
            huntFit={huntFit}
            onHuntFit={setHuntFit}
            completed={completed}
            onSelect={selectZone}
            onPeek={peekZone}
            onSelectPoi={selectPoi}
            onSelectItem={selectItem}
            landed={landed}
            onHoverPoi={setHoverPoi}
            onDropPoi={handleDropPoi}
          />
        </main>

        <aside className="panel">
          {selected && (
            <>
              <p className="region">{regionName}</p>
              <h2>{selected.name}</h2>
              <p className="meta">
                {selected.kind} · levels {selected.levelMin}–{selected.levelMax}
                {selected.start ? " · starting city" : ""}
              </p>
              <p className="desc">{selected.description}</p>
              {selected.wikiUrl && (
                <p className="adj">
                  <a className="linkish" href={selected.wikiUrl} target="_blank" rel="noreferrer">
                    Open wiki map source
                  </a>
                </p>
              )}
              {selected.adjacent?.length > 0 && (
                <p className="adj">
                  Adjacent:{" "}
                  {selected.adjacent.map((id) => {
                    const z = zones.find((x) => x.id === id);
                    return (
                      <button key={id} className="linkish" onClick={() => z && revealZone(z.id)}>
                        {z?.name || id}
                      </button>
                    );
                  })}
                </p>
              )}

              <FinderCard
                zone={selected}
                zones={zones}
                pois={allPois}
                quests={world.quests || []}
                klass={klass}
                classLabel={classLabel}
                level={level}
                completed={completed}
                onSelectPoi={selectPoi}
                onShowZone={revealZone}
                onToggleStep={toggleStep}
                onOpenQuests={(questId) => {
                  if (questId) setFocusQuestId(questId);
                  setView("enhance");
                }}
              />

              <div className="tabs">
                <button className={tab === "pois" ? "on" : ""} onClick={() => setTab("pois")}>
                  POIs ({zonePois.length})
                </button>
                <button className={tab === "quests" ? "on" : ""} onClick={() => setTab("quests")}>
                  Quests
                </button>
                <button className={tab === "item" ? "on" : ""} onClick={() => setTab("item")}>
                  Item{selectedItem ? "" : "s"}
                </button>
                <button className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>
                  Notes ({zoneNotes.length})
                </button>
                <button className={tab === "journal" ? "on" : ""} onClick={() => setTab("journal")}>
                  Journal
                </button>
              </div>

              {tab === "item" && (
                <div className="stack">
                  {selectedItem ? (
                    <ItemCard
                      item={selectedItem}
                      onSellStop={(stop) => showSellStop(selectedItem, stop)}
                      onShowPoi={selectPoi}
                      onShowZone={revealZone}
                      onOpenQuest={(src) => {
                        setFocusQuestId(src.questId);
                        setQuery(selectedItem.name);
                        setView("enhance");
                      }}
                    />
                  ) : (
                    <p className="empty">Search for an item to see where to get it.</p>
                  )}
                  {!addingItem ? (
                    <button className="tiny" onClick={() => setAddingItem(true)}>
                      Curate an item
                    </button>
                  ) : (
                    <div className="poi-form">
                      <input
                        placeholder="Item name"
                        value={itemDraft.name}
                        onChange={(e) => setItemDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                      <input
                        placeholder="How to get it"
                        value={itemDraft.how}
                        onChange={(e) => setItemDraft((d) => ({ ...d, how: e.target.value }))}
                      />
                      <select
                        value={itemDraft.kind}
                        onChange={(e) => setItemDraft((d) => ({ ...d, kind: e.target.value }))}
                      >
                        <option value="item">Item</option>
                        <option value="weapon">Weapon</option>
                        <option value="armor">Armor</option>
                        <option value="jewelry">Jewelry</option>
                        <option value="shield">Shield</option>
                      </select>
                      <div className="row">
                        <button className="tiny" disabled={saving} onClick={saveCuratedItem}>
                          Save
                        </button>
                        <button className="tiny ghost" onClick={() => setAddingItem(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "pois" && (
                <div className="stack">
                  {dropHit && (
                    <p className="drop-hint">
                      Dropped at {dropHit.mx?.toFixed?.(1) ?? dropHit.mx}%, {dropHit.my?.toFixed?.(1) ?? dropHit.my}%
                      on the map
                    </p>
                  )}
                  {zonePois.length === 0 && !addingPoi && (
                    <p className="empty">No POIs yet. Drop one on the map or add it here.</p>
                  )}
                  {zonePois.map((poi) => (
                    <article
                      key={poi.id}
                      id={poi.id}
                      className={`camp-card ${focusPoi === poi.id ? "focus" : ""} ${
                        hoverPoi?.id === poi.id ? "hover" : ""
                      } ${campFits(poi, level) ? "fits" : ""}`}
                      onMouseEnter={() => setHoverPoi(poi)}
                      onMouseLeave={() => setHoverPoi((cur) => (cur?.id === poi.id ? null : cur))}
                    >
                      <header>
                        <h3>{poi.name}</h3>
                        <span className="range">{KIND_LABEL[poi.kind] || poi.kind}</span>
                      </header>
                      {(poi.soloMin || poi.groupMin) && <p className="kind-pill">{rangeLabel(poi)}</p>}
                      {poi.monsters && <p className="mobs">{poi.monsters}</p>}
                      {poi.notes && <p className="hint">{poi.notes}</p>}
                      {poi.quests?.length > 0 && <p className="mobs">Turn-in for: {poi.quests.join(" · ")}</p>}
                      <div className="row">
                        <button className="tiny" onClick={() => selectPoi(poi)}>
                          Show on map
                        </button>
                        <button
                          className="tiny"
                          onClick={() => {
                            setTab("notes");
                            setNoteDraft({ title: poi.name, body: "" });
                          }}
                        >
                          Note this
                        </button>
                        {poi.custom && (
                          <button className="tiny danger" onClick={() => removePoi(poi.id)}>
                            Remove
                          </button>
                        )}
                      </div>
                    </article>
                  ))}

                  {addingPoi ? (
                    <form className="camp-form" onSubmit={savePoi}>
                      <input
                        required
                        placeholder="POI name"
                        value={poiForm.name}
                        onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })}
                      />
                      <select
                        value={poiForm.kind}
                        onChange={(e) => setPoiForm({ ...poiForm, kind: e.target.value })}
                      >
                        {POI_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <div className="grid2">
                        <input
                          type="number"
                          placeholder="Solo min"
                          value={poiForm.soloMin}
                          onChange={(e) => setPoiForm({ ...poiForm, soloMin: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Solo max"
                          value={poiForm.soloMax}
                          onChange={(e) => setPoiForm({ ...poiForm, soloMax: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Group min"
                          value={poiForm.groupMin}
                          onChange={(e) => setPoiForm({ ...poiForm, groupMin: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Group max"
                          value={poiForm.groupMax}
                          onChange={(e) => setPoiForm({ ...poiForm, groupMax: e.target.value })}
                        />
                      </div>
                      <input
                        placeholder="Monsters"
                        value={poiForm.monsters}
                        onChange={(e) => setPoiForm({ ...poiForm, monsters: e.target.value })}
                      />
                      <textarea
                        placeholder="How to find it, named, faction…"
                        value={poiForm.notes}
                        onChange={(e) => setPoiForm({ ...poiForm, notes: e.target.value })}
                      />
                      <div className="row">
                        <button type="submit" disabled={saving}>
                          Save POI
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setAddingPoi(false);
                            setDropHit(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="add"
                      onClick={() => {
                        setAddingPoi(true);
                        setDropMode(true);
                      }}
                    >
                      + Drop a POI on {selected.name}
                    </button>
                  )}
                </div>
              )}

              {tab === "quests" && (
                <ZoneQuestTab
                  className={klass}
                  classLabel={classLabel || "your class"}
                  quests={world.quests || []}
                  zoneId={selected.id}
                  zones={zones}
                  level={level}
                  completed={completed}
                  onToggleStep={toggleStep}
                  onShowZone={showZone}
                  onShowVendor={showVendor}
                  onOpenEnhance={() => setView("enhance")}
                />
              )}

              {tab === "notes" && (
                <div className="stack">
                  <form
                    className="note-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveNote({
                        targetType: "zone",
                        targetId: selected.id,
                      });
                    }}
                  >
                    <input
                      placeholder="Title"
                      value={noteDraft.title}
                      onChange={(e) => setNoteDraft({ ...noteDraft, title: e.target.value })}
                    />
                    <textarea
                      required
                      placeholder={`Notes for ${selected.name} — named timers, pull warnings, where you died…`}
                      value={noteDraft.body}
                      onChange={(e) => setNoteDraft({ ...noteDraft, body: e.target.value })}
                    />
                    <button type="submit" disabled={saving}>
                      Save to backend
                    </button>
                  </form>
                  <NoteList notes={zoneNotes} zones={zones} onDelete={removeNote} />
                </div>
              )}

              {tab === "journal" && (
                <div className="stack">
                  <form
                    className="note-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveNote({ targetType: "journal" });
                    }}
                  >
                    <input
                      placeholder="Journal title"
                      value={noteDraft.title}
                      onChange={(e) => setNoteDraft({ ...noteDraft, title: e.target.value })}
                    />
                    <textarea
                      required
                      placeholder="Free-form journal — alts, faction, things to remember…"
                      value={noteDraft.body}
                      onChange={(e) => setNoteDraft({ ...noteDraft, body: e.target.value })}
                    />
                    <button type="submit" disabled={saving}>
                      Save journal
                    </button>
                  </form>
                  <NoteList notes={journal} zones={zones} onDelete={removeNote} />
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      )}
    </div>
  );
}

function FinderCard({
  zone,
  zones,
  pois,
  quests,
  klass,
  classLabel,
  level,
  completed,
  onSelectPoi,
  onShowZone,
  onToggleStep,
  onOpenQuests,
}) {
  const hunts = huntsHere(pois, zone.id, level);
  const soloHunts = hunts.filter((p) => huntSide(p, level) === "solo").slice(0, 4);
  const groupHunts = hunts.filter((p) => huntSide(p, level) === "group").slice(0, 4);
  const nearby = soloHunts.length || groupHunts.length ? [] : huntZonesNear(pois, zones, zone.id, level);
  const next = nextForYou(quests, klass, completed, level);
  const startId = startCityFor(zone);
  const path = routeBetween(zones, startId, zone.id);
  const nextPoi = next?.poiId;
  const nextZone = next?.zoneId;
  const nextElsewhere = nextZone && nextZone !== zone.id;
  const nextZoneName = zones.find((z) => z.id === nextZone)?.name;

  return (
    <div className="finder">
      <p className="rail-label">Finder · lvl {level}</p>
      {path.length > 1 && (
        <p className="finder-path">
          {path.map((id, i) => {
            const z = zones.find((x) => x.id === id);
            return (
              <span key={id}>
                {i > 0 ? " → " : ""}
                <button className="linkish" onClick={() => onShowZone(id)}>
                  {z?.name || id}
                </button>
              </span>
            );
          })}
        </p>
      )}
      {next?.step && (
        <article className="camp-card fits">
          <header>
            <h3>{next.quest.title}</h3>
            <span className="range">Next · {classLabel || "your class"}</span>
          </header>
          <p className="mobs">{next.step.action}</p>
          {next.step.turnIn ? <p className="hint">Turn in: {next.step.turnIn}</p> : null}
          {nextElsewhere && nextZoneName ? (
            <p className="hint">
              This step is in{" "}
              <button className="linkish" onClick={() => onShowZone(nextZone)}>
                {nextZoneName}
              </button>
            </p>
          ) : null}
          <div className="row">
            {nextPoi && (
              <button className="tiny turn-in-go" onClick={() => onSelectPoi(nextPoi)}>
                Show on map
              </button>
            )}
            {!nextPoi && nextZone && (
              <button className="tiny" onClick={() => onShowZone(nextZone)}>
                Go to zone
              </button>
            )}
            <button className="tiny" onClick={() => onToggleStep(next.step.id)}>
              {completed.includes(next.step.id) ? "Undo" : "Mark done"}
            </button>
            <button className="tiny" onClick={() => onOpenQuests(next.quest.id)}>
              Full path
            </button>
          </div>
        </article>
      )}
      {!klass && (
        <p className="empty">Pick a class for your character to pin the next guild turn-in on the map.</p>
      )}
      {(soloHunts.length > 0 || groupHunts.length > 0) ? (
        <>
          {soloHunts.length > 0 && (
            <>
              <p className="hit-label">Solo here</p>
              <ul className="finder-hunts">
                {soloHunts.map((poi) => (
                  <li key={poi.id}>
                    <button onClick={() => onSelectPoi(poi)}>
                      <span className={`gpoi-dot kind-${poi.kind}`}></span>
                      <span className="zn">{poi.name}</span>
                      <span className="lv">{rangeLabel(poi)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {groupHunts.length > 0 && (
            <>
              <p className="hit-label">Group here</p>
              <ul className="finder-hunts">
                {groupHunts.map((poi) => (
                  <li key={poi.id}>
                    <button onClick={() => onSelectPoi(poi)}>
                      <span className={`gpoi-dot kind-${poi.kind}`}></span>
                      <span className="zn">{poi.name}</span>
                      <span className="lv">{rangeLabel(poi)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : nearby.length > 0 ? (
        <>
          <p className="empty">No listed camps here fit level {level}. Closest hunts:</p>
          <ul className="finder-hunts">
            {nearby.map((row) => {
              const z = zones.find((x) => x.id === row.id);
              return (
                <li key={row.id}>
                  <button onClick={() => onShowZone(row.id)}>
                    <span className="gpoi-dot kind-camp"></span>
                    <span className="zn">{z?.name || row.id}</span>
                    <span className="lv">
                      {row.count} hunt{row.count === 1 ? "" : "s"}
                      {row.hops > 0 ? ` · ${row.hops} zone${row.hops === 1 ? "" : "s"}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="empty">No listed camps in this zone fit level {level}.</p>
      )}
    </div>
  );
}

function NoteList({ notes, zones, onDelete }) {
  if (!notes.length) return <p className="empty">Nothing saved yet.</p>;
  return notes.map((note) => (
    <article key={note.id} className="note-card">
      <header>
        <h3>{note.title || untitled(note)}</h3>
        <button className="tiny danger" onClick={() => onDelete(note.id)}>
          Delete
        </button>
      </header>
      <p>{note.body}</p>
      <time>{new Date(note.updatedAt).toLocaleString()}</time>
    </article>
  ));

  function untitled(note) {
    if (note.targetType === "pin") return "Map pin";
    if (note.targetType === "zone") {
      return zones.find((z) => z.id === note.targetId)?.name || "Zone note";
    }
    return "Note";
  }
}
