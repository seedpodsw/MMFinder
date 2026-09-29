import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { questTarget } from "./finder";

export const KIND_LABEL = {
  camp: "Camp",
  vendor: "Vendor",
  quest: "Turn-in",
  trainer: "Trainer",
  zoneline: "Zoneline",
  dungeon: "Dungeon",
  named: "Named",
  landmark: "Landmark",
  dock: "Dock",
  custom: "Custom",
};

const PIN_PRIORITY = {
  dungeon: 5,
  zoneline: 4,
  named: 4,
  quest: 3,
  vendor: 3,
  trainer: 2,
  dock: 2,
  landmark: 2,
  camp: 1,
  custom: 1,
};

// Same hues as the Ail'vorith legend, so a guild pin matches its house.
const AIL_PIN = {
  "av-toilmaster": "#f0c14b",
  "av-paladin": "#e6c27a",
  "av-wizard": "#8eb4e6",
  "av-necro": "#c47a9a",
  "av-xal": "#c4a0d4",
  "av-bank-ith": "#8ed0a8",
  "av-harbor": "#d2b48c",
  "av-harbor-inner": "#d2b48c",
  "av-palace": "#f3e6c8",
  "av-foreign": "#f3e6c8",
  "av-foreign-east": "#f3e6c8",
  "av-gate": "#f3e6c8",
  "av-gate-double": "#f3e6c8",
};

function pinFace(poi) {
  const named = AIL_PIN[poi.id];
  if (named) return ` style="background:${named}"`;
  if (poi.zoneId !== "ail-vorith") return "";
  const n = String(poi.name || "").toLowerCase();
  const color = n.includes("drezz") || n.includes("paladin")
    ? "#e6c27a"
    : n.includes("vael")
      ? "#d2b48c"
      : n.includes("varros") || n.includes("necro")
        ? "#c47a9a"
        : n.includes("hal") || n.includes("wizard")
          ? "#8eb4e6"
          : n.includes("ith")
            ? "#8ed0a8"
            : n.includes("xal")
              ? "#c4a0d4"
              : "";
  return color ? ` style="background:${color}"` : "";
}

function searchTokens(q) {
  return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function hayMatch(hay, q) {
  const h = String(hay || "").toLowerCase();
  const raw = q.trim().toLowerCase();
  if (!raw) return false;
  if (h.includes(raw)) return true;
  return searchTokens(raw).every((t) => h.includes(t));
}

const HUNT_QUERY = /^(hunt|hunts|camp|camps|grind|xp|level)$/;

/** Image + pins in one box so mx/my stick to Maggot JPEG pixels. */
const MaggotLayer = L.Layer.extend({
  initialize(spec, bounds) {
    this.spec = spec;
    this._bounds = L.latLngBounds(bounds);
  },
  onAdd(map) {
    this._map = map;
    const el = (this._el = L.DomUtil.create(
      "div",
      `zone-pic leaflet-zoom-animated role-${this.spec.role || "outdoor"}`
    ));
    const plate = this.spec.placeholder ? " is-placeholder" : "";
    el.className += plate;
    el.innerHTML = `<img src="${this.spec.src}" alt="" draggable="false" /><div class="zone-pins"></div>`;
    this._img = el.firstChild;
    this._pinBox = el.lastChild;
    map.getPanes().overlayPane.appendChild(el);
    map.on("zoomanim", this._animateZoom, this);
    map.on("zoomend viewreset", this._reset, this);
    this._img.addEventListener("load", () => applyClip(this, this.spec));
    this._pinBox.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-poi]");
      if (!btn) return;
      L.DomEvent.stop(e);
      const poi = this._poiById?.get(btn.dataset.poi);
      if (poi) this._onSelect?.(poi);
    });
    this._pinBox.addEventListener("mouseover", (e) => {
      const btn = e.target.closest("[data-poi]");
      if (btn) this._onHover?.(this._poiById?.get(btn.dataset.poi) || null);
    });
    this._reset();
    applyClip(this, this.spec);
  },
  onRemove(map) {
    map.off("zoomanim", this._animateZoom, this);
    map.off("zoomend viewreset", this._reset, this);
    L.DomUtil.remove(this._el);
  },
  _reset() {
    if (!this._map || !this._el) return;
    const nw = this._map.latLngToLayerPoint(this._bounds.getNorthWest());
    const se = this._map.latLngToLayerPoint(this._bounds.getSouthEast());
    L.DomUtil.setPosition(this._el, nw);
    this._el.style.width = `${se.x - nw.x}px`;
    this._el.style.height = `${se.y - nw.y}px`;
  },
  _animateZoom(e) {
    const scale = this._map.getZoomScale(e.zoom);
    const offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e.zoom, e.center).min;
    L.DomUtil.setTransform(this._el, offset, scale);
  },
  getElement() {
    return this._el;
  },
  getBounds() {
    return this._bounds;
  },
  setOpacity(opacity) {
    if (this._el) {
      this._el.style.opacity = String(opacity);
      this._el.style.visibility = opacity < 0.02 ? "hidden" : "visible";
    }
    if (this._img) this._img.style.opacity = opacity > 0.02 ? "1" : "0";
  },
  setZIndex(z) {
    if (this._el) this._el.style.zIndex = String(z);
  },
  setHandlers(onSelect, onHover) {
    this._onSelect = onSelect;
    this._onHover = onHover;
  },
  setPois(pois) {
    this._poiById = new Map((pois || []).map((p) => [p.id, p]));
    if (!this._pinBox) return;
    this._pinBox.innerHTML = (pois || [])
      .filter((p) => p.mx != null && p.my != null)
      .slice()
      .sort((a, b) => (PIN_PRIORITY[a.kind] || 1) - (PIN_PRIORITY[b.kind] || 1))
      .map((p) => {
        const cls = `gpoi kind-${p.kind}${p._active ? " active" : ""}${p._fits ? " fits" : p._hunt ? " out" : ""}`;
        return `<button type="button" class="${cls}" data-poi="${escapeHtml(p.id)}" style="left:${p.mx}%;top:${p.my}%"><div class="gpoi-pin"${pinFace(p)}></div><span class="gpoi-label">${escapeHtml(poiMapLabel(p))}</span></button>`;
      })
      .join("");
  },
});

