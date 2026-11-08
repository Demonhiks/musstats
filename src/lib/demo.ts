import type { Dataset, Play } from '../types';

interface DemoArtist {
  name: string;
  weight: number;
  album: string;
  tracks: string[];
}

const ARTISTS: DemoArtist[] = [
  {
    name: 'Молчат Дома',
    weight: 9,
    album: 'Этажи',
    tracks: ['Судно (Борис Рижий)', 'Крот', 'Тоска', 'Волны', 'Клетка'],
  },
  {
    name: 'Скриптонит',
    weight: 8,
    album: 'Дом с нормальными явлениями',
    tracks: ['Ламбада', 'Положение', 'Твой первый', 'Мультики', 'Вечно молодой'],
  },
  {
    name: 'Zivert',
    weight: 7,
    album: 'Vinyl #1',
    tracks: ['Life', 'Ещё хочу', 'Зелёные волны', 'Beverly Hills', 'Credo'],
  },
  {
    name: 'Три дня дождя',
    weight: 7,
    album: 'Между нами',
    tracks: ['Демоны', 'По краю', 'Небо', 'Самый грустный', 'Молчи'],
  },
  {
    name: 'The Weeknd',
    weight: 6,
    album: 'After Hours',
    tracks: ['Blinding Lights', 'Save Your Tears', 'After Hours', 'In Your Eyes', 'Alone Again'],
  },
  {
    name: 'Кино',
    weight: 6,
    album: 'Группа крови',
    tracks: ['Группа крови', 'Закрой за мной дверь', 'Война', 'Спокойная ночь', 'Звезда по имени Солнце'],
  },
  {
    name: 'Billie Eilish',
    weight: 5,
    album: 'Happier Than Ever',
    tracks: ['bad guy', 'Happier Than Ever', 'NDA', 'everything i wanted', 'Oxytocin'],
  },
  {
    name: 'Arctic Monkeys',
    weight: 5,
    album: 'AM',
    tracks: ['Do I Wanna Know?', 'R U Mine?', 'Why’d You Only Call Me When You’re High?', '505', 'Arabella'],
  },
  {
    name: 'MACAN',
    weight: 5,
    album: 'Кино',
    tracks: ['Кино', 'Если бы', 'Нагадай', 'Стрелы', 'Мама'],
  },
  {
    name: 'Земфира',
    weight: 5,
    album: 'Прости меня моя любовь',
    tracks: ['Хочешь?', 'Искала', 'Не отпускай', 'Главное', 'Прогулка'],
  },
  {
    name: 'ssshhhiiittt!',
    weight: 4,
    album: 'Твои глаза',
    tracks: ['Твои глаза', 'Печаль', 'Холодно', 'Дом', 'Лето'],
  },
  {
    name: 'Radiohead',
    weight: 4,
    album: 'In Rainbows',
    tracks: ['Weird Fishes', 'Nude', 'Karma Police', 'Creep', '15 Step'],
  },
  {
    name: 'Мияги & Andy Panda',
    weight: 4,
    album: 'Sector',
    tracks: ['Captain', 'Кино', 'Utopia', 'Космос', 'Тишина'],
  },
  {
    name: 'Oxxxymiron',
    weight: 4,
    album: 'Горгород',
    tracks: ['Где нас нет', 'Горгород', 'Дело привычки', 'Полигон', 'Сёстры'],
  },
  {
    name: 'Lana Del Rey',
    weight: 4,
    album: 'Norman Fucking Rockwell!',
    tracks: ['Summertime Sadness', 'Video Games', 'Doin’ Time', 'West Coast', 'Young and Beautiful'],
  },
  {
    name: 'Дельфин',
    weight: 3,
    album: 'Юность',
    tracks: ['Весна', 'Дилер', 'Ночь', 'Серебро', 'Юность'],
  },
  {
    name: 'Хаски',
    weight: 3,
    album: 'Любимые песни',
    tracks: ['Панелька', 'Черным-черно', 'Реванш', 'Пуля-дура', 'Пиф-паф'],
  },
  {
    name: 'Элджей',
    weight: 3,
    album: 'Sayonara',
    tracks: ['Розовое вино', 'Между нами', 'ZEF', 'Автомат', 'Hey, Guys'],
  },
  {
    name: 'Nirvana',
    weight: 3,
    album: 'Nevermind',
    tracks: ['Smells Like Teen Spirit', 'Come as You Are', 'Lithium', 'In Bloom', 'Polly'],
  },
  {
    name: 'IC3PEAK',
    weight: 3,
    album: 'До свидания',
    tracks: ['Плак-плак', 'Сказка', 'До свидания', 'Смерти больше нет', 'Весело и грустно'],
  },
  {
    name: 'Валентин Стрыкало',
    weight: 3,
    album: 'Зеркало',
    tracks: ['Наше лето', 'Кайен', 'Если бы не ты', 'Кино', 'Ты не ты'],
  },
  {
    name: 'The Neighbourhood',
    weight: 2,
    album: 'I Love You.',
    tracks: ['Sweater Weather', 'Daddy Issues', 'Afraid', 'Reflections', 'W.D.Y.W.F.M?'],
  },
];

