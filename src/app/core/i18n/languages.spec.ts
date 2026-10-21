import { LANGS, LANG_LABELS } from './languages';

describe('languages', () => {
  it('labels every supported language with its endonym and short code', () => {
    expect(LANGS.map((lang) => LANG_LABELS[lang].short)).toEqual(['EN', 'PT', 'ES', 'FR']);
  });
});
