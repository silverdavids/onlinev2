const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

// Run the real API modules with isolated build variables and an Axios adapter.
// Requests never leave this process and all identities/passwords are synthetic.
function loadApi(env = {}, hostname, overrides = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(compiled, {
      exports,
      process: { env },
      ...(hostname === undefined ? {} : { window: { location: { hostname } } }),
      console,
      require(name) {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name.startsWith('@/')) return load(`${name.slice(2)}.${name.endsWith('Provider') ? 'tsx' : 'ts'}`);
        return require(name);
      },
    }, { filename: file });
    return exports;
  }
  const { apiClient } = load('src/api/apiClient.ts');
  const { authApi } = load('src/api/authApi.ts');
  const requests = [];
  let reply = { status: 200, data: {} };
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    const response = { ...reply, statusText: '', headers: {}, config };
    if (config.validateStatus && !config.validateStatus(response.status)) {
      throw new axios.AxiosError('Request failed', undefined, config, {}, response);
    }
    return response;
  };
  return { load, apiClient, authApi, requests, respond(status, data) { reply = { status, data }; } };
}

const json = value => JSON.parse(JSON.stringify(value));
const session = {
  authenticated: true,
  user: { id: 'test-user', username: 'synthetic-user', email: null, phone: null },
  roles: ['OnlineClient'],
};

test('production login uses the same-origin /api route and cookie credentials', async () => {
  const api = loadApi({ NEXT_PUBLIC_API_BASE_URL: '' }, 'smartbet.ug');
  await api.authApi.login({ username: 'synthetic-user', password: 'synthetic-password' });
  const request = api.requests[0];
  assert.equal(api.apiClient.getUri(request), '/api/Account/Login');
  assert.equal(request.method, 'post');
  assert.equal(request.withCredentials, true);
  assert.equal(request.headers.get('Content-Type'), 'application/json');
  assert.equal(request.headers.get('Authorization'), undefined);
  assert.deepEqual(JSON.parse(request.data), {
    UserName: 'synthetic-user', Password: 'synthetic-password', RememberMe: true,
  });
});

test('production hostname guard rejects stale remote build settings without changing development', () => {
  const env = { NEXT_PUBLIC_API_BASE_URL: 'https://wrong-api.invalid/' };
  for (const hostname of ['smartbet.ug', 'www.smartbet.ug', 'SMARTBET.UG']) {
    assert.equal(loadApi(env, hostname).apiClient.defaults.baseURL, '');
  }
  for (const hostname of ['localhost', 'smartbet.ug.attacker.invalid', 'notsmartbet.ug']) {
    assert.equal(loadApi(env, hostname).apiClient.defaults.baseURL, 'https://wrong-api.invalid');
  }
  assert.equal(loadApi(env).apiClient.defaults.baseURL, 'https://wrong-api.invalid');
});

test('development base and API prefix normalize without double-prefixing routes', async () => {
  const api = loadApi({ NEXT_PUBLIC_API_BASE_URL: ' http://localhost:49191/// ', NEXT_PUBLIC_API_PATH_PREFIX: '/api/' }, 'localhost');
  for (const input of ['/Account/Login', '/api/Account/Login']) {
    await api.apiClient.get(input);
    assert.equal(api.apiClient.getUri(api.requests.at(-1)), 'http://localhost:49191/api/Account/Login');
  }
  const { withApiPathPrefix } = api.load('src/config/env.ts');
  assert.equal(withApiPathPrefix('/api'), '/api');
  assert.equal(withApiPathPrefix('https://service.invalid/odds'), 'https://service.invalid/odds');
  assert.equal(loadApi({ NEXT_PUBLIC_API_TIMEOUT_MS: 'invalid' }).apiClient.defaults.timeout, 20000);
});

test('registration, OTP, password changes and logout share the authenticated backend client', async () => {
  const api = loadApi({}, 'smartbet.ug');
  await api.authApi.register({ phoneNumber: '+256000000000', username: 'synthetic-user', firstName: ' Test ', email: ' ' });
  assert.deepEqual(JSON.parse(api.requests.at(-1).data), {
    Email: null, PhoneNumber: '+256000000000', UserName: 'synthetic-user', FirstName: 'Test',
  });
  const otp = { PhoneNumber: '+256000000000', OtpCode: '000000', NewPassword: 'synthetic-password', ConfirmPassword: 'synthetic-password' };
  await api.authApi.verifyOtpAndSetPassword(otp);
  assert.deepEqual(JSON.parse(api.requests.at(-1).data), otp);
  await api.authApi.changePassword({ UserName: 'synthetic-user', OldPassword: 'old', NewPassword: 'new', ConfirmPassword: 'new' });
  await api.authApi.setNewPassword({ NewPassword: 'new', ConfirmPassword: 'new' });
  await api.authApi.logOff();
  assert.deepEqual(api.requests.map(request => request.url), [
    '/api/Account/Register', '/api/Account/VerifyOtpAndSetPassword',
    '/api/Account/ChangePassWord', '/api/Account/SetNewPassWord', '/api/Account/LogOff',
  ]);
  assert.ok(api.requests.every(request => request.withCredentials && request.method === 'post'));
  await api.apiClient.get('/Account/GetOTP', { params: { phoneNumber: '+256000000000' } });
  assert.equal(api.requests.at(-1).withCredentials, true);
  assert.equal(api.apiClient.getUri(api.requests.at(-1)), '/api/Account/GetOTP?phoneNumber=%2B256000000000');
});

