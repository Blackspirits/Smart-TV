import {act, renderHook, waitFor} from '@testing-library/react';

import useBrowseData from './useBrowseData';
import {clearMemoryCache, loadBrowseCache, memoryCache} from './browseCache';

jest.mock('../../services/storage', () => ({
	getFromStorage: async () => null,
	saveToStorage: async () => {},
	removeFromStorage: async () => {}
}));
jest.mock('../../services/connectionPool', () => ({}));
jest.mock('../../services/seerrApi', () => ({}));
jest.mock('../../services/jellyfinApi', () => ({
	HOME_ROW_ITEM_FIELDS: '',
	getServerUrl: () => 'http://server',
	getApiKey: () => 'key',
	getServerType: () => 'jellyfin'
}));
jest.mock('./browseCache', () => {
	const actual = jest.requireActual('./browseCache');
	return {
		...actual,
		loadBrowseCache: jest.fn(),
		saveBrowseCache: jest.fn(),
		clearBrowseCache: jest.fn(async () => {}),
		cancelPendingCacheSave: jest.fn()
	};
});

const empty = async () => ({Items: []});
const api = {
	getLibraries: empty,
	getResumeItems: empty,
	getNextUp: empty,
	getItems: empty,
	getRandomItems: empty,
	getCollectionItems: empty,
	getUserConfiguration: async () => null
};

const props = (accessToken, userId) => ({
	api,
	serverUrl: 'http://server',
	accessToken,
	userId,
	settings: {},
	unifiedMode: false,
	seerrEnabled: false,
	seerrAuthenticated: false,
	recommendationsSupported: false,
	getItemServerUrl: () => 'http://server',
	homeRowsConfig: []
});

// What the previous user left in the stored cache, fresh enough to be served as is.
const previousUserRows = [{id: 'resume', title: 'Continue Watching', items: [{Id: 'theirs'}]}];
const cacheFor = (userId) => ({
	serverUrl: 'http://server',
	userId,
	rowData: previousUserRows,
	libraries: [{Id: 'lib'}],
	featuredItems: [{Id: 'featured'}],
	timestamp: Date.now()
});

const deferred = () => {
	let resolve;
	const promise = new Promise((done) => { resolve = done; });
	return {promise, resolve};
};

beforeEach(() => {
	clearMemoryCache();
	memoryCache.owner = null;
	loadBrowseCache.mockReset();
});

