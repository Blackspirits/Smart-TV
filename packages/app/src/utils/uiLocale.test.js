import {BOOT_UI_LOCALE_KEY, normalizeUiLocale, normalizeUiLocaleSettings, readBootUiLocale, uiLocaleChain} from './uiLocale';
describe('Portuguese UI locale compatibility', () => {
 test.each(['pt','pt_PT','pt-PT','pt-AO','pt-Latn-PT'])('%s resolves to Portugal',(tag) => {
  expect(normalizeUiLocale(tag)).toBe('pt-PT');expect(uiLocaleChain(tag)).toEqual(['pt','pt-PT']);
 });
 test.each(['pt-BR','pt_BR','pt-br','pt-Latn-BR'])('%s preserves Brazil',(tag) => {
  expect(normalizeUiLocale(tag)).toBe('pt-BR');expect(uiLocaleChain(tag)).toEqual(['pt','pt-BR']);
 });
 test('UI migration leaves audio preferences untouched',() => {
  expect(normalizeUiLocaleSettings({uiLanguage:'pt',audioLanguage:'por',clockDisplay:'24-hour'})).toEqual({uiLanguage:'pt-PT',audioLanguage:'por',clockDisplay:'24-hour'});
 });
 test('boot mirror wins over old async settings and canonicalizes legacy tags',() => {
  const values={[BOOT_UI_LOCALE_KEY]:'pt_BR',moonfin_settings:JSON.stringify({uiLanguage:'pt'})};
  const storage={getItem:key => values[key],setItem:jest.fn()};expect(readBootUiLocale(storage)).toBe('pt-BR');expect(storage.setItem).toHaveBeenCalledWith(BOOT_UI_LOCALE_KEY,'pt-BR');
 });
 test('legacy settings without a boot mirror resolve to Portugal',() => {
  expect(readBootUiLocale({getItem:key => key==='moonfin_settings'?JSON.stringify({uiLanguage:'pt'}):null,setItem:jest.fn()})).toBe('pt-PT');
 });
 test('unavailable or malformed storage cannot block startup',() => {
  expect(readBootUiLocale(null)).toBe('en-US');expect(readBootUiLocale({getItem:() => '{broken'})).toBe('en-US');
 });
});
