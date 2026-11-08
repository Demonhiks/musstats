/**
 * Проверки парсера истории прослушиваний: запускать `node tools/test-parser.mjs`.
 * Работает без сборщика — Node сам срезает типы с .ts.
 */

import { parseFiles, parseDelimited, parseTs } from '../src/lib/parse.ts';

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${details ? ` — ${details}` : ''}`);
  }
}

function file(name, content) {
  return new File([content], name, { type: 'text/plain' });
}

console.log('\nLast.fm CSV');
{
  const csv = `uts,utc_time,artist,artist_mbid,album,album_mbid,track,track_mbid
1700000000,"14 Nov 2023, 22:13",Кино,,Группа крови,,Группа крови,
1700000100,"14 Nov 2023, 22:15",Кино,,Группа крови,,Закрой за мной дверь,
`;
  const result = await parseFiles([file('lastfm.csv', csv)]);
  check('две записи', result.plays.length === 2, `got ${result.plays.length}`);
  check('артист распознан', result.plays[0]?.artist === 'Кино', JSON.stringify(result.plays[0]));
  check('альбом распознан', result.plays[0]?.album === 'Группа крови');
  check('время из unix-секунд', result.plays[0]?.ts === 1700000000 * 1000, String(result.plays[0]?.ts));
  check('сортировка по времени', result.plays[0].ts <= result.plays[1].ts);
}

console.log('\nSpotify JSON');
{
  const json = JSON.stringify([
    {
      ts: '2023-05-01T10:00:00Z',
      master_metadata_track_name: 'Song A',
      master_metadata_album_artist_name: 'Artist A',
      master_metadata_album_album_name: 'Album A',
      ms_played: 210000,
    },
    {
      ts: '2023-05-01T10:05:00Z',
      master_metadata_track_name: 'Song B',
      master_metadata_album_artist_name: 'Artist B',
      master_metadata_album_album_name: null,
      ms_played: 180000,
    },
  ]);
  const result = await parseFiles([file('Streaming_History_Audio_2023.json', json)]);
  check('две записи', result.plays.length === 2, `got ${result.plays.length}`);
  check('трек распознан', result.plays[0]?.title === 'Song A');
  check('артист распознан', result.plays[0]?.artist === 'Artist A');
  check('без альбома — undefined', result.plays[1]?.album === undefined);
}

console.log('\nВложенный JSON в стиле Яндекс-архива');
{
  const json = JSON.stringify({
    listening_history: [
      {
        track: { title: 'Судно', artists: [{ name: 'Молчат Дома' }, { name: 'Второй' }] },
        album: { title: 'Этажи' },
        timestamp: '2023-05-01T18:20:11+03:00',
      },
      {
        track_name: 'Крот',
        artist_name: 'Молчат Дома',
        date: '2023-05-02',
      },
    ],
  });
  const result = await parseFiles([file('history.json', json)]);
  check('две записи', result.plays.length === 2, `got ${result.plays.length}`);
  check('название из вложенного объекта', result.plays[0]?.title === 'Судно', JSON.stringify(result.plays[0]));
  check('артисты склеены', result.plays[0]?.artist === 'Молчат Дома, Второй', result.plays[0]?.artist);
  check('альбом из объекта', result.plays[0]?.album === 'Этажи');
  check('дата без времени', result.plays.some((play) => play.title === 'Крот'));
}

console.log('\nРусский CSV с точкой с запятой и датой через точку');
{
  const csv = `Исполнитель;Название;Дата
Земфира;Искала;01.05.2023 18:20
Земфира;Хочешь?;02.05.2023
`;
  const result = await parseFiles([file('export.csv', csv)]);
  check('две записи', result.plays.length === 2, `got ${result.plays.length}`);
  check('артист из русской шапки', result.plays[0]?.artist === 'Земфира');
  check('дата 1 мая', new Date(result.plays[0].ts).getDate() === 1, new Date(result.plays[0].ts).toISOString());
}

console.log('\nДедупликация');
{
  const csv = `artist,track,date
A,T,2023-05-01T10:00:00Z
A,T,2023-05-01T10:00:00Z
`;
  const result = await parseFiles([file('dup.csv', csv)]);
  check('дубль схлопнут', result.plays.length === 1, `got ${result.plays.length}`);
}

console.log('\nCSV без шапки');
{
  const csv = `Кино,Группа крови,2023-05-01T10:00:00Z
Кино,Звезда по имени Солнце,2023-05-02T11:00:00Z
`;
  const result = await parseFiles([file('raw.csv', csv)]);
  check('две записи без шапки', result.plays.length === 2, `got ${result.plays.length}`);
}

console.log('\nМусорный файл');
{
  const result = await parseFiles([file('notes.txt', 'просто текст без данных')]);
  check('ничего не найдено', result.plays.length === 0);
  check('есть пояснение', result.notes.length > 0);
}

console.log('\nparseTs');
{
  check('секунды', parseTs(1700000000) === 1700000000 * 1000);
  check('миллисекунды', parseTs(1700000000000) === 1700000000000);
  check('ISO', typeof parseTs('2023-05-01T10:00:00Z') === 'number');
  check('мусор', parseTs('не дата') === null);
  check('ноль', parseTs(0) === null);
}

console.log('\nparseDelimited напрямую');
{
  const parsed = parseDelimited('a,b\n1,2');
  check('разделитель — запятая', parsed.delimiter === ',');
}

console.log(`\nИтого: ${passed} ok, ${failed} fail\n`);
process.exit(failed === 0 ? 0 : 1);
