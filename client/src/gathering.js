/** Gathering nodes from the wiki skill pages. Req is the skill to attempt. Trivial is where skill-ups stop. */

export const GATHERING = {
  Mining: {
    tool: "Mining Pick",
    nodes: [
      { name: "Stone Ore", req: "1", trivial: "5", where: "Ail'Vorith (Quarry)" },
      { name: "Copper Vein", req: "1", trivial: "50", where: "Night Harbor (West Gate, North Gate), Shaded Dunes, Evershade Weald, Keeper's Bight" },
      { name: "Rich Copper Vein", req: "1", trivial: "65", where: "Night Harbor (West Gate, North Gate), Shaded Dunes, Evershade Weald, Keeper's Bight" },
      { name: "Limestone Deposit", req: "40", trivial: "75", where: "Fallen Pass (cliffs and canyon), Shaded Dunes (cliffs toward Tel Ekir), Sungreet Strand (canyon above the pit), Scarwood" },
      { name: "Rich Limestone Deposit", req: "55", trivial: "90", where: "Shaded Dunes, Fallen Pass, Scarwood", notes: "Confirmed minable at 45." },
      { name: "Tin Vein", req: "75", trivial: "125", where: "Sungreet Strand, Vale of Zintar, Scarwood" },
      { name: "Rich Tin Vein", req: "85", trivial: "135", where: "Sungreet Strand, Vale of Zintar, Scarwood" },
      { name: "Silver Vein", req: "100", trivial: "150", where: "Sungreet Strand, Vale of Zintar, Scarwood", notes: "Confirmed minable at 107." },
      { name: "Rich Silver Vein", req: "110", trivial: "160", where: "Sungreet Strand, Vale of Zintar, Scarwood" },
      { name: "Iron Vein", req: "150", trivial: "200", where: "Fallen Pass, Glass Flats, Shallow Shoals" },
      { name: "Rich Iron Vein", req: "165", trivial: "215", where: "Fallen Pass, Glass Flats, Shallow Shoals" },
      { name: "Gold Vein", req: "175", trivial: "225", where: "Fallen Pass, Glass Flats, Shallow Shoals" },
      { name: "Rich Gold Vein", req: "190", trivial: "225+", where: "Fallen Pass, Glass Flats, Shallow Shoals" },
      { name: "Coal Vein", req: "225", trivial: "275", where: "Fallen Pass, Sungreet Strand (inside the dwarf mines)" },
      { name: "Rich Coal Vein", req: "240", trivial: "290", where: "Fallen Pass, Sungreet Strand (inside the dwarf mines)" },
      { name: "Platinum Vein", req: "250", trivial: "?", where: "Fallen Pass, Sungreet Strand (inside the dwarf mines)" },
      { name: "Rich Platinum Vein", req: "260", trivial: "?", where: "Fallen Pass, Sungreet Strand (inside the dwarf mines)" },
      { name: "Mithril Vein", req: "?", trivial: "?", where: "" },
      { name: "Rich Mithril Vein", req: "?", trivial: "?", where: "" },
    ],
  },
  Herbalism: {
    tool: "Sickle",
    nodes: [
      { name: "Lionleaf", req: "1", trivial: "15", where: "Evershade Weald, Night Harbor, Shaded Dunes, Sungreet Strand, Underdocks, Keeper's Bight" },
      { name: "Ghost Poppy", req: "1", trivial: "20", where: "Night Harbor, Shaded Dunes, Evershade Weald, Sungreet Strand, Underdocks" },
      { name: "Selstie Kelp", req: "1", trivial: "~20", where: "Evershade Weald", notes: "Needed for the Faelindral bard starter quest." },
      { name: "Sylvine", req: "1", trivial: "30", where: "Evershade Weald" },
      { name: "Nomad's Grace", req: "10", trivial: "45", where: "Evershade Weald, Shaded Dunes, Sungreet Strand" },
      { name: "Whispering Sage", req: "15", trivial: "65", where: "Evershade Weald, Shaded Dunes, Keeper's Bight", notes: "Several in the hidden pass to Tel Ekir." },
      { name: "Ironroot", req: "30", trivial: "80", where: "Shaded Dunes, Sungreet Strand, Vale of Zintar, Fallen Pass", notes: "Spawns on rock walls." },
      { name: "Moonveil", req: "35?", trivial: "?", where: "Evershade Weald, Keeper's Bight, Scarwood", notes: "Only spawns at night, and it glows." },
      { name: "Stranglevine", req: "55", trivial: "105", where: "Fallen Pass, Shallow Shoals", notes: "Many spawn in the lower area with skeletons and beetles." },
      { name: "Gadolvine", req: "80", trivial: "125", where: "Fallen Pass, Shallow Shoals", notes: "In the water at Southern Beach near the smugglers." },
      { name: "Duneleaf", req: "90", trivial: "140", where: "Shaded Dunes, Sungreet Strand, Vale of Zintar" },
      { name: "Stygian Moss", req: "125", trivial: "???", where: "Sungreet Strand, Fallen Pass", notes: "Many inside the cave behind the Sungreet quarry." },
      { name: "Shadeshroom", req: "???", trivial: "???", where: "Fallen Pass, Caves of Irem", notes: "Spawns inside caves." },
      { name: "Dragon's Vigil", req: "125", trivial: "160", where: "Evershade Weald, Keeper's Bight" },
      { name: "Last Breath", req: "???", trivial: "???", where: "Fallen Pass, Glass Flats" },
      { name: "Magebloom", req: "150", trivial: "200", where: "Shaded Dunes, Glass Flats, Fallen Pass" },
      { name: "Ethtongue", req: "200", trivial: "250", where: "Shallow Shoals, Scarwood", notes: "Many on the pirate island in Shallow Shoals." },
      { name: "Flamestalk", req: "???", trivial: "???", where: "Vale of Zintar, Glass Flats" },
    ],
  },
  Lumberjacking: {
    tool: "Lumberjack Axe",
    nodes: [
      { name: "Wood Pile", req: "1", trivial: "35", yields: "Wood, Resin", where: "New Player Yards, Sungreet Strand, Shaded Dunes, Evershade Weald, Keeper's Bight" },
      { name: "Rich Wood Pile", req: "1", trivial: "50", yields: "Wood, Resin", where: "New Player Yards, Sungreet Strand, Shaded Dunes, Evershade Weald, Keeper's Bight" },
      { name: "Fine Wood Pile", req: "35", trivial: "85", yields: "Fine Wood, Resin", where: "Sungreet Strand, Keeper's Bight" },
      { name: "Rich Fine Wood Pile", req: "50", trivial: "100", yields: "Fine Wood, Resin", where: "Sungreet Strand, Keeper's Bight" },
      { name: "Whisperpine Wood Pile", req: "60", trivial: "110", yields: "Whisperpine Wood, Resin", where: "Keeper's Bight" },
      { name: "Rich Whisperpine Wood Pile", req: "75", trivial: "110+", yields: "Whisperpine Wood, Resin", where: "Keeper's Bight" },
      { name: "Ironbark Wood Pile", req: "85", trivial: "135", yields: "Ironbark Wood, Resin", where: "Sungreet Strand, Keeper's Bight" },
      { name: "Rich Ironbark Wood Pile", req: "100", trivial: "150", yields: "Ironbark Wood, Resin", where: "Sungreet Strand" },
      { name: "Golden Palm Wood Pile", req: "110", trivial: "160", yields: "Golden Palm Wood, Resin", where: "Sungreet Strand" },
      { name: "Rich Golden Palm Wood Pile", req: "125", trivial: "175", yields: "Golden Palm Wood, Resin", where: "Sungreet Strand" },
    ],
  },
  Foraging: {
    tool: "Forage",
    nodes: [
      { name: "Wild Carrots", req: "1", trivial: "", where: "Night Harbor, Evershade Weald, Sungreet Strand", notes: "Anywhere in the zone. Not the carrot used in cooking." },
      { name: "Grub", req: "1", trivial: "", where: "Night Harbor, Evershade Weald", notes: "Anywhere in the zone." },
      { name: "Multhele Root", req: "1", trivial: "", where: "Night Harbor, Evershade Weald", notes: "Anywhere in the zone." },
      { name: "Foraged Cureberries", req: "??", trivial: "", where: "Night Harbor, Sungreet Strand", notes: "Removes one poison and one disease. Usable every 60 seconds." },
      { name: "Wild Blackberries", req: "1", trivial: "", where: "Sungreet Strand", notes: "Modest meal. +2 poison resistance for 30 minutes." },
    ],
  },
};

