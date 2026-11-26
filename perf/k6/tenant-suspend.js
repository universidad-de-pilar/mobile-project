// TC-180 (RF-035): 100 VUs order in local2 for 5 min; Root suspends local2 at 2 min; local1 must keep p95 < 500 ms.
// Needs the Root credentials in ROOT_EMAIL and ROOT_PASSWORD (no defaults: the root user is not in the seed).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, headers, login, customerFlow, createOrder, cartFrom, getCatalog } from './lib.js';

const SUSPENDED = __ENV.SUSPENDED_TENANT || 'local2';
const SUSPENDED_STORE = __ENV.SUSPENDED_STORE || 'centro';
const SUSPEND_AT_S = 120;
// Orders sent later than this offset from the start must already be rejected; covers the suspend call latency.
const GRACE_S = 5;
const acceptedAfterSuspend = new Rate('accepted_after_suspend');

// 503 is the expected answer of a suspended tenant, not a failure.
const suspendedOk = http.expectedStatuses({ min: 200, max: 299 }, 503);

export const options = {
  scenarios: {
    suspended_tenant: { executor: 'constant-vus', exec: 'suspendedTenant', vus: 100, duration: '5m' },
    other_tenant: { executor: 'constant-vus', exec: 'otherTenant', vus: 20, duration: '5m', tags: { tenant: 'local1' } },
    root: { executor: 'per-vu-iterations', exec: 'root', vus: 1, iterations: 1, startTime: `${SUSPEND_AT_S}s`, maxDuration: '1m' },
  },
  thresholds: {
    'http_req_duration{tenant:local1}': ['p(95)<500'],
    'http_req_failed{tenant:local1}': ['rate<0.01'],
    accepted_after_suspend: ['rate==0'],
  },
};

export function setup() {
  return { startedAt: Date.now() };
}

export function suspendedTenant(data) {
  const catalog = getCatalog(SUSPENDED, SUSPENDED_STORE, { responseCallback: suspendedOk });
  if (catalog.status === 200) {
    const res = createOrder(cartFrom(catalog), SUSPENDED, SUSPENDED_STORE, { responseCallback: suspendedOk });
    if ((Date.now() - data.startedAt) / 1000 > SUSPEND_AT_S + GRACE_S) acceptedAfterSuspend.add(res.status === 201);
  }
  sleep(1);
}

export function otherTenant() {
  customerFlow(0.5, 'local1', 'palermo', { tags: { tenant: 'local1' } });
  sleep(1);
}

export function root() {
  const token = login('admin', __ENV.ROOT_EMAIL, __ENV.ROOT_PASSWORD);
  const auth = headers('admin', { Authorization: `Bearer ${token}` });
  const tenant = http.get(`${BASE_URL}/tenants`, { headers: auth }).json().find((t) => t.slug === SUSPENDED);
  const res = http.post(`${BASE_URL}/tenants/${tenant.tenant_id}/suspend`, null, { headers: auth });
  check(res, { 'suspend 200': (r) => r.status === 200 });

  // No login is accepted after the suspension either.
  const attempt = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: 'nobody@example.test', password: 'irrelevant-1' }),
    { headers: headers(SUSPENDED), responseCallback: suspendedOk });
  check(attempt, { 'login of the suspended tenant is 503': (r) => r.status === 503 });
}