describe('switching users', () => {
	test('rows read for the previous user go once the new user arrives', async () => {
		loadBrowseCache.mockImplementation(async (serverUrl, userId) => (userId === 'user-a' ? cacheFor('user-a') : null));

		// The switch can land the new token a render before the new user, and that render
		// reads whatever the stored cache holds for the user still in hand.
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: props('token-b', 'user-a')});
		await waitFor(() => expect(result.current.allRowData).toEqual(previousUserRows));

		rerender(props('token-b', 'user-b'));
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.allRowData).not.toEqual(previousUserRows);
		expect(loadBrowseCache).toHaveBeenLastCalledWith('http://server', 'user-b');
	});

	test('coming back to the home screen as the same user keeps the rows', async () => {
		loadBrowseCache.mockImplementation(async () => cacheFor('user-a'));

		const {result, unmount} = renderHook((p) => useBrowseData(p), {initialProps: props('token-a', 'user-a')});
		await waitFor(() => expect(result.current.allRowData).toEqual(previousUserRows));
		unmount();

		loadBrowseCache.mockClear();
		const again = renderHook((p) => useBrowseData(p), {initialProps: props('token-a', 'user-a')}).result;
		await waitFor(() => expect(again.current.allRowData).toEqual(previousUserRows));
		expect(loadBrowseCache).not.toHaveBeenCalled();
	});

	test('clears rows and featured items while the new account cache is still loading', async () => {
		const nextCache = deferred();
		loadBrowseCache.mockImplementation((serverUrl, userId) => userId === 'user-a' ? Promise.resolve(cacheFor(userId)) : nextCache.promise);
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: props('token-a', 'user-a')});
		await waitFor(() => expect(result.current.featuredItems).toEqual([{Id: 'featured'}]));

		rerender(props('token-b', 'user-b'));
		expect(result.current.allRowData).toEqual([]);
		expect(result.current.featuredItems).toEqual([]);
		expect(result.current.isLoading).toBe(true);
		await act(async () => nextCache.resolve(null));
		await waitFor(() => expect(result.current.isLoading).toBe(false));
	});

	test('ignores a stored cache response from the previous account', async () => {
		const oldCache = deferred();
		const newRows = [{id: 'resume', items: [{Id: 'mine'}]}];
		loadBrowseCache.mockImplementation((serverUrl, userId) => userId === 'user-a' ? oldCache.promise : Promise.resolve({...cacheFor(userId), rowData: newRows}));
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: props('token-a', 'user-a')});
		await waitFor(() => expect(loadBrowseCache).toHaveBeenCalledWith('http://server', 'user-a'));
		rerender(props('token-b', 'user-b'));
		await waitFor(() => expect(result.current.allRowData).toEqual(newRows));

		await act(async () => oldCache.resolve(cacheFor('user-a')));
		expect(result.current.allRowData).toEqual(newRows);
		expect(memoryCache.rowData).toEqual(newRows);
	});

	test('a late server response cannot restore old rows or finish the new account load', async () => {
		const oldLibraries = deferred();
		const nextCache = deferred();
		const getLibraries = jest.fn(() => oldLibraries.promise);
		const oldApi = {...api, getLibraries, getResumeItems: async () => ({Items: [{Id: 'theirs'}]})};
		loadBrowseCache.mockImplementation((serverUrl, userId) => userId === 'user-a' ? Promise.resolve(null) : nextCache.promise);
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: {...props('token-a', 'user-a'), api: oldApi}});
		await waitFor(() => expect(getLibraries).toHaveBeenCalled());
		rerender(props('token-b', 'user-b'));

		await act(async () => oldLibraries.resolve({Items: [{Id: 'old-library'}]}));
		expect(result.current.allRowData).toEqual([]);
		expect(memoryCache.rowData).toBeNull();
		expect(result.current.isLoading).toBe(true);
		await act(async () => nextCache.resolve(null));
		await waitFor(() => expect(result.current.isLoading).toBe(false));
	});

	test('ignores featured items fetched for the previous account', async () => {
		const oldFeatured = deferred();
		const random = jest.fn(() => oldFeatured.promise);
		loadBrowseCache.mockResolvedValue(null);
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: {...props('token-a', 'user-a'), api: {...api, getRandomItems: random}}});
		await waitFor(() => expect(random).toHaveBeenCalled());
		rerender(props('token-b', 'user-b'));
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => oldFeatured.resolve({Items: [{Id: 'theirs', Type: 'Movie'}]}));
		expect(result.current.featuredItems).toEqual([]);
		expect(memoryCache.featuredItems).toBeNull();
	});

	test('does not reuse the memory cache when the server changes', async () => {
		loadBrowseCache.mockImplementation(async (serverUrl, userId) => serverUrl === 'http://server' ? cacheFor(userId) : null);
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: props('token-a', 'user-a')});
		await waitFor(() => expect(result.current.allRowData).toEqual(previousUserRows));
		rerender({...props('token-a', 'user-a'), serverUrl: 'http://other-server'});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(loadBrowseCache).toHaveBeenLastCalledWith('http://other-server', 'user-a');
		expect(result.current.allRowData).toEqual([]);
	});

	test('ignores an earlier request even after switching back to the same account', async () => {
		const firstCache = deferred();
		const currentRows = [{id: 'resume', items: [{Id: 'current'}]}];
		let visits = 0;
		loadBrowseCache.mockImplementation((serverUrl, userId) => {
			if (userId !== 'user-a') return Promise.resolve(null);
			visits += 1;
			return visits === 1 ? firstCache.promise : Promise.resolve({...cacheFor(userId), rowData: currentRows});
		});
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: props('token-a', 'user-a')});
		await waitFor(() => expect(visits).toBe(1));
		rerender(props('token-b', 'user-b'));
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		rerender(props('token-a', 'user-a'));
		await waitFor(() => expect(result.current.allRowData).toEqual(currentRows));

		await act(async () => firstCache.resolve(cacheFor('user-a')));
		expect(result.current.allRowData).toEqual(currentRows);
		expect(memoryCache.rowData).toEqual(currentRows);
	});

	test('ignores a background refresh from the previous account', async () => {
		const oldResume = deferred();
		loadBrowseCache.mockImplementation(async (serverUrl, userId) => userId === 'user-a' ? cacheFor(userId) : null);
		const {result, rerender} = renderHook((p) => useBrowseData(p), {initialProps: {...props('token-a', 'user-a'), api: {...api, getResumeItems: () => oldResume.promise}}});
		await waitFor(() => expect(result.current.allRowData).toEqual(previousUserRows));
		let refresh;
		act(() => { refresh = result.current.refreshVolatileData(true); });
		rerender(props('token-b', 'user-b'));
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => {
			oldResume.resolve({Items: [{Id: 'old-refresh'}]});
			await refresh;
		});
		expect(result.current.allRowData).toEqual([]);
		expect(memoryCache.rowData).toEqual([]);
	});
});
