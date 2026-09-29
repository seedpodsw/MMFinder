/** Class enhancement turn-ins for Aêthoril — Night Harbor, Faelindral, and shared armor hunts. */

const wikiBase = "https://monstersandmemories.miraheze.org/wiki/";

const CLASSES = [
  { id: "archer", name: "Archer", role: "dps", armor: "leather" },
  { id: "bard", name: "Bard", role: "support", armor: "chain" },
  { id: "beastmaster", name: "Beastmaster", role: "dps", armor: "leather" },
  { id: "cleric", name: "Cleric", role: "healer", armor: "plate" },
  { id: "druid", name: "Druid", role: "healer", armor: "leather" },
  { id: "elementalist", name: "Elementalist", role: "caster", armor: "cloth" },
  { id: "enchanter", name: "Enchanter", role: "caster", armor: "cloth" },
  { id: "fighter", name: "Fighter", role: "tank", armor: "plate" },
  { id: "inquisitor", name: "Inquisitor", role: "caster", armor: "plate" },
  { id: "monk", name: "Monk", role: "dps", armor: "leather" },
  { id: "necromancer", name: "Necromancer", role: "caster", armor: "cloth" },
  { id: "paladin", name: "Paladin", role: "tank", armor: "plate" },
  { id: "ranger", name: "Ranger", role: "dps", armor: "chain" },
  { id: "rogue", name: "Rogue", role: "dps", armor: "leather" },
  { id: "shadow-knight", name: "Shadow Knight", role: "tank", armor: "plate" },
  { id: "shaman", name: "Shaman", role: "healer", armor: "chain" },
  { id: "spellblade", name: "Spellblade", role: "dps", armor: "chain" },
  { id: "wizard", name: "Wizard", role: "caster", armor: "cloth" },
];

const ALL = CLASSES.map((c) => c.id);
const NOT_CLOTH = ALL.filter((id) => !["wizard", "enchanter", "necromancer", "elementalist"].includes(id));

function step(id, level, action, extra = {}) {
  return { id, level, action, ...extra };
}

