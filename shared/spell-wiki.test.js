import assert from "node:assert/strict";
import test from "node:test";
import {
  parseClassWikitext,
  parseSchool,
  plainWikitext,
  spellSlug,
} from "./spell-wiki.js";

test("plainWikitext strips wiki links and bold", () => {
  assert.equal(plainWikitext("[[Skill Evocation|Evo]] '''Bold'''"), "Evo Bold");
});

test("parseSchool reads labeled wiki links", () => {
  const school = parseSchool("[[Skill Evocation|Evo]]");
  assert.equal(school.text, "Evo");
  assert.equal(school.slug, "Skill_Evocation");
  assert.equal(school.url, "https://monstersandmemories.miraheze.org/wiki/Skill_Evocation");
});

test("spellSlug uses wiki underscore form", () => {
  assert.equal(spellSlug("Polar Alignment: North"), "Polar_Alignment:_North");
});

test("parseClassWikitext reads SpellRow templates", () => {
  const wiki = `
=Wizard Spells=
==Level 1==
{{SpellRow
|name=Minor Flash of Ice
|description=Dealing 6 Cold Damage.
|school=[[Skill Evocation|Evo]]
|location=Single
|mana=8
}}
`;
  const parsed = parseClassWikitext(wiki);
  assert.equal(parsed.type, "spell");
  assert.equal(parsed.sectionTitle, "Wizard Spells");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].name, "Minor Flash of Ice");
  assert.equal(parsed.rows[0].level, 1);
  assert.equal(parsed.rows[0].category, "Evo");
  assert.equal(parsed.rows[0].mana, 8);
});

test("parseClassWikitext reads MediaWiki tables", () => {
  const wiki = `
=Beastmaster Spells & Abilities=
== Level 1 ==
{| class="wikitable"
! Spell Name !! Spell Description !! Class !! Location !! Mana
|-
| Bestial Bond || Appeal to the senses of a target beast. || [[Skill Conjuration|Con]] || Vendor || Innate
|}
`;
  const parsed = parseClassWikitext(wiki);
  assert.equal(parsed.type, "ability");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].name, "Bestial Bond");
  assert.equal(parsed.rows[0].mana, "Innate");
  assert.equal(parsed.rows[0].category, "Con");
});

test("parseClassWikitext skips Removed level headings", () => {
  const wiki = `
=Archer Abilities=
==Level 16==
{{SpellRow
|name=Immobilizing Trap
|description=Trap them.
|school=[[Skill Subterfuge|Sub]]
|location=Vendor
|mana=Innate
}}
==Level 99 (Removed with Archer Deep Dive - As of 0.25.0.1==
{{SpellRow
|name=Quick Shot
|description=Removed ability.
|school=
|location=
|mana=
}}
{{SpellRow
|name=Immobilizing Trap
|description=Trap them again.
|school=
|location=
|mana=
}}
`;
  const parsed = parseClassWikitext(wiki);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].name, "Immobilizing Trap");
  assert.equal(parsed.rows[0].level, 16);
});
