import { unzipSync } from 'fflate';
import type { Play } from '../types';

export interface ParseResult {
  plays: Play[];
  /** Названия обработанных файлов */
  files: string[];
  /** Человекочитаемое описание распознанного формата */
  format: string;
  /** Сколько записей не удалось разобрать (нет даты/названия) */
  skipped: number;
  notes: string[];
}

interface RawRecord {
  title: string;
  artist: string;
  album: string;
  ts: number;
}

const MAX_RECORDS = 500_000;

const TITLE_KEYS = [
  'track', 'trackname', 'tracktitle', 'title', 'name', 'song', 'songname', 'songtitle',
  'composition', 'название', 'трек', 'mastermetadatatrackname',
];
const ARTIST_KEYS = [
  'artist', 'artists', 'artistname', 'artistnames', 'performer', 'performerName', 'executor',
  'author', 'group', 'band', 'исполнитель', 'артист', 'mastermetadataalbumartistname',
  'artisttitle',
];
const ALBUM_KEYS = [
  'album', 'albumname', 'albumtitle', 'release', 'releasename', 'альбом',
  'mastermetadataalbumalbumname',
];
const TS_KEYS = [
  'ts', 'timestamp', 'time', 'date', 'datetime', 'listenedat', 'playedat', 'lastplayed',
  'playtime', 'startedat', 'utctime', 'uts', 'createdat', 'eventtime', 'дата', 'время',
];

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.()]/g, '');

const TITLE_SET = new Set(TITLE_KEYS.map(norm));
const ARTIST_SET = new Set(ARTIST_KEYS.map(norm));
const ALBUM_SET = new Set(ALBUM_KEYS.map(norm));
const TS_SET = new Set(TS_KEYS.map(norm));

/** Достаёт строку из значения любого правдоподобного вида. */
function toText(value: unknown, depth = 0): string {
  if (value == null || depth > 3) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((v) => toText(v, depth + 1)).filter(Boolean);
    return parts.join(', ');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['name', 'title', 'nameRu', 'name_ru', 'text', 'label']) {
      const text = toText(obj[key], depth + 1);
      if (text) return text;
    }
  }
  return '';
}

/** Разбирает дату в мс. Понимает секунды/миллисекунды, ISO, «01.05.2023 18:20». */
export function parseTs(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value > 1e12) return Math.round(value);
    if (value > 1e9) return Math.round(value * 1000);
    return null;
  }
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^\d{9,14}$/.test(raw)) return parseTs(Number(raw));

  // Дату через точку разбираем до Date.parse: тот читает «01.05.2023» как 5 января.
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
  if (dotted) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = dotted;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    const t = date.getTime();
    return Number.isNaN(t) ? null : t;
  }

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;

  const spaced = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
  if (spaced) {
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = spaced;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    const t = date.getTime();
    return Number.isNaN(t) ? null : t;
  }

  return null;
}

function pick(obj: Record<string, unknown>, keys: Set<string>): unknown {
  for (const key of Object.keys(obj)) {
    if (keys.has(norm(key))) return obj[key];
  }
  return undefined;
}

function buildRecord(obj: Record<string, unknown>): RawRecord | null {
  const tsValue = pick(obj, TS_SET);
  const ts = parseTs(tsValue);
  if (ts == null) return null;

  const titleRaw = pick(obj, TITLE_SET);
  const title = toText(titleRaw).slice(0, 200);
  if (!title) return null;

  // Часть экспортов кладёт исполнителя внутрь объекта трека: {track: {title, artists}}.
  let artistRaw = pick(obj, ARTIST_SET);
  let albumRaw = pick(obj, ALBUM_SET);
  if (titleRaw && typeof titleRaw === 'object' && !Array.isArray(titleRaw)) {
    const nested = titleRaw as Record<string, unknown>;
    if (artistRaw === undefined) artistRaw = pick(nested, ARTIST_SET);
    if (albumRaw === undefined) albumRaw = pick(nested, ALBUM_SET);
  }

  const artist = toText(artistRaw).slice(0, 200);
  const album = toText(albumRaw).slice(0, 200);

  return { title, artist, album, ts };
}