const QUESTS = [
  {
    id: "fighter-starter-nh",
    title: "Fighter Starter Quest",
    wiki: "Fighter_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["fighter"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Fedamius Steele III",
    where: "Steel Talons Martial Academy, southwest Night Harbor — wall above the courtyard",
    levelMin: 1,
    rewards: ["Steel Talon's Recruit Breastplate"],
    steps: [
      step("ftr-nh-1", 1, "Hand your Notice of Recruitment to Fedamius Steele III on the academy wall.", {
        turnIn: "Notice of Recruitment",
        npc: "Fedamius Steele III",
        zoneId: "night-harbor",
      }),
      step("ftr-nh-2", 1, "Hand the same notice to Lurinda Steele in the courtyard, then to Elrind Steele inside the southern academy entrance.", {
        turnIn: "Notice of Recruitment",
        npc: "Lurinda Steele, Elrind Steele",
        zoneId: "night-harbor",
      }),
      step("ftr-nh-3", 1, "Gather Frottage of Inscriptions, a Skeleton Jawbone, a Snake Fang, and a Fire Beetle Eye from the newbie yards. Hand all four to Elrind.", {
        turnIn: "Frottage of Inscriptions, Skeleton Jawbone, Snake Fang, Fire Beetle Eye",
        npc: "Elrind Steele",
        zoneId: "night-harbor",
      }),
      step("ftr-nh-4", 1, "Hand Elrind's Research to Lurinda. She gives a Steel Talon Trainee Tunic and Lurinda's Pack.", {
        turnIn: "Elrind's Research",
        npc: "Lurinda Steele",
        zoneId: "night-harbor",
        reward: "Steel Talon Trainee Tunic",
      }),
      step("ftr-nh-5", 1, "Kill Ashira warriors for 6 Ashira Warrior Bracers. Combine them in Lurinda's Pack and hand the pack to Lurinda.", {
        turnIn: "Combined pack of 6 Ashira Warrior Bracers",
        npc: "Lurinda Steele",
        zoneId: "shaded-dunes",
        reward: "Lurinda's Note",
      }),
      step("ftr-nh-6", 1, "Hand the Trainee Tunic and Lurinda's Note to Fedamius for your promotion chest.", {
        turnIn: "Steel Talon Trainee Tunic + Lurinda's Note",
        npc: "Fedamius Steele III",
        zoneId: "night-harbor",
        reward: "Steel Talon's Recruit Breastplate",
      }),
    ],
  },
  {
    id: "archer-starter-nh",
    title: "Archer Starter Quest",
    wiki: "Archer_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["archer"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Jacobin Yeats",
    where: "Steel Talons Martial Academy courtyard, southwest Night Harbor",
    levelMin: 1,
    rewards: ["Steel Talon Trainee Tunic (Archer)", "Steel Talons Bowman Tunic"],
    steps: [
      step("arc-nh-1", 1, "Hand Notice of Recruitment to Fedamius Steele III, then to Jacobin Yeats in the courtyard. Take the trainee tunic and Jacobin's Bag.", {
        turnIn: "Notice of Recruitment",
        npc: "Fedamius Steele III, Jacobin Yeats",
        zoneId: "night-harbor",
        reward: "Steel Talon Trainee Tunic (Archer)",
      }),
      step("arc-nh-2", 1, "Kill Ashira warriors west of the gates (or in Shaded Dunes) until you have 6 Ashira Warrior Necklaces. Combine them in Jacobin's Pack.", {
        turnIn: "6 Ashira Warrior Necklaces (combined)",
        npc: "Jacobin Yeats",
        zoneId: "shaded-dunes",
        reward: "Jacobin's Note",
      }),
      step("arc-nh-3", 1, "Hand the Trainee Tunic and Jacobin's Note to the Garrison Quartermaster on the north side of the courtyard.", {
        turnIn: "Steel Talon Trainee Tunic + Jacobin's Note",
        npc: "Garrison Quartermaster",
        zoneId: "night-harbor",
        reward: "Steel Talons Bowman Tunic",
      }),
    ],
  },
  {
    id: "ranger-starter-nh",
    title: "Ranger Starter Quest",
    wiki: "Ranger_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["ranger"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Foss Dunestrider",
    where: "Atop the wall above the west gate — from Wayfarer's Hospice, follow the wall south",
    levelMin: 1,
    rewards: ["Steel Talon Trainee Tunic", "Steel Talons Scout Tunic"],
    steps: [
      step("rng-nh-1", 1, "Hand Notice of Recruitment to Fedamius Steele III, then climb the west wall and hand it to Foss Dunestrider.", {
        turnIn: "Notice of Recruitment",
        npc: "Fedamius Steele III, Foss Dunestrider",
        zoneId: "night-harbor",
        reward: "Steel Talon Trainee Tunic",
      }),
      step("rng-nh-2", 1, "Collect a butchered natural light source, a bat falling-safety reagent, a young snake venom gland, and a Multhele Root. Most are just outside the gates; the root is not.", {
        turnIn: "Light source, bat reagent, venom gland, Multhele Root",
        npc: "Foss Dunestrider",
        zoneId: "night-harbor",
      }),
      step("rng-nh-3", 1, "Combine the four bloods in Foss's small test kit. Hand the sealed pouch to Foss, then hand his note plus your trainee tunic to the Garrison Quartermaster.", {
        turnIn: "Sealed pouch → note + Trainee Tunic",
        npc: "Foss Dunestrider, Garrison Quartermaster",
        zoneId: "night-harbor",
        reward: "Steel Talons Scout Tunic (3 AC / 5 HP / 1 DEX)",
      }),
    ],
  },
  {
    id: "monk-starter-nh",
    title: "Monk Starter Quest",
    wiki: "Monk_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["monk"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Chahaya Tam",
    where: "School of the Fourfold Path — same compound as elementalists",
    levelMin: 1,
    rewards: ["Degree sashes", "Third Degree Fourfold Sash", "Elixir of Mental Focus"],
    steps: [
      step("mnk-nh-1", 1, "Hail Master Chahaya Tam. Spar fellow students, recover what they drop, and hand it in with your belt.", {
        turnIn: "Student token + belt",
        npc: "Chahaya Tam",
        zoneId: "night-harbor",
      }),
      step("mnk-nh-2", 3, "Kill Ashira Scouts for 3 Ashira Scout Necklaces. Hand them to Chahaya, then hand the necklaces again with your belt.", {
        turnIn: "3 Ashira Scout Necklaces + belt",
        npc: "Chahaya Tam",
        zoneId: "shaded-dunes",
      }),
      step("mnk-nh-3", 3, "Hand your 2nd-degree belt to Chahaya for the Elixir of Mental Focus. Later, stand still during the familiar-shadow encounter — do not attack. Hand the medallion with your belt for the Third Degree Fourfold Sash.", {
        turnIn: "Belt → medallion + belt",
        npc: "Chahaya Tam",
        zoneId: "night-harbor",
        reward: "Third Degree Fourfold Sash",
      }),
    ],
  },
  {
    id: "wizard-starter-nh",
    title: "Wizard Starter Quest",
    wiki: "Wizard_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["wizard"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Jabir Ilhamar",
    where: "Wizard tower, northeastern Sageside",
    levelMin: 1,
    rewards: ["Academy Student's Robe", "Gilded Academy Student's Robe"],
    steps: [
      step("wiz-nh-1", 1, "Hand your Carefully Rolled Note to Olvin Viscus in the wizard tower.", {
        turnIn: "Carefully Rolled Note",
        npc: "Olvin Viscus",
        zoneId: "night-harbor",
      }),
      step("wiz-nh-2", 1, "Bring Lanna Ivintoria two snake skins (any Night Harbor snake). She signs your prospectus.", {
        turnIn: "2 Snake Skins",
        npc: "Lanna Ivintoria",
        zoneId: "night-harbor",
      }),
      step("wiz-nh-3", 1, "Hand the Approved Academy Prospectus to Jabir Ilhamar up the tower for your scarlet student robe.", {
        turnIn: "Approved Academy Prospectus",
        npc: "Jabir Ilhamar",
        zoneId: "night-harbor",
        reward: "Academy Student's Robe",
      }),
      step("wiz-nh-4", 4, "Wear the robe, then hand Academy Student's Robe and the Small Note to Jabir for the gilded upgrade.", {
        turnIn: "Academy Student's Robe + Small Note",
        npc: "Jabir Ilhamar",
        zoneId: "night-harbor",
        reward: "Gilded Academy Student's Robe",
      }),
      step("wiz-nh-5", 16, "Later Jabir wants four Burnt Out Lightstones — the repeatable Burnt Out Lightstones quest.", {
        turnIn: "4 Burnt Out Lightstones",
        npc: "Jabir Ilhamar",
        zoneId: "night-harbor",
      }),
    ],
  },
  {
    id: "cleric-starter-nh",
    title: "Cleric Starter Quest",
    wiki: "Cleric_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["cleric"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Millicent Domaire",
    where: "Wayfarer's Hospice, north of the west gate",
    levelMin: 1,
    rewards: ["Penitent Knight's Tunic"],
    steps: [
      step("clr-nh-1", 1, "Start with Thibald Burlond and Jiselle Heyley at the hospice, then help Dalinder Grammanoot. He gives a tunic and Millicent's List.", {
        npc: "Thibald Burlond, Jiselle Heyley, Dalinder Grammanoot",
        zoneId: "night-harbor",
      }),
      step("clr-nh-2", 1, "Gather 2 Blister Beetle Glands, Intact Diseased Bat Bile Duct, and Moondew Moss (wells at night). Hand Millicent's List, Dalinder's Tunic, and those reagents to Millicent Domaire.", {
        turnIn: "Millicent's List, Dalinder's Tunic, 2 Blister Beetle Glands, Intact Diseased Bat Bile Duct, Moondew Moss",
        npc: "Millicent Domaire",
        zoneId: "night-harbor",
        reward: "Penitent Knight's Tunic",
      }),
    ],
  },
  {
    id: "paladin-starter-nh",
    title: "Paladin Starter Quest",
    wiki: "Paladin_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["paladin"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Trey Fulton",
    where: "Penitent Knights / Wayfarer's Hospice area",
    levelMin: 1,
    rewards: ["Penitent Knight's Coin", "experience"],
    steps: [
      step("pal-nh-1", 1, "Hand your Formal Note to Trey Fulton, then show your Penitent Knight's Coin to Halrinn Grimsul at the inn near the west gate.", {
        turnIn: "Formal Note, Penitent Knight's Coin",
        npc: "Trey Fulton, Halrinn Grimsul",
        zoneId: "night-harbor",
      }),
      step("pal-nh-2", 1, "Fetch food for Trey, then ask Halrinn about Trey's missing son Troy.", {
        npc: "Trey Fulton, Halrinn Grimsul",
        zoneId: "night-harbor",
      }),
      step("pal-nh-3", 1, "In Tomb of the Last Wyrmsbane: get Tattered Field Pack from Dario Numas, Torn Cloak from a skeletal archer/marksman, and /take coin between the blue braziers in the Skull Wall room. Combine cloak + coin in the pack.", {
        turnIn: "Troy's Field Pack",
        npc: "Trey Fulton",
        zoneId: "tomb-wyrmsbane",
      }),
      step("pal-nh-4", 1, "Hand Troy's Field Pack to Trey Fulton, then speak with Grand Master Burlond about next steps.", {
        turnIn: "Troy's Field Pack",
        npc: "Trey Fulton, Thibald Burlond",
        zoneId: "night-harbor",
      }),
    ],
  },
  {
    id: "necromancer-starter-nh",
    title: "Necromancer Starter Quest",
    wiki: "Necromancer_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["necromancer"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Buckmarr Gorstagg",
    where: "Concourse of Souls inside the Necropolis",
    levelMin: 1,
    rewards: ["Black and Gold Robe", "Symbol of the Concourse of Souls"],
    steps: [
      step("nec-nh-1", 1, "Hand your Weathered Note to Marvion Hallows, then to Sekhmet in the Concourse of Souls.", {
        turnIn: "Weathered Note",
        npc: "Marvion Hallows, Sekhmet",
        zoneId: "night-harbor",
      }),
      step("nec-nh-2", 1, "Fill Sekhmet's Small Clay Jar with 8 Incarnal Residue. Combine and hand the jar to Buckmarr Gorstagg for the Black and Gold Robe.", {
        turnIn: "Filled Small Clay Jar (8 Incarnal Residue)",
        npc: "Buckmarr Gorstagg",
        zoneId: "night-harbor",
        reward: "Black and Gold Robe",
      }),
      step("nec-nh-3", 1, "Hand Buckmarr's List plus Wererat Pelt, Corrupted Heart, Ghostly Cloth Scrap, and Vibroplasmic Residue.", {
        turnIn: "Buckmarr's List + four reagents",
        npc: "Buckmarr Gorstagg",
        zoneId: "night-harbor",
        reward: "Symbol of the Concourse of Souls",
      }),
    ],
  },
  {
    id: "shadow-knight-starter-nh",
    title: "Shadow Knight Starter Quest",
    wiki: "Shadow_Knight_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["shadow-knight"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Exavius Deathwhisper",
    where: "Concourse of Souls, Necropolis District (via Sageside toward Saltbreeze, or the cemetery shortcut from Black Feather Bazaar)",
    levelMin: 1,
    rewards: ["Gold Trimmed Black Tunic"],
    steps: [
      step("sk-nh-1", 1, "Hand Weathered Note to Exavius Deathwhisper, then downstairs to Brazzic Durraim in the sleeping quarters.", {
        turnIn: "Weathered Note",
        npc: "Exavius Deathwhisper, Brazzic Durraim",
        zoneId: "night-harbor",
      }),
      step("sk-nh-2", 1, "Fill Brazzic's Black Leather Bag with 6 Shattered Skeleton Femurs from rotting skeletons in the necropolis yard. Combine.", {
        turnIn: "Bag of Femurs",
        npc: "Brazzic Durraim",
        zoneId: "night-harbor",
      }),
      step("sk-nh-3", 1, "Hand Brazzic's Sealed Scroll to Noel Klares on the Wayfarer's Hospice roof. He attacks — pull away from guards. Loot Noel Klares' Ring.", {
        turnIn: "Sealed Scroll (then kill Noel)",
        npc: "Noel Klares",
        zoneId: "night-harbor",
      }),
      step("sk-nh-4", 1, "Hand Bag of Femurs and Noel Klares' Ring to Brazzic. Take the bag to Buckmarr.", {
        turnIn: "Bag of Femurs + Noel Klares' Ring",
        npc: "Brazzic Durraim, Buckmarr Gorstagg",
        zoneId: "night-harbor",
      }),
      step("sk-nh-5", 5, "At ~5 grouped / ~8 solo: use Buckmarr's Silver Edged Blade on Shaded Dunes wererat-smugglers. Hand 4 Wererat Heads + the blade to Buckmarr, then the Small Brown Vial to Brazzic.", {
        turnIn: "4 Wererat Heads + Silver Edged Blade → Small Brown Vial",
        npc: "Buckmarr Gorstagg, Brazzic Durraim",
        zoneId: "shaded-dunes",
        reward: "Gold Trimmed Black Tunic",
      }),
    ],
  },
  {
    id: "rogue-starter-nh",
    title: "Rogue Starter Quest",
    wiki: "Rogue_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["rogue"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Sinastin Aspenleaf",
    where: "City Illuminators' Guild on the Night Market edge (look for the giant red gemstone arch)",
    levelMin: 1,
    rewards: ["Irfan's Dagger", "Lamplighter's Ring", "Mark of the Lamplighters", "Roofstrider's Ring"],
    steps: [
      step("rog-nh-1", 1, "Hand Torn Note to Sinastin Aspenleaf. Show his list to Albrecht next door for the courier bag and six sealed notes.", {
        turnIn: "Torn Note → Sinastin's List",
        npc: "Sinastin Aspenleaf, Albrecht",
        zoneId: "night-harbor",
      }),
      step("rog-nh-2", 1, "Deliver sealed notes around town: Customs Inspector Bakari (docks), Captain Eilionoir (Changing of the Guard), Nerida Thinblade (Spirit Tap), Dilshad (tannery), Guard Andreu (naval shipyard by day), Maheed the Butcher (Night Market). Combine returns in the courier bag and hand to Albrecht, then his receipt to Sinastin.", {
        turnIn: "Combined Small Courier Bag → Albrecht's Receipt",
        npc: "Albrecht, Sinastin Aspenleaf",
        zoneId: "night-harbor",
      }),
      step("rog-nh-3", 1, "Give Sinastin's note to Irfan Raz outside the guild for Irfan's Dagger. Follow Irfan's parchment to Stumpy the Whistler, then Sproggets Bedsprings for the Worn Grappling Hook. Finish Irfan's city chain (Bloodstone Eye, Whispering Wallace) and turn the set in to Albrecht, then Sinastin, for Lamplighter's Ring.", {
        turnIn: "Irfan's Dagger chain + Albrecht inventory",
        npc: "Irfan Raz, Albrecht, Sinastin Aspenleaf",
        zoneId: "night-harbor",
        reward: "Lamplighter's Ring",
      }),
      step("rog-nh-4", 5, "Fill the Black Leather Courier Bag: Aashir Journal pages from night cultists (Ancient Crypt / north-gate farm tunnel) plus Engraved Amulet. Combine and hand to Sinastin for Mark of the Lamplighters. Later hand Lamplighter's Ring to Tinka Roofstrider for Roofstrider's Ring.", {
        turnIn: "Combined courier bag; Lamplighter's Ring",
        npc: "Sinastin Aspenleaf, Tinka Roofstrider",
        zoneId: "shaded-dunes",
        reward: "Mark of the Lamplighters, Roofstrider's Ring",
      }),
    ],
  },
  {
    id: "bard-starter-nh",
    title: "Bard Starter Quest",
    wiki: "Bard_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["bard"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Jamee Langris",
    where: "Azure Veils — ask about the stage / tavern district",
    levelMin: 1,
    rewards: ["Jamee's Coin", "Azure Enameled Golden Bangle"],
    steps: [
      step("brd-nh-1", 1, "Hand your starter note to Jamee Langris. Deliver his gifts: Pouch of Rare Tobacco to Harbormaster Daoud (docks), Perfumed Silken Sash to Guard Jeskal (north gate), Small Eye Shaped Mirror to Cordellius Hollmion (small library in Spellbinder's Spire), Tiny Leatherbound Book to Elrind Steele, Framed Pressed Flowers to Jiselle Heyley (hospice), Vial of Cloudy Liquid to Assistant Researcher Farland. Combine six Small Metal Parchment Vials in the courier bag and return to Jamee.", {
        turnIn: "Combined Small Courier Bag",
        npc: "Jamee Langris",
        zoneId: "night-harbor",
        reward: "Jamee's Coin",
      }),
      step("brd-nh-2", 5, "Loot Severed Ring Finger from smugglers/wererats at the Shaded Dunes coast camp (shadow of Fallen Watch) and Engraved Amulet from High Marshal Fionna in Tomb of the Last Wyrmsbane. Combine both in the small leather pouch and hand to Jamee.", {
        turnIn: "Combined small leather pouch",
        npc: "Jamee Langris",
        zoneId: "shaded-dunes",
        reward: "Azure Enameled Golden Bangle",
      }),
    ],
  },
  {
    id: "druid-starter-nh",
    title: "Druid Starter Quest",
    wiki: "Druid_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["druid"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Rolan Talmula",
    where: "Circle of Scarce Rains in Saltbreeze Park, below the Great Guild Hall",
    levelMin: 1,
    rewards: ["Worn Circle Tunic", "Blessed Fire Beetle Eye", "Halfling-Made Boots", "Dousing Rod of Scarce Rains"],
    steps: [
      step("dru-nh-1", 1, "Hand the earth-stained note to Rolan Talmula. Combine 8 Bat Wings in his sack and hand the sack plus a Fire Beetle Eye.", {
        turnIn: "Sack of Bat Wings + Fire Beetle Eye",
        npc: "Rolan Talmula",
        zoneId: "night-harbor",
        reward: "Worn Circle Tunic, Wooden Circle Token, Blessed Fire Beetle Eye",
      }),
      step("dru-nh-2", 5, "Hand the Wooden Circle Token to Calaada (top of the guild), then the Notched token to Aaliyah. /look shrine and /take offering at three west-gate shrines. Take the note to Milham the Mad (Sojourner Camp), combine Raw Rat Meat in the Medicine, hand it to Willy, return spittle to Milham, combine three offerings, and hand spittle + offerings to Aaliyah.", {
        turnIn: "Offerings bag + Willy's Spittle",
        npc: "Calaada, Aaliyah, Milham the Mad",
        zoneId: "night-harbor",
        reward: "Halfling-Made Boots",
      }),
      step("dru-nh-3", 15, "At the Sungreet Strand druid ring, hand Willy's Spittle to Almina. Follow the searing coin to the aqueducts, then Foldja, then farm 6 Shiny Pyrite Coins from Glass Flats goblin shamans. Return Almina's Remedy to Aaliyah, then her token to Calaada.", {
        turnIn: "Satchel of 6 Shiny Pyrite Coins → Almina's Remedy → token",
        npc: "Almina Weepingwind, Calaada Acaciathorn",
        zoneId: "sungreet-strand",
        reward: "Dousing Rod of Scarce Rains",
      }),
    ],
  },
  {
    id: "shaman-starter-nh",
    title: "Shaman Starter Quest",
    wiki: "Shaman_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["shaman"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Errol Shrewtender",
    where: "Seekers of the Lost Eye in Saltbreeze Park, below the Great Guild Hall",
    levelMin: 1,
    rewards: ["Dusty Spiritist Tunic", "Awakened Spirit Pouch"],
    steps: [
      step("shm-nh-1", 1, "Hand Hastily Scrawled Note to Errol Shrewtender for tunic + Uncured Spirit Pouch. Give the pouch to Masoumeh Akhtar. Combine 2 Bone Chips, 1 Fire Beetle Gland, and Moondew Moss (/take moss at the west-gate well at night) in the pouch.", {
        turnIn: "Combined Uncured Spirit Pouch",
        npc: "Masoumeh Akhtar",
        zoneId: "night-harbor",
        reward: "Cured Spirit Pouch",
      }),
      step("shm-nh-2", 4, "At 4, take the pouch upstairs to Eskander Akhtar with a Harvallen Root (Ashira shaman in Shaded Dunes, or Herbmonger Nabiah). At 8, take Purified Entheogenic Powder back to Errol.", {
        turnIn: "Cured Spirit Pouch + Harvallen Root",
        npc: "Eskander Akhtar, Errol Shrewtender",
        zoneId: "shaded-dunes",
      }),
      step("shm-nh-3", 8, "Collect Duskglow Pod (/take pod, Shaded Dunes oasis at night), Grave Dust (/take dust in Tomb of the Last Wyrmsbane), Deepgloom Mushroom (/take mushroom, waterfall cave), and Powdered Selenite (Foreman Stonehammer at Sungreet quarry — return his Battered Canteen from a goblin sneak). Hand all to Errol, then combine slurry + powder in the Blessed Spirit Pouch.", {
        turnIn: "Pod, grave dust, mushroom, powdered selenite",
        npc: "Errol Shrewtender, Foreman Stonehammer",
        zoneId: "sungreet-strand",
      }),
      step("shm-nh-4", 8, "Recover Ancient Painted Urn from Ariblast the Wicked in Tomb of the Last Wyrmsbane. Hand urn + Muddy Elixir to Errol, then pouch + bubbling elixir. Drink the Purified Elixir of Becoming to finish the ritual.", {
        turnIn: "Ancient Painted Urn + Muddy Elixir of Becoming",
        npc: "Errol Shrewtender",
        zoneId: "tomb-wyrmsbane",
        reward: "Awakened Spirit Pouch",
      }),
    ],
  },
  {
    id: "spellblade-starter-nh",
    title: "Spellblade Starter Quest",
    wiki: "Spellblade_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["spellblade"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Njau Hansou",
    where: "Spellbinders Spire observatory in Sageside — use the translocation pads under the wizard tower",
    levelMin: 1,
    rewards: ["Wand of Spectral Sharding", "Spellbinders Blade Talisman"],
    steps: [
      step("spl-nh-1", 1, "Hand Torn Note to Jaffar Jhaym in the observatory, then to Njau Hansou in the training yard.", {
        turnIn: "Torn Note",
        npc: "Jaffar Jhaym, Njau Hansou",
        zoneId: "night-harbor",
      }),
      step("spl-nh-2", 1, "Fill Njau's Bone Bag with 6 Scorched Skeletal Remains (infused weapon hits on skeletons). Hand the combined bag to Njau, then to Buckmarr, then Buckmarr's Research back to Njau.", {
        turnIn: "Bag of Scorched Bones → Buckmarr's Research",
        npc: "Njau Hansou, Buckmarr Gorstagg",
        zoneId: "night-harbor",
      }),
      step("spl-nh-3", 5, "In Shaded Dunes: loot missing logbook pages 1–6 from Ashira raiders at the middle oasis, and Smuggler's Damaged Logbook from Toma the Two-Faced at the southwest smugglers (wererats at night). Combine pages in the logbook and hand to Njau.", {
        turnIn: "Smuggler's Logbook",
        npc: "Njau Hansou",
        zoneId: "shaded-dunes",
        reward: "Wand of Spectral Sharding",
      }),
      step("spl-nh-4", 5, "In Tomb of the Last Wyrmsbane, click the wand on High Marshal Fionna, Lieutenant Gregan Snyde, Jakob Geffrey, and Timmon Bell. Hand four Crystallized Shards plus the wand to Njau.", {
        turnIn: "4 Crystallized Shards + Wand of Spectral Sharding",
        npc: "Njau Hansou",
        zoneId: "tomb-wyrmsbane",
        reward: "Spellbinders Blade Talisman",
      }),
    ],
  },
  {
    id: "inquisitor-starter-nh",
    title: "Inquisitor Starter Quest",
    wiki: "Inquisitor_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["inquisitor"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Petra Gyle",
    where: "Spellbinders — Inquisitor hall / Sageside",
    levelMin: 1,
    rewards: ["Spellbinder's Inquisitor Talisman"],
    steps: [
      step("inq-nh-1", 1, "Report to Jaffar Jhaym then Petra Gyle. Three Easthymn travelers in black garb with silver waist-chains stay at Shaded Bloom Inn. Use the seer stone to pull hidden spikes from their drop spots (or read the note), and take spikes from the one who never leaves the inn — out of sight of locals.", {
        npc: "Petra Gyle",
        zoneId: "night-harbor",
      }),
      step("inq-nh-2", 1, "Fill Petra's bag with each unique spike, combine, and hand it in for Spellbinder's Inquisitor Talisman.", {
        turnIn: "Combined spike bag",
        npc: "Petra Gyle",
        zoneId: "night-harbor",
        reward: "Spellbinder's Inquisitor Talisman",
      }),
    ],
  },
  {
    id: "elementalist-starter-nh",
    title: "Elementalist Starter Quest",
    wiki: "Elementalist_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["elementalist"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Tenebrim Tam",
    where: "School of the Fourfold Path with the monks",
    levelMin: 1,
    rewards: ["Pinwheel tokens", "elemental essences"],
    steps: [
      step("ele-nh-1", 1, "Hand your starter note to Tenebrim Tam. Take the Pinwheel, Box of Elemental Incense, and Small Velvet Bag. Place incense in four hidden spots around Night Harbor and collect an earth, water, wind, and fire pearl.", {
        turnIn: "Bag of four pearls + pinwheel + belt/box as asked",
        npc: "Tenebrim Tam",
        zoneId: "night-harbor",
      }),
      step("ele-nh-2", 1, "Hail Pedram for the crystal trials. Start with fire: use the red crystal in the training grounds, return the elemental essence (empty crystals can be refilled).", {
        turnIn: "Elemental essences",
        npc: "Pedram, Tenebrim Tam",
        zoneId: "night-harbor",
      }),
    ],
  },
  {
    id: "enchanter-starter-nh",
    title: "Enchanter Starter Quest",
    wiki: "Enchanter_Starter_Quest_(Night_Harbor)",
    kind: "class",
    classIds: ["enchanter"],
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Master Wincog / Registrar Vauquelin",
    where: "Enchanter registration vs. unsanctioned path — Sageside / seafront",
    levelMin: 1,
    rewards: ["Rough Cut Robe (lawful path)", "Wincog's unsanctioned rewards"],
    steps: [
      step("enc-nh-1", 1, "Start the Night Harbor enchanter note. You can register lawfully with Registrar Vauquelin for the Rough Cut Robe (required by law, approved spells only) or follow Master Wincog's unsanctioned path.", {
        npc: "Registrar Vauquelin, Master Wincog",
        zoneId: "night-harbor",
      }),
      step("enc-nh-2", 1, "Wincog's deliveries include a Smoky Glass Vial to Mirembe Tiifu (balcony south-east of the monk/elementalist guild, east of Customs), an Ornately Locked Book to Malory Moreland (2nd floor Concourse of Souls, necro/SK merchants), and a Small Golden Cage to Sexton Harding (just outside the north gate by a campfire).", {
        npc: "Mirembe Tiifu, Malory Moreland, Sexton Harding",
        zoneId: "night-harbor",
      }),
    ],
  },
  {
    id: "beastmaster-starter-fae",
    title: "Beastmaster Starter Quest",
    wiki: "Beastmaster_Starter_Quest_(Faelindral)",
    kind: "class",
    classIds: ["beastmaster"],
    city: "Faelindral",
    zoneId: "faelindral",
    npc: "Aerin Mossfang",
    where: "Ardent Keepers in Faelindral — also see the Night Harbor version on the wiki if you started west",
    levelMin: 1,
    rewards: ["Novice Claws of the Keeper", "Spirit-Blessed Shawl"],
    steps: [
      step("bst-fae-1", 1, "Work with Captain Relgen Greenblade and Aerin Mossfang: protect life, take life, sustain life. Hand in to receive Novice Claws of the Keeper.", {
        npc: "Aerin Mossfang",
        zoneId: "faelindral",
        reward: "Novice Claws of the Keeper",
      }),
      step("bst-fae-2", 4, "Hand Novice Claws of the Keeper to Aerin after they have seen hunts. Complete her Weald hunt, then receive Spirit-Blessed Shawl. Keep the claws — she promises a later upgrade.", {
        turnIn: "Novice Claws of the Keeper",
        npc: "Aerin Mossfang",
        zoneId: "evershade-weald",
        reward: "Spirit-Blessed Shawl",
      }),
    ],
  },
  {
    id: "scarab-armor",
    title: "Scarab Armor Quests",
    wiki: "Scarab_Armor_Quests",
    kind: "armor",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Hult Beetlewrangler",
    where: "Sojourner camp — hail Hult, say you want fine accessories, then name the piece",
    levelMin: 1,
    rewards: ["Scarab Breastplate", "Scarab Greaves", "Scarab Helm", "Scarab Boots", "Scarab Shell Shield"],
    steps: [
      step("scarab-shield", 1, "Shield: hail Hult, ask wares / accessories / shield. Turn in 1 Scarab Carapace + 1 Scarab Leg (green scarabs in Shaded Dunes).", {
        turnIn: "1 Carapace + 1 Leg",
        npc: "Hult Beetlewrangler",
        zoneId: "shaded-dunes",
        reward: "Scarab Shell Shield",
      }),
      step("scarab-boots", 1, "Boots: 1 Scarab Carapace + 2 Scarab Legs.", {
        turnIn: "1 Carapace + 2 Legs",
        npc: "Hult Beetlewrangler",
        zoneId: "shaded-dunes",
        reward: "Scarab Boots",
      }),
      step("scarab-helm", 1, "Helm: 2 Scarab Carapaces + 1 Scarab Leg.", {
        turnIn: "2 Carapaces + 1 Leg",
        npc: "Hult Beetlewrangler",
        zoneId: "shaded-dunes",
        reward: "Scarab Helm",
      }),
      step("scarab-greaves", 1, "Greaves: Hult asks two shells, two legs, and a scarab elytron plate (wiki turn-in listed as 3 Carapaces + 2 Legs + 1 Elytron Plate).", {
        turnIn: "Carapaces, Legs, Scarab Elytron Plate",
        npc: "Hult Beetlewrangler",
        zoneId: "shaded-dunes",
        reward: "Scarab Greaves",
      }),
      step("scarab-chest", 1, "Breastplate: 3 Scarab Carapaces + 3 Scarab Legs + 1 Scarab Thorax Plate.", {
        turnIn: "3 Carapaces + 3 Legs + 1 Thorax Plate",
        npc: "Hult Beetlewrangler",
        zoneId: "shaded-dunes",
        reward: "Scarab Breastplate",
      }),
    ],
  },
  {
    id: "cinder-beetle-armor",
    title: "Cinder Beetle Armor Quests",
    wiki: "Cinder_Beetle_Armor_Quests",
    kind: "armor",
    classIds: NOT_CLOTH,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Hult Beetlewrangler",
    where: "Start with Hult, then Night Market master blacksmith (nights only, 6 PM)",
    levelMin: 15,
    rewards: ["Cinder Beetle Shield", "Boots", "Helm", "Greaves", "Breastplate"],
    steps: [
      step("cinder-shield", 15, "Ask Hult about cinder beetle parts. Hand 1 Cinder Beetle Carapace + 1 Cinder Beetle Legs for the shield. He sends you to the master blacksmith.", {
        turnIn: "1 Carapace + 1 Legs",
        npc: "Hult Beetlewrangler",
        zoneId: "sungreet-strand",
        reward: "Cinder Beetle Shield",
      }),
      step("cinder-boots", 15, "Master blacksmith (Night Market, night spawn): 1 Carapace + 2 Legs.", {
        turnIn: "1 Carapace + 2 Legs",
        npc: "a master blacksmith",
        zoneId: "night-harbor",
        reward: "Cinder Beetle Boots",
      }),
      step("cinder-helm", 15, "Weaponsmith Sielah Zefir in Black Feather Bazaar: 2 Carapaces, 2 Legs, 1 Cinder Beetle Mandible (rare off a cinder drone in Sungreet Strand), 2 Charcoal, 1 Copper Dagger.", {
        turnIn: "2 Carapace + 2 Legs + Mandible + 2 Charcoal + Copper Dagger",
        npc: "Sielah Zefir",
        zoneId: "sungreet-strand",
        reward: "Cinder Beetle Helm",
      }),
      step("cinder-greaves", 15, "Dilshad Abolfazl at the tannery: 1 Gland + 1 Blood → Cinder Tanning Agent. Then Shipwright Benlink (SW docks crates): 3 Carapaces + 2 Legs + 1 Serrated Mandible + Tanning Agent.", {
        turnIn: "3 Carapace + 2 Legs + Serrated Mandible + Tanning Agent",
        npc: "Dilshad Abolfazl, Shipwright Benlink",
        zoneId: "night-harbor",
        reward: "Cinder Beetle Greaves",
      }),
      step("cinder-chest", 15, "Hult mixes varnish: 2 Resin + 2 Blood + Crude Fish Oil + Twilight Bay Rum. Master Shipwright Huda (docks, south of Sageside teleporter): 4 Carapaces + 2 Serrated Mandibles + Giant Cinder Beetle Eye + Cinder Varnish.", {
        turnIn: "4 Carapace + 2 Serrated Mandibles + Giant Eye + Varnish",
        npc: "Hult Beetlewrangler, Master Shipwright Huda",
        zoneId: "sungreet-strand",
        reward: "Cinder Beetle Breastplate",
      }),
    ],
  },
  {
    id: "green-drakeling-armor",
    title: "Green Drakeling Scale Armor",
    wiki: "Green_Drakeling_Scale_Armor_Quests",
    kind: "armor",
    classIds: ALL,
    city: "Faelindral",
    zoneId: "faelindral",
    npc: "Takalea Scaletender",
    where: "Faelindral tannery — hail, talk tanning / beasts / drakelings / materials",
    levelMin: 1,
    rewards: ["Scale Boots", "Cloak", "Pants", "Coat"],
    steps: [
      step("drake-boots", 1, "Boots: 2 Green Drakeling Scale + 1 Wing + 1 Hide. Drakelings (and placeholders) in the Faelindral / Evershade newbie yard.", {
        turnIn: "2 Scale + 1 Wing + 1 Hide",
        npc: "Takalea Scaletender",
        zoneId: "evershade-weald",
        reward: "Green Drakeling Scale Boots",
      }),
      step("drake-cloak", 1, "Cloak: 3 Scale + 2 Wing + 1 Hide.", {
        turnIn: "3 Scale + 2 Wing + 1 Hide",
        npc: "Takalea Scaletender",
        zoneId: "evershade-weald",
        reward: "Green Drakeling Scale Cloak",
      }),
      step("drake-pants", 1, "Pants: 4 Scale + 2 Wing + 2 Hide + 1 Poison Duct (rare).", {
        turnIn: "4 Scale + 2 Wing + 2 Hide + 1 Poison Duct",
        npc: "Takalea Scaletender",
        zoneId: "evershade-weald",
        reward: "Green Drakeling Scale Pants",
      }),
      step("drake-coat", 1, "Coat: 6 Scale + 2 Wing + 4 Hide + 1 Poison Duct.", {
        turnIn: "6 Scale + 2 Wing + 4 Hide + 1 Poison Duct",
        npc: "Takalea Scaletender",
        zoneId: "evershade-weald",
        reward: "Green Drakeling Scale Coat",
      }),
    ],
  },
  {
    id: "winged-terror",
    title: "A Winged Terror",
    wiki: "A_Winged_Terror",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Witcher Sayyaad",
    where: "Necropolis south entrance (purple Concourse of Souls banner), immediately right",
    levelMin: 8,
    rewards: ["Mantle of Night", "Tunic of Night", "Necklace of Night"],
    steps: [
      step("terror-1", 8, "Hail Witcher Sayyaad and ask about monsters. Kill Night Terror (lvl 8 named bat, night only) in Necropolis courtyard or Saltbreeze Park.", {
        npc: "Witcher Sayyaad",
        zoneId: "night-harbor",
      }),
      step("terror-wing", 8, "Turn in Night Terror's Wing.", {
        turnIn: "Night Terror's Wing",
        npc: "Witcher Sayyaad",
        zoneId: "night-harbor",
        reward: "Mantle of Night",
      }),
      step("terror-fur", 8, "Turn in Night Terror's Fur.", {
        turnIn: "Night Terror's Fur",
        npc: "Witcher Sayyaad",
        zoneId: "night-harbor",
        reward: "Tunic of Night",
      }),
      step("terror-head", 8, "Turn in Night Terror's Head.", {
        turnIn: "Night Terror's Head",
        npc: "Witcher Sayyaad",
        zoneId: "night-harbor",
        reward: "Necklace of Night",
      }),
    ],
  },
  {
    id: "chompers-hide",
    title: "Chompers' Hide Tunic",
    wiki: "Chompers'_Hide_Tunic_Quest",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "shaded-dunes",
    npc: "Cheikho",
    where: "Crocodile hunters on the Shaded Dunes shoreline",
    levelMin: 1,
    rewards: ["Chompers Hide Tunic"],
    steps: [
      step("chomp-1", 1, "Hail Cheikho, ask about crocodiles / more dangers / Chompers. Kill the named croc and hand Cheikho 1x Chomper's Hide.", {
        turnIn: "Chomper's Hide",
        npc: "Cheikho",
        zoneId: "shaded-dunes",
        reward: "Chompers Hide Tunic",
      }),
    ],
  },
  {
    id: "platinum-badge",
    title: "Platinum Badge of the Living City",
    wiki: "Platinum_Badge_of_the_Living_City_Quest",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "Lieutenant Jarovik Holt",
    where: "Bends Garrison — needs Kindly + ~20% Bends Garrison (Riverbend Gang Wars cuffs help)",
    levelMin: 15,
    rewards: ["Iron Badge of the City", "Platinum Badge of the Living City"],
    steps: [
      step("badge-1", 15, "Raise Bends Garrison faction (Riverbend Gang Wars / Bloodied Allegiance Cuffs, or killing in the Bends). Hail Lieutenant Jarovik Holt.", {
        npc: "Lieutenant Jarovik Holt",
        zoneId: "night-harbor",
      }),
      step("badge-2", 15, "Loot heads of Vikar Brask, Darius Brask, and Cormac Renshaw. Combine in Holt's 3-slot bag and turn in for Iron Badge of the City.", {
        turnIn: "Sack of Heads",
        npc: "Lieutenant Jarovik Holt",
        zoneId: "night-harbor",
        reward: "Iron Badge of the City",
      }),
      step("badge-3", 15, "Kill Eamon Kassir (PH: Deceptive Trickster) and hand Head of Eamon Kassir to Holt. Take Jarovik's Commendation plus the Iron Badge to Corporal Theodora.", {
        turnIn: "Head of Eamon Kassir → Commendation + Iron Badge",
        npc: "Lieutenant Jarovik Holt, Corporal Theodora",
        zoneId: "night-harbor",
        reward: "Platinum Badge of the Living City",
      }),
    ],
  },
  {
    id: "the-yowling",
    title: "The Yowling",
    wiki: "The_Yowling",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "See wiki",
    where: "Night Harbor Ashira pack-ring chain",
    levelMin: 10,
    rewards: ["Ancient Chant", "Ashira Pack Ring upgrades", "Ring of the Ashira Protector"],
    steps: [
      step("yowl-1", 10, "Start The Yowling in Night Harbor. Follow the wiki chain through Ashira pack-ring upgrades (refined / delicate / great) up to Ring of the Ashira Protector.", {
        zoneId: "shaded-dunes",
      }),
    ],
  },
  {
    id: "wanted-ayip",
    title: "Wanted: Ayip & Yapala",
    wiki: "Wanted:_Ayip_&_Yapala",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "See wiki",
    where: "Night Harbor bounty",
    levelMin: 12,
    rewards: ["The Impaler"],
    steps: [
      step("ayip-1", 12, "Pick up the Ayip & Yapala wanted poster in Night Harbor, hunt the pair, and turn in for The Impaler.", {
        zoneId: "night-harbor",
        reward: "The Impaler",
      }),
    ],
  },
  {
    id: "poachers-knives",
    title: "Poacher's Knives",
    wiki: "Poacher's_Knives",
    kind: "hunt",
    classIds: NOT_CLOTH,
    city: "Faelindral",
    zoneId: "keepers-bight",
    npc: "See wiki",
    where: "Keeper's Bight poacher camps",
    levelMin: 30,
    rewards: ["High Keeper's Vambrace"],
    steps: [
      step("poach-1", 30, "Hunt poachers in Keeper's Bight and complete the knives turn-in for High Keeper's Vambrace.", {
        zoneId: "keepers-bight",
        reward: "High Keeper's Vambrace",
      }),
    ],
  },
  {
    id: "claw-arena",
    title: "The Claw Arena",
    wiki: "The_Claw_Arena",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "night-harbor",
    npc: "See wiki",
    where: "Night Harbor arena",
    levelMin: 30,
    rewards: ["Mask / Faceguard / Claw / Gilded Claw of the Gladiator"],
    steps: [
      step("claw-1", 30, "Run The Claw Arena chain in Night Harbor for gladiator mask, faceguard, and claw upgrades.", {
        zoneId: "night-harbor",
      }),
    ],
  },
  {
    id: "tig-measuring",
    title: "Tig's Measuring Quest",
    wiki: "Tig's_Measuring_Quest",
    kind: "hunt",
    classIds: ALL,
    city: "Night Harbor",
    zoneId: "sungreet-strand",
    npc: "Tig",
    where: "Sungreet Strand",
    levelMin: 15,
    rewards: ["The Measure Stick", "Lead Disk of the Apprentice"],
    steps: [
      step("tig-1", 15, "Find Tig in Sungreet Strand and complete the measuring turn-ins.", {
        npc: "Tig",
        zoneId: "sungreet-strand",
        reward: "The Measure Stick, Lead Disk of the Apprentice",
      }),
    ],
  },
];