/** Детерминированный ГПСЧ, чтобы демо-данные выглядели одинаково при каждом запуске. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR_WEIGHTS = [
  0.6, 0.3, 0.2, 0.1, 0.1, 0.2, 0.6, 2.4, 4.2, 3.6, 3.0, 3.2,
  3.4, 3.2, 2.8, 3.0, 3.6, 5.2, 6.4, 6.8, 6.2, 5.0, 3.2, 1.4,
];
const HOUR_TOTAL = HOUR_WEIGHTS.reduce((sum, value) => sum + value, 0);

const SEASON = [1.18, 1.06, 1.0, 0.96, 0.9, 0.84, 0.86, 0.92, 1.04, 1.12, 1.22, 1.28];

function pickHour(rand: () => number): number {
  let roll = rand() * HOUR_TOTAL;
  for (let hour = 0; hour < HOUR_WEIGHTS.length; hour += 1) {
    roll -= HOUR_WEIGHTS[hour];
    if (roll <= 0) return hour;
  }
  return 19;
}

function pickWeighted(rand: () => number): DemoArtist {
  const total = ARTISTS.reduce((sum, artist) => sum + artist.weight, 0);
  let roll = rand() * total;
  for (const artist of ARTISTS) {
    roll -= artist.weight;
    if (roll <= 0) return artist;
  }
  return ARTISTS[ARTISTS.length - 1];
}

/** Генерирует правдоподобную историю за последние два года. */
export function createDemoDataset(days = 730): Dataset {
  const rand = mulberry32(0x5eed_2026);
  const plays: Play[] = [];
  const DAY_MS = 86_400_000;
  const today = new Date();
  today.setHours(23, 59, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    const weekday = date.getDay();
    const weekend = weekday === 0 || weekday === 6 ? 1.45 : weekday === 5 ? 1.2 : 1;
    const season = SEASON[date.getMonth()];

    let count = Math.round((6 + rand() * 10) * weekend * season);
    if (rand() < 0.06) count = Math.max(1, Math.round(count * 0.15));
    if (rand() < 0.03) count = Math.round(count * 1.8);

    for (let i = 0; i < count; i += 1) {
      const hour = pickHour(rand);
      const ts =
        date.getTime() -
        (23 - hour) * 3_600_000 +
        Math.floor(rand() * 60) * 60_000 +
        Math.floor(rand() * 60) * 1000;
      const artist = pickWeighted(rand);
      const trackIndex = rand() < 0.62 ? Math.floor(rand() * Math.min(2, artist.tracks.length)) : Math.floor(rand() * artist.tracks.length);
      plays.push({
        title: artist.tracks[trackIndex],
        artist: artist.name,
        album: artist.album,
        ts,
      });
    }
  }

  plays.sort((a, b) => a.ts - b.ts);
  return {
    version: 1,
    updatedAt: Date.now(),
    source: 'Демо-данные (2 года, 22 артиста)',
    plays,
  };
}
