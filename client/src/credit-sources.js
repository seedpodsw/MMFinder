/** Named sources for the maps, art, and data. */

const WIKI = "https://monstersandmemories.miraheze.org/wiki/";

export function wikiContrib(name) {
  return `${WIKI}Special:Contributions/${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

export function wikiFile(name) {
  return `${WIKI}File:${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

function person(name, about, links) {
  return { name, about, links };
}

function contrib(name) {
  return { label: "Wiki uploads", href: wikiContrib(name) };
}

function file(label, filename) {
  return { label, href: wikiFile(filename) };
}

export const CREDIT_SECTIONS = [
  {
    id: "project",
    title: "This atlas",
    people: [
      person("seedpodsw", "MMFinder.", [
        { label: "GitHub", href: "https://github.com/seedpodsw/MMFinder" },
        { label: "Site", href: "https://seedpodsw.github.io/MMFinder/" },
      ]),
    ],
  },
  {
    id: "maps",
    title: "Maps and art",
    people: [
      person("Acatwithopinions", "Faelindral alpha.", [
        contrib("Acatwithopinions"),
        file("Faelindral alpha", "Faelindral (Alpha).jpg"),
      ]),
      person("Aliandrah", "Blind Midden ground floor and basement.", [
        contrib("Aliandrah"),
        file("Ground floor", "Blind Midden - Ground Floor.png"),
        file("Basement", "Blind Midden - Basement.png"),
      ]),
      person("Apoxia", "Caves of Irem.", [
        contrib("Apoxia"),
        file("Caves of Irem", "Caves of Irem By Naawa.png"),
      ]),
      person("Bloodreign", "Caves of Irem.", [
        contrib("Bloodreign"),
        file("Caves of Irem", "Caves of Irem By Naawa.png"),
      ]),
      person("Chazsolo", "Tel Ekir, Grain Cellar, Blacktide Bay.", [
        contrib("Chazsolo"),
        file("Tel Ekir", "Tel-ekir-isometric.jpg"),
        file("Grain Cellar", "Grain Cellar Isometric.jpg"),
        file("Blacktide Bay", "Blacktide Bay.jpg"),
      ]),
      person("Darguth", "Zone connection map.", [
        contrib("Darguth"),
        file("Zone connections", "Zone Connection Map.png"),
      ]),
      person("Doola", "Shaded Dunes, the Ancient Crypt, and the Infested Crypt.", [
        contrib("Doola"),
        file("Shaded Dunes", "Shaded Dunes Map.jpg"),
        file("Ancient Crypt", "Ancient Crypt Map.png"),
        file("Infested Crypt", "Infested Crypt Map.png"),
      ]),
      person("Drown", "Aêthoril.", [
        contrib("Drown"),
        file("Aêthoril", "AêthorilMap.png"),
      ]),
      person(
        "Elusivegarden",
        "Calafrey & Szuur, Shallow Shoals, Scarwood, Keeper's Bight, Glass Flats.",
        [
          contrib("Elusivegarden"),
          file("Calafrey & Szuur", "Calafrey-szurr-combined.png"),
          file("Shallow Shoals", "Shallowshoalseg.png"),
          file("Scarwood", "Scarwood.png"),
          file("Keeper's Bight", "Keepersbighteg.png"),
          file("Glass Flats", "Glass Flats Map.png"),
        ]
      ),
      person("FeelingCaptive2973", "Glass Flats, Grimtide Sanctum.", [
        contrib("FeelingCaptive2973"),
        file("Glass Flats", "Glass Flats Map.png"),
        file("Grimtide Sanctum", "MAP GrimtideSanctum.png"),
      ]),
      person("Fernia", "Fallen Watch.", [contrib("Fernia"), file("Fallen Watch", "Fallen Watch.png")]),
      person("Ganderdot", "Vale of Zintar.", [
        contrib("Ganderdot"),
        file("Vale of Zintar", "Vale of Zintar Map.png"),
      ]),
      person("JuddJr", "Grimtide Sanctum.", [
        contrib("JuddJr"),
        file("Grimtide Sanctum", "MAP GrimtideSanctum.png"),
      ]),
      person("Maggot", "Night Harbor, Sungreet Strand, Faelindral alpha.", [
        contrib("Maggot"),
        file("Night Harbor", "Night harbor V5.jpg"),
        file("Sungreet Strand", "Sungreet Strand v4.jpg"),
        file("Faelindral alpha", "Faelindral (Alpha).jpg"),
      ]),
      person("Morack", "Underdocks.", [
        contrib("Morack"),
        file("Underdocks", "Underdocks AI.png"),
      ]),
      person("Naawa", "Caves of Irem.", [
        file("Caves of Irem", "Caves of Irem By Naawa.png"),
      ]),
      person("Nindaan", "Evershade Weald.", [
        contrib("Nindaan"),
        file("Evershade Weald", "Evershade Weald june 26.jpg"),
      ]),
      person("Skoop", "Rothold.", [
        contrib("Skoop"),
        file("Rothold", "Rothold map by skoop.png"),
      ]),
      person("Walabus Ala'bus", "Faelindral, Fallen Pass, Tomb of the Last Wyrmsbane.", [
        contrib("Walabus Ala'bus"),
        file("Faelindral V2", "Faelindral V2.jpg"),
        file("Fallen Pass", "Fallen pass v1.jpg"),
        file("Tomb of the Last Wyrmsbane", "WyrmsbaneCombined v0.91.png"),
      ]),
    ],
  },
  {
    id: "atlas",
    title: "Illustrated charts",
    people: [
      person(
        "ocombe",
        "Great Cavern Sea, Ail'vorith.",
        [
          { label: "MnM Atlas", href: "https://www.mnmatlas.com/" },
          { label: "Great Cavern Sea", href: "https://www.mnmatlas.com/great-cavern-sea/" },
          { label: "Ail'vorith", href: "https://www.mnmatlas.com/ail-vorith/" },
          { label: "GitHub", href: "https://github.com/ocombe/mnmatlas" },
        ]
      ),
      person(
        "Neeferio",
        "Ail'vorith, Foreign Quarter. CC BY-SA 4.0.",
        [
          contrib("Neeferio"),
          file("Ail'vorith", "Ailvorith.jpg"),
          file("Foreign Quarter", "Ailvorith foreignquarters2.jpg"),
          { label: "CC BY-SA 4.0", href: "https://creativecommons.org/licenses/by-sa/4.0/" },
        ]
      ),
    ],
  },
  {
    id: "data",
    title: "Game data",
    people: [
      person(
        "Monsters & Memories Wiki",
        "Items, quests, mobs, merchants, spells, portraits.",
        [{ label: "Wiki", href: "https://monstersandmemories.miraheze.org/" }]
      ),
      person("FuStv1337", "Spell tags, from MnMWebsite.", [
        { label: "MnMWebsite", href: "https://github.com/FuStv1337/MnMWebsite" },
        { label: "GitHub", href: "https://github.com/FuStv1337" },
      ]),
    ],
  },
  {
    id: "official",
    title: "The game",
    people: [
      person(
        "Niche Worlds Cult",
        "Monsters & Memories. Aêthoril map © Niche Worlds Cult.",
        [
          { label: "monstersandmemories.com", href: "https://monstersandmemories.com/" },
          file("Aêthoril map", "AêthorilMap.png"),
        ]
      ),
    ],
  },
  {
    id: "libraries",
    title: "Libraries",
    people: [
      person("Leaflet", "Map.", [{ label: "leafletjs.com", href: "https://leafletjs.com/" }]),
      person("Three.js", "Walk.", [{ label: "threejs.org", href: "https://threejs.org/" }]),
      person("AG Grid", "Items table.", [{ label: "ag-grid.com", href: "https://www.ag-grid.com/" }]),
    ],
  },
];
