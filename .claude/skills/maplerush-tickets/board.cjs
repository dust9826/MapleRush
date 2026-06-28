#!/usr/bin/env node
// MapleRush ticket board — scans tickets/*.md frontmatter and prints a bordered table.
// Usage: node .claude/skills/maplerush-tickets/board.cjs
// No dependencies. Source of truth is the ticket files; nothing is written.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..'); // repo root (.claude/skills/maplerush-tickets -> root)
const DIR = path.join(ROOT, 'tickets');

if (!fs.existsSync(DIR)) {
  console.error(`No tickets/ directory at ${DIR}`);
  process.exit(1);
}

const ORDER = ['in-progress', 'review', 'todo', 'backlog', 'done'];
const STATUS_LABEL = {
  'in-progress': '🔵 IN-PROGRESS',
  'review': '🟡 REVIEW',
  'todo': '⚪ TODO',
  'backlog': '⚫ BACKLOG',
  'done': '✅ DONE',
};
const CONTENT_CAP = 60; // max display-width of the 내용 column (truncate longer with …)

function parseFront(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*-\s+/.test(line) && key) { // list item
      fm[key] = fm[key] || [];
      fm[key].push(line.replace(/^\s*-\s+/, '').trim());
      continue;
    }
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      let val = kv[2].trim();
      if (val === '[]') { fm[key] = []; }
      else if (val === '') { fm[key] = []; } // start of a block list
      else { fm[key] = val.replace(/^["']|["']$/g, ''); }
    }
  }
  return fm;
}

// Display width: CJK (Hangul/Kana/Han/fullwidth) + emoji/symbols count as 2 cells.
function charWidth(cp) {
  if (
    (cp >= 0x1100 && cp <= 0x115F) ||
    (cp >= 0x2600 && cp <= 0x27BF) ||   // misc symbols incl ⚪ ⚫ ✅ ⛔
    (cp >= 0x2B00 && cp <= 0x2BFF) ||
    (cp >= 0x2E80 && cp <= 0x303E) ||
    (cp >= 0x3041 && cp <= 0x33FF) ||
    (cp >= 0x3400 && cp <= 0x4DBF) ||
    (cp >= 0x4E00 && cp <= 0x9FFF) ||
    (cp >= 0xA000 && cp <= 0xA4CF) ||
    (cp >= 0xAC00 && cp <= 0xD7A3) ||   // Hangul syllables
    (cp >= 0xF900 && cp <= 0xFAFF) ||
    (cp >= 0xFE30 && cp <= 0xFE4F) ||
    (cp >= 0xFF00 && cp <= 0xFF60) ||
    (cp >= 0xFFE0 && cp <= 0xFFE6) ||
    (cp >= 0x1F300 && cp <= 0x1FAFF) || // emoji (🔵 🟡 …)
    (cp >= 0x20000 && cp <= 0x3FFFD)
  ) return 2;
  return 1;
}
function dispWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += charWidth(ch.codePointAt(0));
  return w;
}
function pad(s, width) {
  return String(s) + ' '.repeat(Math.max(0, width - dispWidth(s)));
}
function truncate(s, maxW) {
  s = String(s);
  if (dispWidth(s) <= maxW) return s;
  let out = '', w = 0;
  for (const ch of s) {
    const cw = charWidth(ch.codePointAt(0));
    if (w + cw > maxW - 1) break;
    out += ch; w += cw;
  }
  return out + '…';
}

const tickets = [];
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.md') || f.toLowerCase() === 'readme.md') continue;
  const fm = parseFront(fs.readFileSync(path.join(DIR, f), 'utf8'));
  if (fm) { fm._file = f; tickets.push(fm); }
}

const byId = {};
for (const t of tickets) byId[t.id] = t;
const isDone = (id) => byId[id] && byId[id].status === 'done';
const blocked = (t) => (Array.isArray(t.depends_on) ? t.depends_on : []).filter((d) => !isDone(d));

const groups = {};
for (const t of tickets) (groups[t.status] = groups[t.status] || []).push(t);

// Build table rows: [status, ticket, owner, content]
const HEAD = ['상태', '티켓', '담당', '내용'];
const rows = [];
for (const status of ORDER) {
  const list = (groups[status] || []).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  if (!list.length) continue;
  if (status === 'done') {
    // collapse DONE into a single row
    rows.push([
      STATUS_LABEL[status],
      list.map((t) => t.id || '?').join(' / '),
      '—',
      truncate(list.map((t) => t.title || t._file).join(' / '), CONTENT_CAP),
    ]);
    continue;
  }
  for (const t of list) {
    const owner = t.owner && t.owner !== 'unassigned' ? `@${t.owner}` : '·';
    const blk = blocked(t);
    const content = (t.title || t._file) + (blk.length ? `  ⛔${blk.join(',')}` : '');
    rows.push([STATUS_LABEL[status], t.id || '?', owner, truncate(content, CONTENT_CAP)]);
  }
}

// Column widths
const widths = HEAD.map((h, i) => Math.max(dispWidth(h), ...rows.map((r) => dispWidth(r[i]))));

const hline = (l, m, r) => l + widths.map((w) => '─'.repeat(w + 2)).join(m) + r;
const line = (cells) => '│' + cells.map((c, i) => ' ' + pad(c, widths[i]) + ' ').join('│') + '│';

console.log(`\n  MapleRush board — ${tickets.length} tickets\n`);
console.log(hline('┌', '┬', '┐'));
console.log(line(HEAD));
console.log(hline('├', '┼', '┤'));
rows.forEach((r, i) => {
  console.log(line(r));
  if (i < rows.length - 1) console.log(hline('├', '┼', '┤'));
});
console.log(hline('└', '┴', '┘'));
console.log('');
