import { useState, type DragEvent } from 'react';
import { Card } from './ui';
import { IconChevron, IconUpload } from './icons';

interface ImportViewProps {
  onFiles: (files: File[]) => void;
  onDemo: () => void;
  busy: boolean;
  message: string | null;
  compact?: boolean;
}

export function ImportView({ onFiles, onDemo, busy, message, compact = false }: ImportViewProps) {
  const [dragging, setDragging] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div className={`stack ${compact ? 'stack--compact' : ''}`}>
      <Card className={`drop ${dragging ? 'is-dragging' : ''}`}>
        <label
          className="drop__zone"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".zip,.json,.csv,.tsv,.txt,application/zip,application/json,text/csv"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) onFiles(files);
              event.target.value = '';
            }}
          />
          <span className={`drop__icon ${busy ? 'is-busy' : ''}`} aria-hidden="true">
            <IconUpload />
          </span>
          <span className="drop__title">{busy ? 'Разбираю данные…' : 'Загрузить историю'}</span>
          <span className="drop__hint">
            Перетащи файл сюда или нажми. Подойдут ZIP-архив Яндекс ID, JSON и CSV — Last.fm, Spotify и другие.
          </span>
        </label>
      </Card>

      {message ? <p className="note note--center">{message}</p> : null}

      <div className="row-buttons">
        <button type="button" className="ghost-btn" onClick={onDemo} disabled={busy}>
          Посмотреть на демо-данных
        </button>
      </div>

      <Card className="accordion">
        <button type="button" className="accordion__head" onClick={() => setDetailsOpen((value) => !value)}>
          <span>Где взять историю прослушиваний</span>
          <span className={`accordion__chevron ${detailsOpen ? 'is-open' : ''}`} aria-hidden="true">
            <IconChevron />
          </span>
        </button>
        {detailsOpen ? (
          <div className="accordion__body">
            <div className="source">
              <h3>Яндекс Музыка</h3>
              <p>
                Зайди в <a href="https://id.yandex.ru/personal/data" target="_blank" rel="noreferrer">Яндекс ID → Мои данные</a>,
                запроси архив и скачай его по ссылке из письма. Внутри будет папка с историей музыки — загружай ZIP как есть,
                приложение само найдёт нужный файл.
              </p>
              <p className="source__warn">
                Ограничение Яндекса: в архив попадает только часть последних прослушиваний (у разных аккаунтов — от нескольких
                сотен до пары тысяч треков), а имя исполнителя иногда не выгружается.
              </p>
            </div>
            <div className="source">
              <h3>Last.fm</h3>
              <p>
                Профиль → <a href="https://www.last.fm/settings/data-exports" target="_blank" rel="noreferrer">Data exports</a> →
                экспорт истории. Отдаёт CSV, где дата в Unix-времени — его приложение тоже понимает.
              </p>
            </div>
            <div className="source">
              <h3>Spotify</h3>
              <p>
                Аккаунт → Конфиденциальность → «Скачать ваши данные». В архиве файлы вида{' '}
                <code>Streaming_History_Audio_*.json</code> — подходят напрямую.
              </p>
            </div>
            <p className="source__privacy">
              Всё считается в браузере: ни один файл никуда не отправляется, история лежит только на этом устройстве.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
