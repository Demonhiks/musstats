import type {
  AlbumTotal,
  ArtistTotal,
  DayPoint,
  Period,
  Play,
  Stats,
  TrackTotal,
} from '../types';

/** Средняя длительность трека — по ней считаем «часы прослушивания». */
export const AVG_TRACK_MS = 3.5 * 60 * 1000;

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Понедельник = 0, воскресенье = 6. */
export function weekdayIndex(ts: number): number {
  return (new Date(ts).getDay() + 6) % 7;
}

export function weekdayName(index: number): string {
  return WEEKDAYS[index] ?? '—';
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Годы, за которые есть данные (по убыванию). */
export function availableYears(plays: Play[]): number[] {
  const years = new Set<number>();
  for (const play of plays) years.add(new Date(play.ts).getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

export function periodRange(period: Period, plays: Play[], now = Date.now()): { from: number; to: number } {
  const to = now;
  if (period === 'all') {
    const first = plays.length ? plays[0].ts : now;
    return { from: first, to };
  }
  if (period.startsWith('y')) {
    const year = Number(period.slice(1));
    return { from: new Date(year, 0, 1).getTime(), to: new Date(year, 11, 31, 23, 59, 59, 999).getTime() };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  return { from: startOfDay(to) - (days - 1) * DAY_MS, to };
}

export function filterPlays(plays: Play[], period: Period, now = Date.now()): Play[] {
  const { from, to } = periodRange(period, plays, now);
  return plays.filter((play) => play.ts >= from && play.ts <= to);
}

function buildDaySeries(plays: Play[], from: number, to: number): DayPoint[] {
  const counts = new Map<string, number>();
  for (const play of plays) {
    const key = dayKey(play.ts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const start = startOfDay(Math.max(from, plays.length ? plays[0].ts : from));
  const end = startOfDay(Math.min(to, Date.now()));
  const points: DayPoint[] = [];

  // Ограничиваем длину ряда, чтобы не рисовать 10 лет по дням.
  const totalDays = Math.min(Math.floor((end - start) / DAY_MS) + 1, 1200);
  for (let i = 0; i < totalDays; i += 1) {
    const ts = start + i * DAY_MS;
    const key = dayKey(ts);
    points.push({ day: key, ts, plays: counts.get(key) ?? 0 });
  }
  return points;
}

export function computeStats(plays: Play[]): Stats {
  const empty: Stats = {
    plays: 0,
    artists: 0,
    tracks: 0,
    albums: 0,
    durationMs: 0,
    byDay: [],
    byHour: new Array(24).fill(0) as number[],
    byWeekday: new Array(7).fill(0) as number[],
    topArtists: [],
    topTracks: [],
    topAlbums: [],
    firstTs: 0,
    lastTs: 0,
    streak: 0,
    currentStreak: 0,
    busiestDay: null,
    busiestHour: 0,
    busiestWeekday: 0,
    perActiveDay: 0,
  };
  if (plays.length === 0) return empty;

  const artistCounts = new Map<string, number>();
  const artistNames = new Map<string, string>();
  const trackCounts = new Map<string, { title: string; artist: string; plays: number }>();
  const albumCounts = new Map<string, { album: string; artist: string; plays: number }>();
  const byHour = new Array(24).fill(0) as number[];
  const byWeekday = new Array(7).fill(0) as number[];
  const daySet = new Set<string>();

  let firstTs = plays[0].ts;
  let lastTs = plays[0].ts;
  const trackSet = new Set<string>();

  for (const play of plays) {
    const artist = play.artist || 'Неизвестный исполнитель';
    const artistKey = artist.toLowerCase();
    artistCounts.set(artistKey, (artistCounts.get(artistKey) ?? 0) + 1);
    if (!artistNames.has(artistKey)) artistNames.set(artistKey, artist);

    const trackKey = `${artistKey}|${play.title.toLowerCase()}`;
    trackSet.add(trackKey);
    const track = trackCounts.get(trackKey);
    if (track) track.plays += 1;
    else trackCounts.set(trackKey, { title: play.title, artist, plays: 1 });

    if (play.album) {
      const albumKey = `${artistKey}|${play.album.toLowerCase()}`;
      const album = albumCounts.get(albumKey);
      if (album) album.plays += 1;
      else albumCounts.set(albumKey, { album: play.album, artist, plays: 1 });
    }

    const date = new Date(play.ts);
    byHour[date.getHours()] += 1;
    byWeekday[weekdayIndex(play.ts)] += 1;
    daySet.add(dayKey(play.ts));

    if (play.ts < firstTs) firstTs = play.ts;
    if (play.ts > lastTs) lastTs = play.ts;
  }

  const total = plays.length;
  const topArtists: ArtistTotal[] = Array.from(artistCounts.entries())
    .map(([key, count]) => ({ name: artistNames.get(key) ?? key, plays: count, share: count / total }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 100);

  const topTracks: TrackTotal[] = Array.from(trackCounts.entries())
    .map(([key, value]) => ({ key, title: value.title, artist: value.artist, plays: value.plays }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 100);

  const topAlbums: AlbumTotal[] = Array.from(albumCounts.entries())
    .map(([key, value]) => ({ key, album: value.album, artist: value.artist, plays: value.plays }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 100);

  const byDay = buildDaySeries(plays, firstTs, lastTs);
  const busiestDay = byDay.reduce<DayPoint | null>((best, point) => (!best || point.plays > best.plays ? point : best), null);

  const byHourMax = Math.max(...byHour);
  const byWeekdayMax = Math.max(...byWeekday);

  return {
    plays: total,
    artists: artistCounts.size,
    tracks: trackSet.size,
    albums: albumCounts.size,
    durationMs: total * AVG_TRACK_MS,
    byDay,
    byHour,
    byWeekday,
    topArtists,
    topTracks,
    topAlbums,
    firstTs,
    lastTs,
    streak: longestStreak(daySet),
    currentStreak: currentStreak(daySet),
    busiestDay,
    busiestHour: byHour.indexOf(byHourMax),
    busiestWeekday: byWeekday.indexOf(byWeekdayMax),
    perActiveDay: byDay.length ? total / byDay.length : 0,
  };
}

function longestStreak(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = Array.from(days).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`).getTime();
    const cur = new Date(`${sorted[i]}T00:00:00`).getTime();
    if (Math.round((cur - prev) / DAY_MS) === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function currentStreak(days: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Если сегодня ещё не слушали — серия не обрывается, отсчёт начинается со вчера.
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
