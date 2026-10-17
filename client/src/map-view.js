/** Last atlas camera, kept in this browser. A shared link still wins. */

export const MAP_VIEW_KEY = "mmfinder.map.view.v1";
export const HOME_ZONE = "night-harbor";

function finite(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function cleanZone(id) {
  if (typeof id !== "string") return null;
  const zone = id.trim();
  if (!zone || zone.length > 80 || !/^[a-z0-9-]+$/.test(zone)) return null;
  return zone;
}

export function loadMapView(storage) {
  try {
    const raw = JSON.parse(storage.getItem(MAP_VIEW_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    const zone = cleanZone(raw.zone);
    if (!zone) return null;
    const layer = raw.layer === "deep" ? "deep" : "surface";
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    const zoom = Number(raw.zoom);
    const camera =
      finite(lat) && finite(lng) && finite(zoom) && zoom >= -6 && zoom <= 5
        ? { lat, lng, zoom }
        : null;
    return { zone, layer, camera };
  } catch {
    return null;
  }
}

export function saveMapView(storage, view) {
  const zone = cleanZone(view?.zone);
  if (!zone) return;
  const layer = view?.layer === "deep" ? "deep" : "surface";
  const lat = Number(view?.camera?.lat);
  const lng = Number(view?.camera?.lng);
  const zoom = Number(view?.camera?.zoom);
  const payload = { zone, layer };
  if (finite(lat) && finite(lng) && finite(zoom)) {
    payload.lat = lat;
    payload.lng = lng;
    payload.zoom = zoom;
  }
  storage.setItem(MAP_VIEW_KEY, JSON.stringify(payload));
}

/**
 * First open with nothing stored frames Night Harbor.
 * A later open resumes the saved camera.
 * A link that names a zone, or a place pin, opens that instead.
 */
export function openingPlace(place, saved) {
  const linked = cleanZone(place?.zone);
  if (linked && place?.poi) return { zone: linked, layer: null, camera: null };
  if (linked && saved?.zone === linked && saved.camera) {
    return { zone: linked, layer: saved.layer, camera: saved.camera };
  }
  if (linked) return { zone: linked, layer: null, camera: null };
  if (saved?.zone) return { zone: saved.zone, layer: saved.layer, camera: saved.camera };
  return { zone: HOME_ZONE, layer: "surface", camera: null };
}