function wikiUrl(slug) {
  return wikiBase + encodeURIComponent(slug);
}

function appliesToClass(quest, classId) {
  if (!classId) return true;
  if (!quest.classIds || quest.classIds.includes("all")) return true;
  return quest.classIds.includes(classId);
}

function questTouchesZone(quest, zoneId) {
  if (!zoneId) return false;
  if (quest.zoneId === zoneId) return true;
  return (quest.steps || []).some((s) => s.zoneId === zoneId);
}

/** Map turn-in NPC names to atlas pins so "Turn in here" flies to the vendor. */
const NPC_POI = {
  "Fedamius Steele III": "nh-steel-talons",
  "Lurinda Steele": "nh-steel-talons",
  "Elrind Steele": "nh-steel-talons",
  "Jacobin Yeats": "nh-steel-talons",
  "Garrison Quartermaster": "nh-steel-talons",
  "Foss Dunestrider": "nh-foss-wall",
  "Chahaya Tam": "nh-fourfold",
  "Tenebrim Tam": "nh-fourfold",
  Pedram: "nh-fourfold",
  "Olvin Viscus": "nh-wizard-tower",
  "Lanna Ivintoria": "nh-wizard-tower",
  "Jabir Ilhamar": "nh-wizard-tower",
  "Millicent Domaire": "nh-hospice",
  "Thibald Burlond": "nh-hospice",
  "Jiselle Heyley": "nh-hospice",
  "Dalinder Grammanoot": "nh-hospice",
  "Trey Fulton": "nh-hospice",
  "Halrinn Grimsul": "nh-hospice",
  "Noel Klares": "nh-hospice",
  "Buckmarr Gorstagg": "nh-concourse",
  "Marvion Hallows": "nh-concourse",
  Sekhmet: "nh-concourse",
  "Exavius Deathwhisper": "nh-concourse",
  "Brazzic Durraim": "nh-concourse",
  "Malory Moreland": "nh-concourse",
  "Sinastin Aspenleaf": "nh-illuminators",
  Albrecht: "nh-illuminators",
  "Irfan Raz": "nh-illuminators",
  "Tinka Roofstrider": "nh-illuminators",
  "Jamee Langris": "nh-azure-veils",
  "Rolan Talmula": "nh-circle-rains",
  Calaada: "nh-circle-rains",
  "Calaada Acaciathorn": "nh-circle-rains",
  Aaliyah: "nh-circle-rains",
  "Milham the Mad": "nh-sojourner",
  "Almina Weepingwind": "ss-almina",
  "Errol Shrewtender": "nh-seekers",
  "Masoumeh Akhtar": "nh-seekers",
  "Eskander Akhtar": "nh-seekers",
  "Foreman Stonehammer": "ss-stonehammer",
  "Jaffar Jhaym": "nh-spellbinders",
  "Njau Hansou": "nh-spellbinders",
  "Petra Gyle": "nh-spellbinders",
  "Registrar Vauquelin": "nh-enchanter",
  "Master Wincog": "nh-enchanter",
  "Aerin Mossfang": "fae-aerin",
  "Hult Beetlewrangler": "nh-hult",
  "a master blacksmith": "nh-blacksmith",
  "Sielah Zefir": "nh-sielah",
  "Dilshad Abolfazl": "nh-tannery",
  "Shipwright Benlink": "nh-benlink",
  "Master Shipwright Huda": "nh-huda",
  "Witcher Sayyaad": "nh-witcher",
  Cheikho: "sd-cheikho",
  "Lieutenant Jarovik Holt": "nh-holt",
  "Corporal Theodora": "nh-holt",
  "Takalea Scaletender": "fae-takalea",
  Tig: "ss-tig",
  "Quartermaster Boothroy": "tw-quartermaster",
  "Hashamaran, First Among Alphas": "te-hashamaran",
};

function poiForNpc(npc, fallback = null) {
  if (!npc) return fallback;
  let found = fallback;
  for (const name of String(npc).split(",")) {
    const id = NPC_POI[name.trim()];
    if (id) found = id;
  }
  return found;
}

function npcLinks(npc, fallback = null) {
  if (!npc) return [];
  return String(npc)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      poiId: NPC_POI[name] || fallback || null,
    }));
}

function publicQuests() {
  return QUESTS.map((q) => {
    const poiId = q.poiId || poiForNpc(q.npc);
    return {
      ...q,
      wikiUrl: wikiUrl(q.wiki),
      poiId,
      npcLinks: npcLinks(q.npc, poiId),
      steps: (q.steps || []).map((s) => {
        const stepPoi = s.poiId || poiForNpc(s.npc, poiId);
        return {
          ...s,
          poiId: stepPoi,
          npcLinks: npcLinks(s.npc || q.npc, stepPoi),
        };
      }),
    };
  });
}

module.exports = {
  CLASSES,
  QUESTS,
  wikiUrl,
  appliesToClass,
  questTouchesZone,
  publicQuests,
  NPC_POI,
};