/** Рекурсивно обходит JSON и собирает всё, что похоже на прослушивание. */
function walkJson(node: unknown, out: RawRecord[], depth = 0): void {
  if (out.length >= MAX_RECORDS || depth > 8 || node == null) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      if (out.length >= MAX_RECORDS) return;
      if (item && typeof item === 'object') {
        if (Array.isArray(item)) {
          walkJson(item, out, depth + 1);
        } else {
          const record = buildRecord(item as Record<string, unknown>);
          if (record) out.push(record);
          else walkJson(item, out, depth + 1);
        }
      }
    }
    return;
  }

  if (typeof node === 'object') {
    const record = buildRecord(node as Record<string, unknown>);
    if (record) {
      out.push(record);
      return;
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      walkJson(value, out, depth + 1);
    }
  }
}

/** Разбор CSV/TSV: поддерживает кавычки, ; и табуляцию, шапку в любом регистре. */
export function parseDelimited(text: string): { records: RawRecord[]; skipped: number; delimiter: string } {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.slice(0, clean.search(/\r?\n/) === -1 ? clean.length : clean.search(/\r?\n/));

  const count = (ch: string) => firstLine.split(ch).length - 1;
  const candidates = [',', ';', '\t'];
  let delimiter = ',';
  let best = -1;
  for (const c of candidates) {
    const n = count(c);
    if (n > best) {
      best = n;
      delimiter = c;
    }
  }

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // пропускаем
    } else {
      field += ch;
    }
    if (rows.length > MAX_RECORDS) break;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return { records: [], skipped: 0, delimiter };

  const header = rows[0].map((h) => norm(h));
  const indexOf = (set: Set<string>) => header.findIndex((h) => set.has(h));

  const titleIdx = indexOf(TITLE_SET);
  const artistIdx = indexOf(ARTIST_SET);
  const albumIdx = indexOf(ALBUM_SET);
  const tsIdx = indexOf(TS_SET);

  const hasHeader = tsIdx !== -1 && titleIdx !== -1;
  const records: RawRecord[] = [];
  let skipped = 0;

  const start = hasHeader ? 1 : 0;
  for (let r = start; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells || cells.length === 0 || (cells.length === 1 && !cells[0].trim())) continue;

    if (!hasHeader) {
      // Без шапки пробуем понять по содержимому: ищем дату в любой колонке.
      let ts: number | null = null;
      let title = '';
      for (const cell of cells) {
        if (ts == null) {
          const parsed = parseTs(cell);
          if (parsed != null) {
            ts = parsed;
            continue;
          }
        }
        if (!title && cell.trim() && Number.isNaN(Number(cell))) title = cell.trim();
      }
      if (ts == null || !title) {
        skipped += 1;
        continue;
      }
      records.push({ title: title.slice(0, 200), artist: '', album: '', ts });
      continue;
    }

    const ts = parseTs(cells[tsIdx]);
    const title = (cells[titleIdx] ?? '').trim();
    if (ts == null || !title) {
      skipped += 1;
      continue;
    }
    records.push({
      title: title.slice(0, 200),
      artist: (artistIdx >= 0 ? cells[artistIdx] ?? '' : '').trim().slice(0, 200),
      album: (albumIdx >= 0 ? cells[albumIdx] ?? '' : '').trim().slice(0, 200),
      ts,
    });
  }

  return { records, skipped, delimiter };
}

function dedupeKey(play: RawRecord | Play): string {
  const artist = 'artist' in play ? play.artist : '';
  const title = 'title' in play ? play.title : '';
  return `${artist.toLowerCase()}|${title.toLowerCase()}|${play.ts}`;
}

export function toPlays(records: RawRecord[]): Play[] {
  const seen = new Set<string>();
  const plays: Play[] = [];
  for (const record of records) {
    const key = dedupeKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    plays.push({
      title: record.title,
      artist: record.artist,
      album: record.album || undefined,
      ts: record.ts,
    });
  }
  plays.sort((a, b) => a.ts - b.ts);
  return plays;
}

