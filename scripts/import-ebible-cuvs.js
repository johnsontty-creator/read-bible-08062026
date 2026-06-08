const fs = require("fs");
const path = require("path");

const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error("Usage: node scripts/import-ebible-cuvs.js <cmn-cu89s_vpl.xml>");
}

const bookAbbr = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
  "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
  "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
  "2PE", "1JN", "2JN", "3JN", "JUD", "REV"
];

const books = JSON.parse(fs.readFileSync(path.join("data", "books.json"), "utf8"));
const xml = fs.readFileSync(sourcePath, "utf8");
const abbrToId = Object.fromEntries(bookAbbr.map((abbr, index) => [abbr, books[index].id]));
const bible = {};

for (const book of books) {
  bible[book.id] = {};
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    bible[book.id][String(chapter)] = { verses: [] };
  }
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

const versePattern = /<v b="([^"]+)" c="(\d+)" v="(\d+)">([\s\S]*?)<\/v>/g;
let verseCount = 0;
let match;

while ((match = versePattern.exec(xml))) {
  const [, abbr, chapter, verse, text] = match;
  const bookId = abbrToId[abbr];

  if (!bookId) {
    throw new Error(`Unknown book abbreviation: ${abbr}`);
  }

  if (!bible[bookId][chapter]) {
    throw new Error(`Unknown chapter: ${abbr} ${chapter}`);
  }

  bible[bookId][chapter].verses.push({
    verse: Number(verse),
    text: decodeEntities(text).trim()
  });

  verseCount += 1;
}

const emptyChapters = [];
for (const book of books) {
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    if (bible[book.id][String(chapter)].verses.length === 0) {
      emptyChapters.push(`${book.id}:${chapter}`);
    }
  }
}

fs.writeFileSync(path.join("data", "bible.json"), JSON.stringify(bible, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  books: Object.keys(bible).length,
  chapters: Object.values(bible).reduce((sum, chapters) => sum + Object.keys(chapters).length, 0),
  verses: verseCount,
  emptyChapters: emptyChapters.length,
  firstVerse: bible.genesis["1"].verses[0],
  lastVerse: bible.revelation["22"].verses.at(-1)
}, null, 2));
