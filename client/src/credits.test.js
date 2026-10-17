import assert from "node:assert/strict";
import test from "node:test";
import { CREDIT_SECTIONS, wikiContrib, wikiFile } from "./credit-sources.js";

test("wiki links keep spaces and apostrophes readable", () => {
  assert.equal(
    wikiContrib("Walabus Ala'bus"),
    "https://monstersandmemories.miraheze.org/wiki/Special:Contributions/Walabus_Ala'bus"
  );
  assert.equal(
    wikiFile("Night harbor V5.jpg"),
    "https://monstersandmemories.miraheze.org/wiki/File:Night_harbor_V5.jpg"
  );
});

test("every credited person has a source link", () => {
  const names = [];
  for (const section of CREDIT_SECTIONS) {
    assert.ok(section.people.length > 0, section.id);
    for (const person of section.people) {
      names.push(person.name);
      assert.ok(person.about.trim().length > 0, person.name);
      assert.ok(person.links.length > 0, person.name);
      for (const link of person.links) {
        assert.match(link.href, /^https:\/\//, `${person.name} ${link.label}`);
      }
    }
  }
  for (const required of ["seedpodsw", "Maggot", "Naawa", "ocombe", "Neeferio", "Skoop", "Aliandrah", "FuStv1337"]) {
    assert.ok(names.includes(required), required);
  }
});