export default function WorldMap({
  atlas,
  zones,
  pois,
  selectedId,
  focusPoiId,
  hoverPoiId,
  layer,
  dropMode,
  onSelect,
  onPeek,
  onSelectPoi,
  onHoverPoi,
  onDropPoi,
  onSelectItem,
  kindFilter = "all",
  onKindFilter,
  query = "",
  onQuery,
  regions = [],
  quests = [],
  items = [],
  flyNonce = 0,
  level = 1,
  huntFit = false,
  onHuntFit,
  completed = [],
}) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef(new Map());
  const labelsRef = useRef(new Map());
  const pinsRef = useRef(null);
  const poiMarkersRef = useRef(new Map());
  const dropModeRef = useRef(dropMode);
  const layerRef = useRef(layer);
  const onSelectRef = useRef(onSelect);
  const onPeekRef = useRef(onPeek);
  const onDropRef = useRef(onDropPoi);
  const onSelectPoiRef = useRef(onSelectPoi);
  const onHoverRef = useRef(onHoverPoi);
  const selectedIdRef = useRef(selectedId);
  const hoverIdRef = useRef(null);
  const tipRef = useRef(null);
  const searchRef = useRef(null);
  const poisRef = useRef(pois);
  const skipFlyRef = useRef(false);
  const layerFrameRef = useRef(0);
  const seenFrameRef = useRef(0);
  const clickTimerRef = useRef(null);
  const [zoomBand, setZoomBand] = useState("mid");
  const [miniBox, setMiniBox] = useState(null);
  const [hitIndex, setHitIndex] = useState(0);
  const atlasKey = (atlas?.overlays || [])
    .map((o) => `${o.id}:${o.src}:${o.bounds?.[0]?.[0] || 0}:${o.bounds?.[0]?.[1] || 0}:${o.role}`)
    .join("|");

  dropModeRef.current = dropMode;
  layerRef.current = layer;
  onSelectRef.current = onSelect;
  onPeekRef.current = onPeek;
  onDropRef.current = onDropPoi;
  onSelectPoiRef.current = onSelectPoi;
  onHoverRef.current = onHoverPoi;
  selectedIdRef.current = selectedId;
  poisRef.current = pois;

  const zoneById = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z])), [zones]);

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const regionName = (id) => regions.find((r) => r.id === id)?.name || "";
    const hits = [];
    for (const z of zones) {
      const adj = (z.adjacent || []).map((id) => zoneById[id]?.name).filter(Boolean);
      const hay = [
        z.name,
        z.id.replace(/-/g, " "),
        z.kind,
        z.layer,
        z.description,
        z.start ? "starting city start hub" : "",
        regionName(z.regionId),
        ...adj,
        "zone",
      ].join(" ");
      if (!hayMatch(hay, q)) continue;
      const nameHit =
        z.name.toLowerCase().includes(q) || searchTokens(q).every((t) => z.name.toLowerCase().includes(t));
      hits.push({
        type: "zone",
        id: z.id,
        title: z.name,
        sub: `${z.kind} · ${z.levelMin}–${z.levelMax}${z.layer === "deep" ? " · Deep" : ""}`,
        rank: nameHit ? (z.name.toLowerCase().startsWith(q) ? 0 : 1) : 2,
      });
    }
    for (const p of pois || []) {
      const z = zoneById[p.zoneId];
      if (!z) continue;
      if (kindFilter !== "all" && p.kind !== kindFilter) continue;
      const hunt = p.kind === "camp" || p.kind === "named";
      const fits = hunt && campFits(p, level);
      const huntQuery = HUNT_QUERY.test(q);
      const hay = [
        p.name,
        p.kind,
        KIND_LABEL[p.kind],
        p.kind === "quest" ? "turn-in turn in vendor quest npc" : "",
        hunt ? "hunt camp grind xp" : "",
        p.monsters,
        p.notes,
        z.name,
        ...(p.quests || []),
      ].join(" ");
      if (!hayMatch(hay, q) && !(huntQuery && fits)) continue;
      if (huntFit && hunt && !fits) continue;
      hits.push({
        type: "poi",
        id: p.id,
        title: p.name,
        sub: `${KIND_LABEL[p.kind] || p.kind} · ${z.name}${fits ? ` · lvl ${level}` : ""}`,
        poi: p,
        rank: fits
          ? p.name.toLowerCase().includes(q) || huntQuery
            ? 2
            : 3
          : p.name.toLowerCase().includes(q)
            ? 3
            : 4,
      });
    }
    for (const quest of quests || []) {
      const hay = [
        quest.title,
        quest.npc,
        quest.where,
        quest.city,
        quest.kind,
        ...(quest.rewards || []),
        ...(quest.steps || []).flatMap((s) => [s.action, s.turnIn, s.npc, s.reward]),
      ].join(" ");
      if (!hayMatch(hay, q)) continue;
      const target = questTarget(quest, completed, level);
      const titleHit = quest.title.toLowerCase().includes(q);
      const npcHit = (quest.npc || "").toLowerCase().includes(q);
      hits.push({
        type: "quest",
        id: quest.id,
        title: quest.title,
        sub: quest.npc || quest.city || "Quest",
        poiId: target.poiId,
        zoneId: target.zoneId,
        rank: titleHit ? 2 : npcHit ? 3 : 5,
      });
    }
    for (const item of items || []) {
      const hay = [
        item.name,
        item.kind,
        item.slot,
        item.how,
        item.notes,
        ...(item.sources || []).flatMap((s) => [s.label, s.npc, s.method, s.notes]),
      ].join(" ");
      if (!hayMatch(hay, q)) continue;
      const nameHit = item.name.toLowerCase().includes(q);
      const startHit = item.name.toLowerCase().startsWith(q);
      hits.push({
        type: "item",
        id: item.id,
        title: item.name,
        sub: item.how || item.kind || "Item",
        item,
        poiId: item.primaryPoiId,
        zoneId: item.primaryZoneId,
        rank: startHit ? 1 : nameHit ? 2 : 4,
      });
    }
    hits.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
    return hits.slice(0, 16);
  }, [query, zones, pois, zoneById, kindFilter, regions, quests, items, level, huntFit, completed]);

  useEffect(() => {
    setHitIndex(0);
  }, [query]);

  useEffect(() => {
    if (!hostRef.current || !atlas || mapRef.current) return;

    const map = L.map(hostRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 5,
      zoomSnap: 0,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 70,
      doubleClickZoom: false,
      attributionControl: false,
      zoomControl: false,
      maxBoundsViscosity: 0.75,
    });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const worldBounds = L.latLngBounds(atlas.continent?.bounds || [[0, 0], [1200, 1800]]);
    map.setMaxBounds(worldBounds.pad(0.35));

    if (atlas.continent?.src) {
      L.imageOverlay(atlas.continent.src, atlas.continent.bounds, {
        className: "layer-continent",
        zIndex: 1,
        interactive: false,
      }).addTo(map);
    }

    if (atlas.discovered?.src) {
      L.imageOverlay(atlas.discovered.src, atlas.discovered.bounds, {
        className: "layer-discovered",
        zIndex: 2,
        interactive: false,
      }).addTo(map);
    }

    for (const spec of atlas.overlays) {
      const zone = zoneById[spec.id];
      if (!zone) continue;
      const imageBounds = L.latLngBounds(spec.bounds);
      const geo = L.latLngBounds(spec.geoBounds || spec.bounds);

      if (spec.src) {
        const img = new MaggotLayer(spec, spec.bounds);
        img.addTo(map);
        img.setHandlers(
          (poi) => onSelectPoiRef.current?.(poi),
          (poi) => onHoverRef.current?.(poi)
        );
        overlaysRef.current.set(spec.id, { spec, zone, overlay: img, bounds: imageBounds, geo });
      } else {
        overlaysRef.current.set(spec.id, { spec, zone, overlay: null, bounds: imageBounds, geo });
      }

      const label = L.marker(spec.center, {
        icon: L.divIcon({
          className: "atlas-label",
          html: `<span>${zone.name}</span>`,
          iconSize: [0, 0],
        }),
        interactive: true,
        zIndexOffset: 200,
      });
      label.addTo(map);
      label.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        diveInto(spec.id);
      });
      labelsRef.current.set(spec.id, label);
    }

    map.createPane("places");
    map.getPane("places").style.zIndex = 650;
    pinsRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (dropModeRef.current) {
        const hit = latlngToPoi(e.latlng, selectedIdRef.current, null, overlaysRef.current);
        onDropRef.current?.(hit);
        return;
      }
      window.clearTimeout(clickTimerRef.current);
      const latlng = e.latlng;
      clickTimerRef.current = window.setTimeout(() => {
        const id = zoneAtLatLng(latlng, overlaysRef.current, selectedIdRef.current, layerRef.current);
        if (id) onSelectRef.current(id);
      }, 220);
    });

    map.on("dblclick", (e) => {
      window.clearTimeout(clickTimerRef.current);
      const id = zoneAtLatLng(e.latlng, overlaysRef.current, selectedIdRef.current, layerRef.current);
      if (id) {
        diveInto(id);
        return;
      }
      map.setZoomAround(e.latlng, Math.min(map.getZoom() + 1, map.getMaxZoom()));
    });

    map.on("mousemove", (e) => {
      const mapInst = mapRef.current;
      if (!mapInst || dropModeRef.current) return;
      const pt = mapInst.mouseEventToContainerPoint(e.originalEvent);
      if (tipRef.current) {
        tipRef.current.style.transform = `translate(${pt.x + 16}px, ${pt.y + 18}px)`;
      }
      if (zoomBandFor(mapInst.getZoom()) === "far") {
        if (hoverIdRef.current) {
          hoverIdRef.current = null;
          onHoverRef.current?.(null);
        }
        return;
      }
      const radius = zoomBandFor(mapInst.getZoom()) === "near" ? 42 : 28;
      let bestId = null;
      let bestD = radius;
      for (const [id, marker] of poiMarkersRef.current) {
        const mpt = mapInst.latLngToContainerPoint(marker.getLatLng());
        const d = pt.distanceTo(mpt);
        if (d < bestD) {
          bestD = d;
          bestId = id;
        }
      }
      if (bestId === hoverIdRef.current) return;
      hoverIdRef.current = bestId;
      const poi = bestId && (poisRef.current || []).find((p) => p.id === bestId);
      onHoverRef.current?.(poi || null);
    });
    map.on("mouseout", (e) => {
      if (e.originalEvent?.relatedTarget && hostRef.current?.contains(e.originalEvent.relatedTarget)) return;
      hoverIdRef.current = null;
      onHoverRef.current?.(null);
    });

    const refresh = () => {
      setZoomBand(zoomBandFor(map.getZoom()));
      syncLayers(map);
      setMiniBox(minimapBox(map, atlas, layerRef.current));
    };
    map.on("zoom", () => syncLayers(map));
    map.on("zoomend", refresh);
    map.on("move", () => setMiniBox(minimapBox(map, atlas, layerRef.current)));
    map.on("moveend", () => {
      refresh();
      peekViewport(map);
    });
    map.fitBounds(stitchBounds(atlas, layerRef.current), { padding: [28, 28] });
    refresh();

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(hostRef.current);

    return () => {
      window.clearTimeout(clickTimerRef.current);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      overlaysRef.current.clear();
      labelsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlasKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncLayers(map);
    layerFrameRef.current += 1;
    map.flyToBounds(stitchBounds(atlas, layer), { padding: [36, 36], duration: 0.65 });
  }, [layer]);

  const prevSelRef = useRef(null);
  const prevFlyRef = useRef(0);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (seenFrameRef.current !== layerFrameRef.current) {
      seenFrameRef.current = layerFrameRef.current;
      prevSelRef.current = selectedId;
      syncLayers(map);
      return;
    }
    const entry = selectedId ? overlaysRef.current.get(selectedId) : null;
    syncLayers(map);
    if (!entry) return;
    const skip = skipFlyRef.current;
    skipFlyRef.current = false;
    const prev = prevSelRef.current;
    prevSelRef.current = selectedId;
    const fromSearch = flyNonce !== prevFlyRef.current;
    prevFlyRef.current = flyNonce;
    if (fromSearch || skip || focusPoiId || prev == null || prev === selectedId) return;
    flyToZone(map, entry);
  }, [selectedId, focusPoiId, flyNonce]);

  useEffect(() => {
    if (!flyNonce) return;
    const map = mapRef.current;
    const id = selectedIdRef.current;
    const entry = id ? overlaysRef.current.get(id) : null;
    if (!map || !entry) return;
    flyToZone(map, entry);
  }, [flyNonce]);

  useEffect(() => {
    const group = pinsRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();
    poiMarkersRef.current.clear();
    const band = zoomBandFor(map.getZoom());
    const byZone = new Map();
    for (const poi of pois || []) {
      if (kindFilter !== "all" && poi.kind !== kindFilter) continue;
      const zone = zoneById[poi.zoneId];
      if (!zone || zone.layer !== layerRef.current) continue;
      const active = poi.id === focusPoiId;
      const hunt = poi.kind === "camp" || poi.kind === "named";
      const fits = hunt && campFits(poi, level);
      if (huntFit && hunt && !fits && !active) continue;
      const rank = PIN_PRIORITY[poi.kind] || 1;
      const showRank = huntFit && fits ? Math.max(rank, 2) : rank;
      if (band === "far" && showRank < 4 && !active) continue;
      if (band === "mid" && showRank < 2 && !active) continue;
      const tagged = { ...poi, _active: active, _fits: fits, _hunt: hunt };
      const entry = overlaysRef.current.get(poi.zoneId);
      if (entry?.overlay?.setPois && poi.mx != null && poi.my != null) {
        const list = byZone.get(poi.zoneId) || [];
        list.push(tagged);
        byZone.set(poi.zoneId, list);
        const ll = poiToLatLng(poi, overlaysRef.current);
        if (ll) {
          poiMarkersRef.current.set(poi.id, {
            getLatLng: () => L.latLng(ll[0], ll[1]),
            getElement: () => entry.overlay.getElement()?.querySelector(`[data-poi="${poi.id}"]`),
          });
        }
        continue;
      }
      const ll = poiToLatLng(poi, overlaysRef.current);
      if (!ll) continue;
      const marker = L.marker(ll, {
        pane: "places",
        riseOnHover: true,
        keyboard: true,
        icon: L.divIcon({
          className: `gpoi kind-${poi.kind} rank-${rank}${active ? " active" : ""}${fits ? " fits" : hunt ? " out" : ""}`,
          html: `<div class="gpoi-pin"${pinFace(poi)}></div><span class="gpoi-label">${escapeHtml(poiMapLabel(poi))}</span>`,
          iconSize: [28, 36],
          iconAnchor: [14, 34],
        }),
        zIndexOffset: active ? 900 : 400 + showRank * 40,
      });
      marker.bindPopup(poiPopup(poi, zone), { maxWidth: 280, className: "gpoi-popup" });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        window.clearTimeout(clickTimerRef.current);
        onSelectPoiRef.current?.(poi);
      });
      marker.on("dblclick", (e) => L.DomEvent.stopPropagation(e));
      marker.on("mouseover", () => onHoverRef.current?.(poi));
      group.addLayer(marker);
      poiMarkersRef.current.set(poi.id, marker);
    }
    for (const [id, entry] of overlaysRef.current) {
      if (!entry.overlay?.setPois) continue;
      entry.overlay.setPois(byZone.get(id) || []);
    }
  }, [pois, layer, zoneById, kindFilter, focusPoiId, zoomBand, level, huntFit, atlasKey]);

  useEffect(() => {
    for (const [id, marker] of poiMarkersRef.current) {
      const el = marker.getElement();
      if (el) el.classList.toggle("hover", id === hoverPoiId);
    }
  }, [hoverPoiId, pois, kindFilter, layer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoiId) return;
    const poi = (pois || []).find((p) => p.id === focusPoiId);
    if (!poi) return;
    const ll = poiToLatLng(poi, overlaysRef.current);
    if (!ll) return;
    map.flyTo(ll, Math.max(map.getZoom(), 4.45), { duration: 0.55 });
  }, [focusPoiId, pois, layer]);

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === "Escape") {
        onQuery?.("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onQuery]);

  function diveInto(id) {
    const entry = overlaysRef.current.get(id);
    onSelectRef.current(id);
    const map = mapRef.current;
    if (!map || !entry) return;
    skipFlyRef.current = true;
    flyToZone(map, entry);
  }

  function activateHit(hit) {
    if (!hit) return;
    onQuery?.("");
    if (hit.type === "zone") diveInto(hit.id);
    else if (hit.type === "item") {
      onSelectItem?.(hit.item || hit.id);
      if (hit.poiId) onSelectPoiRef.current?.(hit.poiId);
      else if (hit.zoneId) diveInto(hit.zoneId);
    } else if (hit.type === "quest") {
      if (hit.poiId) onSelectPoiRef.current?.(hit.poiId);
      else if (hit.zoneId) diveInto(hit.zoneId);
    } else if (hit.poi) onSelectPoiRef.current?.(hit.poi);
  }

  function peekViewport(map) {
    if (dropModeRef.current) return;
    if (map.getZoom() < 0.85) return;
    const id = zoneAtLatLng(map.getCenter(), overlaysRef.current, selectedIdRef.current, layerRef.current, {
      skipNested: true,
    });
    if (!id || id === selectedIdRef.current) return;
    skipFlyRef.current = true;
    if (onPeekRef.current) onPeekRef.current(id);
    else onSelectRef.current(id);
  }

  function syncLayers(map) {
    const z = map.getZoom();
    const currentLayer = layerRef.current;
    const selected = selectedIdRef.current;
    const hostId = outdoorHostId(selected, overlaysRef.current);
    for (const { spec, zone, overlay } of overlaysRef.current.values()) {
      const onLayer = zone.layer === currentLayer;
      const nested = spec.role === "nested";
      const isSel = spec.id === selected;
      const isHost = spec.id === hostId;
      let show = false;
      let opacity = 0;
      if (onLayer && spec.src) {
        if (nested) {
          show = isSel;
          opacity = isSel ? 1 : 0;
        } else {
          show = true;
          opacity = 1;
        }
      }
      if (overlay) {
        overlay.setOpacity(opacity);
        overlay.setZIndex(isSel ? (nested ? 9 : 7) : isHost ? 6 : nested ? 5 : 4);
        applyClip(overlay, spec, { fullMap: true });
        const im = overlay.getElement();
        if (im) im.style.pointerEvents = "none";
      }
      const label = labelsRef.current.get(spec.id);
      if (label) {
        const el = label.getElement();
        if (el) {
          let labelOp = 0;
          if (onLayer) {
            if (nested) labelOp = !show && z < 1.2 ? 0.7 : 0;
            else labelOp = z < 0.85 ? 1 : Math.max(0, 1 - (z - 0.85) * 1.6);
          }
          el.style.opacity = String(labelOp);
          el.style.pointerEvents = onLayer && labelOp > 0.2 ? "auto" : "none";
        }
      }
    }
    const disc = hostRef.current?.querySelector(".layer-discovered");
    if (disc) disc.style.opacity = "0";
    const cont = hostRef.current?.querySelector(".layer-continent");
    if (cont) cont.style.opacity = "0";
  }

  function fit(kind) {
    const map = mapRef.current;
    if (!map || !atlas) return;
    if (kind === "zone" && selectedIdRef.current) {
      const entry = overlaysRef.current.get(selectedIdRef.current);
      if (entry) {
        flyToZone(map, entry);
        return;
      }
    }
    map.flyToBounds(stitchBounds(atlas, layerRef.current), { padding: [24, 24], duration: 0.7 });
  }

  function jumpMinimap(e) {
    const map = mapRef.current;
    if (!map || !atlas) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const b = stitchBounds(atlas, layerRef.current);
    const lng = b.getWest() + px * (b.getEast() - b.getWest());
    const lat = b.getNorth() - py * (b.getNorth() - b.getSouth());
    map.panTo([lat, lng], { animate: true, duration: 0.35 });
  }

  const kinds = useMemo(() => {
    const set = new Set((pois || []).map((p) => p.kind));
    return ["all", ...Object.keys(KIND_LABEL).filter((k) => set.has(k))];
  }, [pois]);

  const layerPoiCount = (pois || []).filter((p) => zoneById[p.zoneId]?.layer === layer).length;
  const selectedZone = zoneById[selectedId];
  const huntCount = (pois || []).filter(
    (p) => p.zoneId === selectedId && (p.kind === "camp" || p.kind === "named") && campFits(p, level)
  ).length;
  const hoverPoi = (pois || []).find((p) => p.id === hoverPoiId);
  const hoverZone = hoverPoi ? zoneById[hoverPoi.zoneId] : null;
  const miniSrc = atlas?.stitch ? null : zoomBand === "far" ? atlas?.continent?.src : atlas?.discovered?.src;

  return (
    <div className={`map-wrap zoom-${zoomBand} layer-${layer} ${selectedId === "ail-vorith" ? "labels-on" : ""} ${dropMode ? "pinning" : ""}`}>
      <div className="leaflet-stage">
        <div className="map-float map-float-tl">
          <div className="map-search">
            <input
              ref={searchRef}
              value={query}
              placeholder="Find a zone, camp, NPC, quest, or item…"
              onChange={(e) => onQuery?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHitIndex((i) => Math.min(i + 1, Math.max(0, searchHits.length - 1)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHitIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  activateHit(searchHits[hitIndex] || searchHits[0]);
                }
              }}
            />
            {query.trim().length >= 2 && (
              <ul className="map-search-hits">
                {searchHits.length === 0 && <li className="empty-hit">No places or items match</li>}
                {searchHits.map((hit, i) => (
                  <li key={`${hit.type}-${hit.id}`}>
                    <button className={i === hitIndex ? "on" : ""} onMouseDown={() => activateHit(hit)}>
                      <span
                        className={`gpoi-dot ${
                          hit.type === "poi"
                            ? `kind-${hit.poi?.kind}`
                            : hit.type === "zone"
                              ? "kind-landmark"
                              : hit.type === "item"
                                ? "kind-item"
                                : "kind-quest"
                        }`}
                      ></span>
                      <span className="zn">{hit.title}</span>
                      <span className="lv">{hit.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="map-switch">
            <button className={zoomBand === "far" || zoomBand === "mid" ? "on" : ""} onClick={() => fit("all")}>
              {layer === "deep" ? "Deep map" : "Surface map"}
            </button>
            <button className={selectedZone ? "on" : ""} onClick={() => fit("zone")} disabled={!selectedZone}>
              This zone
            </button>
          </div>
          <div className="poi-filters">
            <button className={huntFit ? "on" : ""} onClick={() => onHuntFit?.(!huntFit)}>
              My level
            </button>
            {kinds.map((k) => (
              <button key={k} className={kindFilter === k ? "on" : ""} onClick={() => onKindFilter?.(k)}>
                {k === "all" ? `Places (${layerPoiCount})` : KIND_LABEL[k] || k}
              </button>
            ))}
          </div>
        </div>
        <div ref={hostRef} className="leaflet-host" />
        {selectedZone && (
          <div className="place-chip">
            <p className="region">{selectedZone.kind}</p>
            <strong>{selectedZone.name}</strong>
            <span>
              levels {selectedZone.levelMin}–{selectedZone.levelMax}
              {selectedZone.start ? " · starting city" : ""}
              {huntCount > 0 ? ` · ${huntCount} hunt${huntCount === 1 ? "" : "s"} at ${level}` : ""}
            </span>
            {selectedZone.adjacent?.length > 0 && (
              <div className="place-links">
                {selectedZone.adjacent.slice(0, 5).map((id) => {
                  const z = zoneById[id];
                  if (!z) return null;
                  return (
                    <button key={id} onClick={() => diveInto(id)}>
                      {z.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {atlas && (
          <button type="button" className="minimap minimap-stitch" onClick={jumpMinimap} title="Click to pan">
            {miniSrc ? <img src={miniSrc} alt="" /> : null}
            {miniBox && <i style={miniBox} />}
          </button>
        )}
        <div ref={tipRef} className={`map-hover-card${hoverPoi ? " show" : ""}`}>
          {hoverPoi && (
            <>
              <strong>{hoverPoi.name}</strong>
              <div className="poi-kind">
                {KIND_LABEL[hoverPoi.kind] || hoverPoi.kind}
                {hoverZone ? ` · ${hoverZone.name}` : ""}
              </div>
              {isHuntPoi(hoverPoi) && rangeLabel(hoverPoi) !== "levels unknown" ? (
                <p className="poi-levels">{rangeLabel(hoverPoi)}</p>
              ) : null}
              {monsterList(hoverPoi.monsters).length > 0 ? (
                <ul className="poi-mobs">
                  {monsterList(hoverPoi.monsters).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}
              {hoverPoi.notes ? <p>{hoverPoi.notes}</p> : null}
            </>
          )}
        </div>
        <span className="map-hint">
          {dropMode
            ? "Click the map to drop a POI"
            : layer === "deep"
              ? "The Deep — Underdocks, Caves of Irem, Great Cavern Sea, Ail'vorith · Double-click a zone to dive in"
              : "Surface — pan across zoneline-stitched maps · Double-click a zone to dive in · / to search"}
        </span>
      </div>
    </div>
  );
}

function stitchBounds(atlas, layer) {
  if (!atlas) return L.latLngBounds([[0, 0], [1000, 1000]]);
  const pts = [];
  for (const o of atlas.overlays || []) {
    if (layer && o.layer && o.layer !== layer) continue;
    if (o.role === "nested") continue;
    const b = o.geoBounds || o.bounds;
    if (b) pts.push(b[0], b[1]);
  }
  if (pts.length) return L.latLngBounds(pts);
  return L.latLngBounds(atlas.continent?.bounds || [[0, 0], [1200, 1800]]);
}

function flyToZone(map, entry) {
  if (!map || !entry) return;
  const b = entry.bounds || entry.geo;
  if (!b) return;
  map.flyToBounds(b, { padding: [16, 16], maxZoom: 4.7, duration: 0.7 });
}

function applyClip(overlay, spec, opts = {}) {
  const el = overlay.getElement?.();
  if (!el) return;
  const img = overlay._img || el.querySelector?.("img");
  const setClip = (node, c) => {
    if (!node) return;
    if (!c) {
      node.style.clipPath = "none";
      node.style.webkitClipPath = "none";
      return;
    }
    const path = `inset(${c.t}% ${c.r}% ${c.b}% ${c.l}%)`;
    node.style.clipPath = path;
    node.style.webkitClipPath = path;
  };
  setClip(el, opts.fullMap ? null : spec.clip);
  setClip(img, spec.artClip);
}

function overlayArea(bounds) {
  return Math.abs((bounds.getEast() - bounds.getWest()) * (bounds.getNorth() - bounds.getSouth()));
}

function outdoorHostId(selectedId, overlays) {
  if (!selectedId || !overlays) return selectedId;
  const sel = overlays.get(selectedId);
  if (!sel || sel.spec?.role !== "nested") return selectedId;
  const c = (sel.geo || sel.bounds)?.getCenter?.();
  if (!c) return selectedId;
  let best = null;
  let bestArea = Infinity;
  for (const entry of overlays.values()) {
    if (entry.spec?.role === "nested") continue;
    const g = entry.geo || entry.bounds;
    if (!g?.contains(c)) continue;
    const area = overlayArea(g);
    if (area < bestArea) {
      bestArea = area;
      best = entry.spec.id;
    }
  }
  return best || selectedId;
}

function pickOverlayAt(latlng, overlays, preferredId, layer, opts = {}) {
  if (!overlays) return null;
  const preferred = preferredId && overlays.get(preferredId);
  let outdoor = null;
  let outdoorArea = Infinity;
  let nested = null;
  let nestedArea = Infinity;
  for (const entry of overlays.values()) {
    if (layer && entry.zone?.layer && entry.zone.layer !== layer) continue;
    const g = entry.geo || entry.bounds;
    if (!g?.contains(latlng)) continue;
    const area = overlayArea(g);
    if (entry.spec?.role === "nested") {
      if (opts.skipNested && entry.spec.id !== preferredId) continue;
      if (area < nestedArea) {
        nestedArea = area;
        nested = entry;
      }
    } else if (area < outdoorArea) {
      outdoorArea = area;
      outdoor = entry;
    }
  }
  if (nested && nestedArea < outdoorArea * 0.85) return nested;
  if (preferred) {
    const g = preferred.geo || preferred.bounds;
    if (g?.contains(latlng)) return preferred;
  }
  return outdoor || nested;
}

function zoneAtLatLng(latlng, overlays, selectedId, layer, opts) {
  return pickOverlayAt(latlng, overlays, selectedId, layer, opts)?.spec?.id || null;
}

function latlngToPoi(latlng, zoneId, bounds, overlays) {
  let id = zoneId;
  let b = bounds;
  if (!b && overlays) {
    const hit = pickOverlayAt(latlng, overlays, zoneId);
    if (hit) {
      id = hit.spec.id;
      b = hit.bounds;
    }
  }
  if (!b && id && overlays?.get(id)) {
    b = overlays.get(id).bounds;
  }
  if (!b || !id) {
    return { zoneId: null, mx: null, my: null, lng: latlng.lng, lat: latlng.lat };
  }
  const mx = ((latlng.lng - b.getWest()) / (b.getEast() - b.getWest())) * 100;
  const my = ((b.getNorth() - latlng.lat) / (b.getNorth() - b.getSouth())) * 100;
  return {
    zoneId: id,
    mx: Math.round(mx * 10) / 10,
    my: Math.round(my * 10) / 10,
    lng: latlng.lng,
    lat: latlng.lat,
  };
}

function poiToLatLng(poi, overlays) {
  const entry = overlays.get(poi.zoneId);
  if (entry?.bounds && poi.mx != null && poi.my != null) {
    const b = entry.bounds;
    const lng = b.getWest() + (poi.mx / 100) * (b.getEast() - b.getWest());
    const lat = b.getNorth() - (poi.my / 100) * (b.getNorth() - b.getSouth());
    const ll = L.latLng(lat, lng);
    if (entry.geo && !entry.geo.pad(0.04).contains(ll)) return null;
    return [lat, lng];
  }
  if (poi.lat != null && poi.lng != null) return [poi.lat, poi.lng];
  return null;
}

function minimapBox(map, atlas, layer) {
  const world = stitchBounds(atlas, layer);
  const view = map.getBounds();
  const dx = world.getEast() - world.getWest();
  const dy = world.getNorth() - world.getSouth();
  if (!dx || !dy) return null;
  const left = ((view.getWest() - world.getWest()) / dx) * 100;
  const top = ((world.getNorth() - view.getNorth()) / dy) * 100;
  const width = ((view.getEast() - view.getWest()) / dx) * 100;
  const height = ((view.getNorth() - view.getSouth()) / dy) * 100;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${Math.max(width, 4)}%`,
    height: `${Math.max(height, 4)}%`,
  };
}

function zoomBandFor(z) {
  if (z < 0.2) return "far";
  if (z < 1.05) return "mid";
  return "near";
}

function poiPopup(poi, zone) {
  const levels = rangeLabel(poi);
  const levelLine =
    isHuntPoi(poi) && levels !== "levels unknown" ? `<div class="poi-levels">${escapeHtml(levels)}</div>` : "";
  const mobs = monsterList(poi.monsters);
  const mobLine =
    mobs.length > 0
      ? `<ul class="poi-mobs">${mobs.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`
      : "";
  const questLine =
    poi.quests?.length > 0 ? `<p>Turn-in for: ${escapeHtml(poi.quests.join(", "))}</p>` : "";
  return `<div class="gpoi-pop">
    <strong>${escapeHtml(poi.name)}</strong>
    <div class="poi-kind">${escapeHtml(KIND_LABEL[poi.kind] || poi.kind)}${
      zone ? ` · ${escapeHtml(zone.name)}` : ""
    }</div>
    ${levelLine}
    ${mobLine}
    ${poi.notes ? `<p>${escapeHtml(poi.notes)}</p>` : ""}
    ${questLine}
  </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function campFits(camp, level) {
  const lo = camp.groupMin ?? camp.soloMin;
  const hi = camp.groupMax ?? camp.soloMax;
  if (lo == null && hi == null) return true;
  if (lo == null) return level <= hi + 3;
  if (hi == null) return level >= lo - 3;
  return level >= lo - 3 && level <= hi + 3;
}

export function rangeLabel(camp) {
  const solo = span(camp.soloMin, camp.soloMax);
  const group = span(camp.groupMin, camp.groupMax);
  if (solo && group) return `solo ${solo} · group ${group}`;
  if (group) return `group ${group}`;
  if (solo) return `solo ${solo}`;
  return "levels unknown";
}

function isHuntPoi(poi) {
  return poi?.kind === "camp" || poi?.kind === "named";
}

/** Compact level range for map pin labels, e.g. "1-5". */
export function compactLevelRange(poi) {
  const mins = [poi.soloMin, poi.groupMin].filter((n) => n != null);
  const maxs = [poi.soloMax, poi.groupMax].filter((n) => n != null);
  if (!mins.length && !maxs.length) return null;
  const lo = mins.length ? Math.min(...mins) : null;
  const hi = maxs.length ? Math.max(...maxs) : null;
  if (lo == null) return `–${hi}`;
  if (hi == null) return `${lo}+`;
  if (lo === hi) return String(lo);
  return `${lo}-${hi}`;
}

export function poiMapLabel(poi) {
  if (!isHuntPoi(poi)) return poi.name;
  const range = compactLevelRange(poi);
  return range ? `${poi.name} (${range})` : poi.name;
}

export function monsterList(raw) {
  return String(raw || "")
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function span(a, b) {
  if (a == null && b == null) return null;
  if (a == null) return `–${b}`;
  if (b == null) return `${a}+`;
  return `${a}–${b}`;
}