test('session checks preserve cookie credentials and handle anonymous, expired and role-rejected sessions', async () => {
  const api = loadApi({}, 'smartbet.ug');
  api.respond(200, session);
  assert.deepEqual(json(await api.authApi.checkLogin()), session);
  for (const status of [204, 401]) {
    api.respond(status, undefined);
    assert.equal((await api.authApi.checkLogin()).authenticated, false);
  }
  api.respond(200, { authenticated: false, reason: 'not_in_online_role', roles: [] });
  assert.equal((await api.authApi.checkLogin()).reason, 'not_in_online_role');
  assert.ok(api.requests.every(request => request.url === '/api/Account/CheckLogin' && request.withCredentials));
});

test('backend validation and network errors retain actionable error types', async () => {
  const api = loadApi();
  api.respond(400, { Message: 'Invalid input', ModelState: { 'model.UserName': ['Username is required.'] } });
  await assert.rejects(api.authApi.login({ username: '', password: '' }), error => {
    assert.equal(error.code, 'BAD_REQUEST');
    assert.equal(error.status, 400);
    assert.equal(error.message, 'Username is required.');
    return true;
  });
  api.apiClient.defaults.adapter = async config => { throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config); };
  await assert.rejects(api.authApi.checkLogin(), error => error.code === 'NETWORK_ERROR');
});

test('prematch feed remains separate and never sends account cookies', async () => {
  const api = loadApi({ NEXT_PUBLIC_MATCHES_API_BASE_URL: 'https://api-games.smbet.net', NEXT_PUBLIC_MATCHES_API_PATH: '/' }, 'smartbet.ug');
  const { activeMatchesApiClient } = api.load('src/api/activeMatchesApiClient.ts');
  let request;
  activeMatchesApiClient.defaults.adapter = async config => {
    request = config;
    return { status: 200, statusText: 'OK', headers: {}, data: [], config };
  };
  await activeMatchesApiClient.get('/', { withCredentials: true });
  assert.equal(activeMatchesApiClient.getUri(request), 'https://api-games.smbet.net/');
  assert.equal(request.withCredentials, false);
});

function loadProvider() {
  let state;
  const effects = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState(initial) {
      state ??= initial;
      return [state, update => { state = typeof update === 'function' ? update(state) : update; }];
    },
    useEffect: effect => effects.push(effect),
    useCallback: callback => callback,
    useMemo: callback => callback(),
  };
  const api = loadApi({}, 'smartbet.ug', { react });
  const { AuthProvider } = api.load('src/auth/AuthProvider.tsx');
  return { ...api, effects, context: () => AuthProvider({ children: null }).props.value, state: () => state };
}

test('auth provider restores the cookie session, confirms login, and logs out on the server', async () => {
  const provider = loadProvider();
  const context = provider.context();
  provider.respond(200, session);
  provider.effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(provider.state().isAuthenticated, true);
  await context.login({ username: 'synthetic-user', password: 'synthetic-password' });
  assert.equal(provider.state().user.id, 'test-user');
  assert.deepEqual(provider.requests.slice(-2).map(request => request.url), ['/api/Account/Login', '/api/Account/CheckLogin']);
  await context.logout();
  assert.equal(provider.requests.at(-1).url, '/api/Account/LogOff');
  assert.equal(provider.state().isAuthenticated, false);
  assert.equal(provider.state().user, null);
});

test('auth provider refuses to report login success without a confirmed session', async () => {
  const provider = loadProvider();
  const context = provider.context();
  provider.respond(204, undefined);
  await assert.rejects(context.login({ username: 'synthetic-user', password: 'synthetic-password' }), /session could not be confirmed/);
  assert.equal(provider.state().isAuthenticated, false);
});

test('release settings use the same-origin API and retain independent odds and socket origins', () => {
  const workflow = fs.readFileSync('.github/workflows/docker.yml', 'utf8');
  assert.match(workflow, /^\s+NEXT_PUBLIC_API_BASE_URL=\s*$/m);
  assert.match(workflow, /NEXT_PUBLIC_API_WITH_CREDENTIALS=true/);
  assert.match(workflow, /NEXT_PUBLIC_MATCHES_API_BASE_URL=https:\/\/api-games\.smbet\.net/);
  assert.match(workflow, /NEXT_PUBLIC_LIVE_SOCKET_URL=https:\/\/socket\.smbet\.net/);
  assert.match(workflow, /onlinev2:sha-\$\{\{ github.sha \}\}/);
  assert.doesNotMatch(workflow, /docker service update/);
});
