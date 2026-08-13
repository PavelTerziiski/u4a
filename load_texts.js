#!/usr/bin/env node
/*
 * load_texts.js — парсва .md файловете с текстове и налива в Supabase.
 *
 * Употреба:
 *   node load_texts.js --dry-run ./texts_src           # само парсва и показва статистика
 *   node load_texts.js --replace ./texts_src           # ТРИЕ старите и налива новите
 *
 * Автоматично разпознаване по блок:
 *   - блок с "Ключ" -> error_texts (grade, title, full_text, errors[])
 *   - блок без "Ключ" -> reading_texts (title, grade, level, sentences[], language)
 * grade се взима от префикса G3/G4. level: G3=easy, G4=medium. language=bg.
 */

const fs = require('fs');
const path = require('path');

// ---------- парсване ----------
const HEADING_RE = /^\s*#{0,6}\s*G([34])(?:[-\u2011\u2010]?\d{1,3})?\s*[\u2013\u2014-]\s*(.+?)\s*$/;

function isHeading(line) {
  if (line.length > 90) return false;
  return HEADING_RE.test(line);
}

function splitBlocks(content) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.replace(/\u00a0/g, ' ');
    if (isHeading(line)) {
      const m = line.match(HEADING_RE);
      cur = { grade: Number(m[1]), title: m[2].trim(), lines: [] };
      blocks.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
    // редове преди първото заглавие (интро блурб) се игнорират
  }
  return blocks;
}

function cleanProse(lines, stopRe) {
  const out = [];
  for (const l of lines) {
    if (stopRe && stopRe.test(l)) break;
    const t = l.trim();
    if (t) out.push(t);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function parseErrors(lines) {
  const keyIdx = lines.findIndex(l => /^\s*Ключ/i.test(l.trim()));
  const errs = [];
  if (keyIdx === -1) return errs;
  for (let i = keyIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^[\s*•\-\u2013]*\s*(.+?)\s*\u2192\s*(.+?)\s*$/); // "wrong → correct"
    if (m) errs.push({ wrong: m[1].trim(), correct: m[2].trim() });
  }
  return errs;
}

function splitSentences(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return [];
  // разделя след . ! ? … като запазва края на изречението
  const parts = flat.match(/[^.!?…]+[.!?…]+(?:["»“”)]+)?|\S.+$/g) || [flat];
  return parts.map(s => s.trim()).filter(Boolean);
}

function parseFile(content) {
  const out = { errorTexts: [], readingTexts: [] };
  for (const b of splitBlocks(content)) {
    const hasKey = b.lines.some(l => /^\s*Ключ/i.test(l.trim()));
    if (hasKey) {
      const full_text = cleanProse(b.lines, /Открий и поправи/i);
      const errors = parseErrors(b.lines);
      out.errorTexts.push({ grade: b.grade, title: b.title, full_text, errors });
    } else {
      const body = cleanProse(b.lines, null);
      const sentences = splitSentences(body).map((text, i) => ({ id: i + 1, text }));
      out.readingTexts.push({
        grade: b.grade,
        title: b.title,
        level: b.grade === 3 ? 'easy' : 'medium',
        language: 'bg',
        sentences,
      });
    }
  }
  return out;
}

function collectFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => /\.(md|txt)$/i.test(f))
    .map(f => path.join(dir, f));
}

function parseAll(dir) {
  const all = { errorTexts: [], readingTexts: [] };
  for (const file of collectFiles(dir)) {
    const parsed = parseFile(fs.readFileSync(file, 'utf8'));
    all.errorTexts.push(...parsed.errorTexts);
    all.readingTexts.push(...parsed.readingTexts);
  }
  return all;
}

// ---------- CLI ----------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');
  const dir = args.find(a => !a.startsWith('--')) || './texts_src';

  const { errorTexts, readingTexts } = parseAll(dir);

  const g3e = errorTexts.filter(t => t.grade === 3).length;
  const g4e = errorTexts.filter(t => t.grade === 4).length;
  const g3r = readingTexts.filter(t => t.grade === 3).length;
  const g4r = readingTexts.filter(t => t.grade === 4).length;

  console.log('=== СТАТИСТИКА ===');
  console.log(`error_texts   : ${errorTexts.length}  (G3=${g3e}, G4=${g4e})`);
  console.log(`reading_texts : ${readingTexts.length}  (G3=${g3r}, G4=${g4r})`);

  // валидации
  const badErr = errorTexts.filter(t => !t.full_text || t.errors.length === 0);
  const badRead = readingTexts.filter(t => t.sentences.length === 0);
  if (badErr.length) console.log(`⚠ error_texts без текст/ключ: ${badErr.map(t => t.title).join('; ')}`);
  if (badRead.length) console.log(`⚠ reading_texts без изречения: ${badRead.map(t => t.title).join('; ')}`);

  // проверка: всяка грешна дума трябва да присъства като ЦЯЛА дума в текста
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const L = '\\u0400-\\u04FFa-zA-Z';
  const missing = [];
  for (const t of errorTexts) {
    for (const e of t.errors) {
      const re = new RegExp(`(?<![${L}])${esc(e.wrong)}(?![${L}])`);
      if (!re.test(t.full_text)) missing.push(`${t.title}: "${e.wrong}"`);
    }
  }
  const noop = [];
  for (const t of errorTexts) for (const e of t.errors) if (e.wrong === e.correct) noop.push(`${t.title}: "${e.wrong}"`);
  if (noop.length) { console.log(`\u26a0 празни ключове (грешна = вярна) (${noop.length}):`); noop.forEach(m=>console.log('   - '+m)); }
  if (missing.length) {
    console.log(`⚠ грешни думи, които НЕ се срещат в текста (${missing.length}):`);
    missing.forEach(m => console.log('   - ' + m));
  } else {
    console.log('✓ всички грешни думи от ключовете присъстват в текстовете');
  }

  console.log('\n--- пример error_texts[0] ---');
  console.log(JSON.stringify(errorTexts[0], null, 2));
  console.log('\n--- пример reading_texts[0] (първи 2 изр.) ---');
  const r0 = readingTexts[0];
  console.log(JSON.stringify({ ...r0, sentences: r0.sentences.slice(0, 2) }, null, 2));

  if (dryRun || !replace) {
    console.log('\n(dry-run — нищо не е записано в базата)');
    return;
  }

  // ---------- запис в Supabase ----------
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Липсва SUPABASE_URL или ключ в средата (.env).');
  const supa = createClient(url, key, { auth: { persistSession: false } });

  async function wipe(table) {
    const { error } = await supa.from(table).delete().not('id', 'is', null);
    if (error) throw new Error(`Триене на ${table} се провали: ${error.message} (вероятно нужен SERVICE_ROLE ключ)`);
  }
  async function insert(table, rows) {
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supa.from(table).insert(chunk);
      if (error) throw new Error(`Вкарване в ${table} се провали: ${error.message}`);
    }
  }

  console.log('\nТрия error_texts и reading_texts...');
  await wipe('error_texts');
  await wipe('reading_texts');
  console.log('Наливам...');
  await insert('error_texts', errorTexts);
  await insert('reading_texts', readingTexts);

  const { count: ec } = await supa.from('error_texts').select('*', { count: 'exact', head: true });
  const { count: rc } = await supa.from('reading_texts').select('*', { count: 'exact', head: true });
  console.log(`ГОТОВО. error_texts=${ec}, reading_texts=${rc}`);
}

main().catch(e => { console.error('ГРЕШКА:', e.message); process.exit(1); });
