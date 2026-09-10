import { apiClient, AUTH_TOKEN_KEY } from './apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('PATCH forwards the Bearer JWT from localStorage, JSON body and response envelope', async () => {
  localStorage.setItem(AUTH_TOKEN_KEY, 'test-jwt');
  const envelope = { data: { display_name: 'New name' }, error: null, meta: null };
  const fetchMock = vi.fn(async () => ({ json: async () => envelope }));
  vi.stubGlobal('fetch', fetchMock);
  expect(await apiClient.patch('/api/v1/users/me', { display_name: 'New name' })).toEqual(envelope);
  const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toContain('/api/v1/users/me');
  expect(options.method).toBe('PATCH');
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-jwt');
  expect(JSON.parse(options.body as string)).toEqual({ display_name: 'New name' });
});
