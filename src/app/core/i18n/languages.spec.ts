import { isLang, matchLang } from './languages';

describe('languages', () => {
  it.each([
    ['en-US', 'en'],
    ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['fr-CA', 'fr'],
    ['ES', 'es'],
    ['de-DE', null],
    ['', null],
    [undefined, null],
  ])('maps %s to %s', (tag, expected) => {
    expect(matchLang(tag)).toBe(expected);
  });

  it('validates supported languages', () => {
    expect(isLang('pt-BR')).toBe(true);
    expect(isLang('pt')).toBe(false);
    expect(isLang(42)).toBe(false);
  });
});