function numbersIn(raw) {
  return [...String(raw || "").matchAll(/\d+/g)].map((m) => Number(m[0]));
}

export function skillFloor(raw) {
  const nums = numbersIn(raw);
  return nums.length ? nums[0] : null;
}

export function skillCeil(raw) {
  const nums = numbersIn(raw);
  return nums.length ? nums[nums.length - 1] : null;
}

export function parseRecipeChunk(text) {
  let rest = String(text || "").trim();
  if (!rest || /^in\b/i.test(rest)) return null;
  let qty = "";
  const arrow = rest.match(/\s+→\s+(.+)$/);
  if (arrow) {
    qty = arrow[1].trim();
    rest = rest.slice(0, arrow.index).trim();
  }
  let station = "";
  const stationMatch = rest.match(/\s+in\s+(.+)$/i);
  if (stationMatch) {
    station = stationMatch[1].trim();
    rest = rest.slice(0, stationMatch.index).trim();
  }
  let trivial = "";
  const triv = rest.match(/,\s*trivial\s+(.+)$/i);
  if (triv) {
    trivial = triv[1].trim();
    rest = rest.slice(0, triv.index).trim();
  }
  const skill = rest.replace(/,\s*$/, "").trim();
  if (!skill || skill.split(/\s+/).length > 3) return null;
  return { skill, trivial, station, qty };
}

export function rowStatus(req, trivial, skill) {
  const need = skillFloor(req);
  const stop = skillCeil(trivial);
  if (need != null && skill < need) return "locked";
  if (stop != null && skill < stop) return "skillup";
  if (stop != null) return "trivial";
  if (need != null) return "open";
  return "";
}

export const TRAINER_HINTS = {
  Mining: /mining|\bminer\b/i,
  Herbalism: /herbal/i,
  Lumberjacking: /lumber/i,
  Foraging: /forag/i,
  Blacksmithing: /blacksmith/i,
  Smithing: /\bsmithing\b|blacksmith/i,
  Smelting: /smelt/i,
  Tailoring: /tailor/i,
  Leatherworking: /leather/i,
  Tanning: /tanner|tanning/i,
  Jewelcrafting: /jewel/i,
  Enchanting: /\benchant/i,
  Disenchanting: /disenchant/i,
  Cooking: /\bcook\b|chef/i,
  Fletching: /fletch/i,
  Woodworking: /woodwork/i,
  Carpentry: /carpent/i,
  Tinkering: /tinker/i,
  Alchemy: /alchem/i,
  Survival: /survival/i,
  "Stone Cutting": /stone\s*cut/i,
  Pottery: /potter/i,
  Fishing: /\bfish/i,
};
