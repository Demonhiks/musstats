const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

/** Русские склонения: plural(3, 'трек', 'трека', 'треков') → 'трека'. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** 12345 → «12 345» (с неразрывными пробелами, чтобы число не рвалось по строкам). */
export function formatNumber(n: number): string {
  const rounded = Math.round(n);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/** Мс → «128 ч 40 мин», «45 мин», «32 ч». */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${hours} ч`;
  return `${formatNumber(hours)} ч ${minutes} мин`;
}

/** Компактно: 2.4 ч, 128 ч — для крупных цифр на карточках. */
export function formatHoursShort(ms: number): { value: string; unit: string } {
  const hours = ms / 3_600_000;
  if (hours < 1) {
    return { value: String(Math.max(1, Math.round(ms / 60_000))), unit: 'мин' };
  }
  if (hours < 100) {
    const rounded = Math.round(hours * 10) / 10;
    return { value: String(rounded).replace('.', ','), unit: 'ч' };
  }
  return { value: formatNumber(hours), unit: 'ч' };
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatMonth(ts: number): string {
  return MONTHS_SHORT[new Date(ts).getMonth()];
}

export function monthFull(index: number): string {
  return MONTHS_FULL[index] ?? '';
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function percent(share: number): string {
  return `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** «2 дня назад», «сегодня», «12 мар» — для подписей под датами. */
export function relativeDay(ts: number): string {
  const day = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(ts);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / day);
  if (diff <= 0) return 'сегодня';
  if (diff === 1) return 'вчера';
  if (diff < 7) return `${diff} ${plural(diff, 'день', 'дня', 'дней')} назад`;
  return formatShortDate(ts);
}
