export const INTERNAL_UI_LOCALES = ['pt'];
export const BOOT_UI_LOCALE_KEY = 'moonfin_uiLanguage';

export const normalizeUiLocale = (locale) => {
	const normalized = String(locale || 'en-US').trim().replace(/_/g, '-');
	if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(normalized)) return 'en-US';
	const portuguese = /^pt(?:-([a-z]{4}))?(?:-([a-z]{2}|[0-9]{3}))?(?:-.*)?$/i.exec(normalized);
	if (!portuguese) return normalized;
	return portuguese[2]?.toUpperCase() === 'BR' ? 'pt-BR' : 'pt-PT';
};

export const normalizeUiLocaleSettings = (settings) => {
	if (!Object.prototype.hasOwnProperty.call(settings, 'uiLanguage')) return settings;
	const uiLanguage = normalizeUiLocale(settings.uiLanguage);
	return uiLanguage === settings.uiLanguage ? settings : {...settings, uiLanguage};
};

export const uiLocaleChain = (locale) => {
	const [language, region] = normalizeUiLocale(locale).split('-');
	return region ? [language, language + '-' + region] : [language];
};

export const readBootUiLocale = (storage) => {
	let raw = 'en-US';
	try {
	 raw = storage?.getItem(BOOT_UI_LOCALE_KEY) || JSON.parse(storage?.getItem('moonfin_settings') || '{}').uiLanguage || raw;
	} catch (e) { void e; }
	const normalized = normalizeUiLocale(raw);
	if (raw !== normalized) {
	 try { storage?.setItem(BOOT_UI_LOCALE_KEY, normalized); } catch (e) { void e; }
	}
	return normalized;
};
