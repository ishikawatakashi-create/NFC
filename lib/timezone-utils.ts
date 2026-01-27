const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJstDate(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

export function getJstDayStart(date: Date = new Date()): Date {
  const jst = toJstDate(date);
  return new Date(
    Date.UTC(
      jst.getUTCFullYear(),
      jst.getUTCMonth(),
      jst.getUTCDate(),
      0,
      0,
      0
    ) - JST_OFFSET_MS
  );
}

export function getJstMonthStart(date: Date = new Date()): Date {
  const jst = toJstDate(date);
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1, 0, 0, 0) -
      JST_OFFSET_MS
  );
}

export function buildJstDate(
  baseDate: Date,
  hours: number,
  minutes: number,
  seconds = 0
): Date {
  const jst = toJstDate(baseDate);
  return new Date(
    Date.UTC(
      jst.getUTCFullYear(),
      jst.getUTCMonth(),
      jst.getUTCDate(),
      hours,
      minutes,
      seconds
    ) - JST_OFFSET_MS
  );
}

