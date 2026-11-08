import { formatNumber, monthFull } from './format';

const W = 1080;
const H = 1440;
const PAD = 76;
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

export interface YearCardInput {
  year: number;
  plays: number;
  durationMs: number;
  artists: number;
  tracks: number;
  topArtists: { name: string; plays: number }[];
  topTrack?: { title: string; artist: string; plays: number };
  busiestDay?: { label: string; plays: number };
  months: number[];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export function renderYearCard(canvas: HTMLCanvasElement, input: YearCardInput): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Фон
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0B0B0F');
  bg.addColorStop(0.55, '#12101B');
  bg.addColorStop(1, '#1A1224');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W - 60, 40, 10, W - 60, 40, 760);
  glow.addColorStop(0, 'rgba(255, 216, 77, 0.22)');
  glow.addColorStop(0.5, 'rgba(255, 216, 77, 0.05)');
  glow.addColorStop(1, 'rgba(255, 216, 77, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(40, H - 80, 10, 40, H - 80, 620);
  glow2.addColorStop(0, 'rgba(124, 92, 255, 0.22)');
  glow2.addColorStop(1, 'rgba(124, 92, 255, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Бренд
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(245, 245, 247, 0.5)';
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText('MUSSTATS', PAD, 108);

  // Заголовок
  ctx.fillStyle = 'rgba(245, 245, 247, 0.62)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('ИТОГИ ГОДА', PAD, 190);

  ctx.fillStyle = '#FFD84D';
  ctx.font = `800 148px ${FONT}`;
  ctx.fillText(String(input.year), PAD - 6, 330);

  // Часы
  const hours = Math.round(input.durationMs / 3_600_000);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 104px ${FONT}`;
  const hoursLabel = `${formatNumber(hours)} ч`;
  ctx.fillText(hoursLabel, PAD, 486);
  const hoursWidth = ctx.measureText(hoursLabel).width;

  ctx.fillStyle = 'rgba(245, 245, 247, 0.55)';
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText('музыки за год', PAD + hoursWidth + 22, 484);

  // Три метрики
  const metrics: { label: string; value: string }[] = [
    { label: 'прослушиваний', value: formatNumber(input.plays) },
    { label: 'артистов', value: formatNumber(input.artists) },
    { label: 'треков', value: formatNumber(input.tracks) },
  ];
  const colWidth = (W - PAD * 2) / 3;

  metrics.forEach((metric, index) => {
    const x = PAD + index * colWidth;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = `700 58px ${FONT}`;
    ctx.fillText(metric.value, x, 630);
    ctx.fillStyle = 'rgba(245, 245, 247, 0.45)';
    ctx.font = `500 27px ${FONT}`;
    ctx.fillText(metric.label, x, 672);
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 740);
  ctx.lineTo(W - PAD, 740);
  ctx.stroke();

  // Топ-артисты
  ctx.fillStyle = 'rgba(245, 245, 247, 0.5)';
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText('ТОП-АРТИСТЫ', PAD, 800);

  const maxPlays = Math.max(1, input.topArtists[0]?.plays ?? 1);
  input.topArtists.slice(0, 5).forEach((artist, index) => {
    const y = 862 + index * 82;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, PAD, y - 46, W - PAD * 2, 68, 18);
    ctx.fill();

    // Полоса занимает не больше 76% ширины, чтобы цифры всегда оставались на тёмном фоне.
    const barMax = (W - PAD * 2) * 0.76;
    const barWidth = Math.max(6, (barMax * artist.plays) / maxPlays);
    const barGradient = ctx.createLinearGradient(PAD, 0, PAD + barWidth, 0);
    barGradient.addColorStop(0, 'rgba(255, 216, 77, 0.30)');
    barGradient.addColorStop(1, 'rgba(255, 216, 77, 0.10)');
    ctx.fillStyle = barGradient;
    roundRect(ctx, PAD, y - 46, barWidth, 68, 18);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 216, 77, 0.9)';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(String(index + 1), PAD + 22, y - 2);

    ctx.fillStyle = '#F5F5F7';
    ctx.font = `600 40px ${FONT}`;
    const name = fitText(ctx, artist.name, W - PAD * 2 - 300);
    ctx.fillText(name, PAD + 66, y - 2);

    ctx.fillStyle = 'rgba(245, 245, 247, 0.5)';
    ctx.font = `500 32px ${FONT}`;
    const value = formatNumber(artist.plays);
    const valueWidth = ctx.measureText(value).width;
    ctx.fillText(value, W - PAD - 24 - valueWidth, y - 2);
  });

  // Активность по месяцам
  const chartTop = 1222;
  const chartHeight = 92;
  const maxMonth = Math.max(1, ...input.months);
  const monthWidth = (W - PAD * 2) / 12;

  input.months.forEach((value, index) => {
    const x = PAD + index * monthWidth + 4;
    const height = Math.max(5, (value / maxMonth) * chartHeight);
    const isMax = value === maxMonth;
    ctx.fillStyle = isMax ? 'rgba(255, 216, 77, 0.92)' : 'rgba(255, 255, 255, 0.16)';
    roundRect(ctx, x, chartTop + chartHeight - height, monthWidth - 10, height, 6);
    ctx.fill();

    ctx.fillStyle = isMax ? 'rgba(255, 216, 77, 0.9)' : 'rgba(245, 245, 247, 0.32)';
    ctx.font = `500 21px ${FONT}`;
    ctx.fillText(monthFull(index).slice(0, 3), x + 1, chartTop + chartHeight + 30);
  });

  // Подвал
  ctx.fillStyle = 'rgba(245, 245, 247, 0.42)';
  ctx.font = `500 26px ${FONT}`;
  const footnote = input.busiestDay
    ? `Самый громкий день — ${input.busiestDay.label}: ${formatNumber(input.busiestDay.plays)} прослушиваний`
    : 'Собрано на MusStats';
  ctx.fillText(fitText(ctx, footnote, W - PAD * 2), PAD, 1402);
}

/** Делится картинкой через Web Share API, иначе скачивает файл. */
export async function shareYearCard(canvas: HTMLCanvasElement, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Не удалось собрать картинку');

  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Итоги года' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
