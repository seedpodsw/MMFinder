# MMFinder

Personal atlas for **Monsters & Memories**. Maps come from the [wiki](https://monstersandmemories.miraheze.org/wiki/Zone_Connection_Map) (Maggot and other community cartographers), stitched into one pan-and-zoom atlas.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

- Scroll to zoom, drag to pan (Google Maps-style)
- **Aêthoril** zooms to the whole continent; **Playable lands** fits Calafrey & Szuur
- Wiki zone maps fade in as you zoom into a region
- Click a zone in the list to fly there
- Notes, pins, custom camps, dropped-in maps, and your level stay in this browser. They are not shared.

Refresh wiki images (saved as WebP, long edge 2048):

```bash
node scripts/download-maps.js
```

## GitHub Pages

`npm run build` writes a static `dist/` folder. It bakes `data/world.json` and `data/notes.json` from the seed atlas, then bundles the UI. Express is not required.

Push this repo to `github.com/seedpodsw/MMFinder`, then in the repo settings set Pages to deploy with GitHub Actions. The workflow publishes `dist/` to [https://seedpodsw.github.io/MMFinder/](https://seedpodsw.github.io/MMFinder/). Map images in `client/public/maps/` are included; run the download script before the first push so the atlas art is in the repo.
