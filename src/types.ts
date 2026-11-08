/** Одно прослушивание — минимальная единица данных. */
export interface Play {
  /** Название трека */
  title: string;
  /** Исполнитель (может быть пустым, если в источнике его не было) */
  artist: string;
  /** Альбом, если известен */
  album?: string;
  /** Момент прослушивания, мс с эпохи */
  ts: number;
}

/** Компактное представление для хранения: [title, artist, album, ts] */
export type PlayRow = [string, string, string, number];

export interface Dataset {
  version: 1;
  /** Мс, когда данные последний раз обновлялись */
  updatedAt: number;
  /** Откуда пришли данные (для интерфейса) */
  source: string;
  plays: Play[];
}

export type Period = '7d' | '30d' | '90d' | '365d' | 'all' | `y${number}`;

export type Tab = 'overview' | 'tops' | 'activity' | 'year';

export interface ArtistTotal {
  name: string;
  plays: number;
  share: number;
}

export interface TrackTotal {
  key: string;
  title: string;
  artist: string;
  plays: number;
}

export interface AlbumTotal {
  key: string;
  album: string;
  artist: string;
  plays: number;
}

export interface DayPoint {
  /** YYYY-MM-DD */
  day: string;
  ts: number;
  plays: number;
}

export interface Stats {
  plays: number;
  artists: number;
  tracks: number;
  albums: number;
  /** Суммарная оценка времени, мс (3.5 минуты на трек) */
  durationMs: number;
  byDay: DayPoint[];
  byHour: number[];
  byWeekday: number[];
  topArtists: ArtistTotal[];
  topTracks: TrackTotal[];
  topAlbums: AlbumTotal[];
  firstTs: number;
  lastTs: number;
  /** Самая длинная серия дней подряд с прослушиваниями */
  streak: number;
  currentStreak: number;
  busiestDay: DayPoint | null;
  busiestHour: number;
  busiestWeekday: number;
  /** Среднее число прослушиваний в активный день */
  perActiveDay: number;
}
