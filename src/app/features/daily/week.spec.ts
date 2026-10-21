import { dayState, formatDate, weekOf } from './week';

const TODAY_DATE = '2026-10-21';

describe('week helpers', () => {
  it('builds Monday-to-Sunday weeks across month ends', () => {
    expect(weekOf('2026-10-21')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    expect(weekOf('2026-11-01')[0]).toBe('2026-10-26');
  });

  it('classifies days and formats dates in UTC', () => {
    expect(dayState('2026-10-20', TODAY_DATE, true)).toBe('done');
    expect(dayState(TODAY_DATE, TODAY_DATE, true)).toBe('done');
    expect(dayState(TODAY_DATE, TODAY_DATE, false)).toBe('today');
    expect(dayState('2026-10-20', TODAY_DATE, false)).toBe('missed');
    expect(dayState('2026-10-22', TODAY_DATE, false)).toBe('future');
    expect(formatDate('2026-01-01', 'en', { month: 'short', day: 'numeric' })).toBe('Jan 1');
  });
});