interface FileOutcome {
  records: RawRecord[];
  skipped: number;
  format: string;
  files: string[];
  notes: string[];
}

function parseTextContent(name: string, text: string): FileOutcome {
  const base: FileOutcome = { records: [], skipped: 0, format: '', files: [name], notes: [] };
  const trimmed = text.replace(/^\uFEFF/, '').trimStart();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json: unknown = JSON.parse(trimmed);
      walkJson(json, base.records);
      base.format = 'JSON';
      if (base.records.length === 0) base.notes.push(`${name}: JSON прочитан, но записей с датой и названием не найдено`);
      return base;
    } catch {
      base.notes.push(`${name}: похоже на JSON, но файл повреждён — пробую как таблицу`);
    }
  }

  const delimited = parseDelimited(trimmed);
  base.records = delimited.records;
  base.skipped = delimited.skipped;
  base.format = delimited.delimiter === '\t' ? 'TSV' : `CSV (${delimited.delimiter === ';' ? 'точка с запятой' : 'запятая'})`;
  if (base.records.length === 0) base.notes.push(`${name}: не нашёл колонок с датой и названием трека`);
  return base;
}

function parseZip(name: string, bytes: Uint8Array): FileOutcome {
  const out: FileOutcome = { records: [], skipped: 0, format: 'ZIP-архив', files: [], notes: [] };
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    out.notes.push(`${name}: не удалось распаковать архив`);
    return out;
  }

  const decoder = new TextDecoder('utf-8');
  const names = Object.keys(entries).filter((n) => !n.endsWith('/'));

  for (const entry of names) {
    const lower = entry.toLowerCase();
    if (lower.includes('__macosx') || lower.endsWith('.ds_store')) continue;
    if (!/\.(json|csv|tsv|txt)$/.test(lower)) continue;

    const text = decoder.decode(entries[entry]);
    if (!text.trim()) continue;
    const inner = parseTextContent(entry, text);
    out.records.push(...inner.records);
    out.skipped += inner.skipped;
    out.files.push(entry);
    if (inner.records.length > 0) out.notes.push(...inner.notes);
  }

  if (out.records.length === 0) {
    out.notes.push(`${name}: в архиве нет файлов с историей прослушиваний (искал .json, .csv, .tsv, .txt)`);
  }
  return out;
}

/** Читает произвольный набор файлов и вытаскивает из него прослушивания. */
export async function parseFiles(files: File[]): Promise<ParseResult> {
  const all: RawRecord[] = [];
  const names: string[] = [];
  const formats = new Set<string>();
  const notes: string[] = [];
  let skipped = 0;

  for (const file of files) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const lower = file.name.toLowerCase();

    if (lower.endsWith('.zip')) {
      const outcome = parseZip(file.name, buffer);
      all.push(...outcome.records);
      skipped += outcome.skipped;
      notes.push(...outcome.notes);
      names.push(file.name, ...outcome.files);
      formats.add('ZIP-архив');
      continue;
    }

    if (!/\.(json|csv|tsv|txt)$/.test(lower)) {
      notes.push(`${file.name}: формат не поддерживается (нужны .zip, .json, .csv, .tsv, .txt)`);
      continue;
    }

    const text = new TextDecoder('utf-8').decode(buffer);
    const outcome = parseTextContent(file.name, text);
    all.push(...outcome.records);
    skipped += outcome.skipped;
    notes.push(...outcome.notes);
    names.push(...outcome.files);
    if (outcome.format) formats.add(outcome.format);
  }

  const plays = toPlays(all);

  return {
    plays,
    files: Array.from(new Set(names)),
    format: formats.size ? Array.from(formats).join(' + ') : 'не распознан',
    skipped,
    notes,
  };
}

/** Склеивает новую историю с уже сохранённой без дублей. */
export function mergePlays(existing: Play[], incoming: Play[]): Play[] {
  const seen = new Set<string>();
  const result: Play[] = [];
  for (const play of [...existing, ...incoming]) {
    const key = `${play.artist.toLowerCase()}|${play.title.toLowerCase()}|${play.ts}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(play);
  }
  result.sort((a, b) => a.ts - b.ts);
  return result;
}
