// Stress cases of RNF-003 (docs/indicadores.md).
//   SCENARIO=load (default): 200 VUs on catalog/orders plus 100 screens polling every 30 s, 5 min.
//   SCENARIO=breakpoint (TC-188): 50, 100, 200 and 400 VUs in 3 min steps, then recovery at 50 VUs.
import { sleep } from 'k6';
import { customerFlow, ensureScreens, pollPlaylist } from './lib.js';

const SCENARIO = __ENV.SCENARIO || 'load';
const SCREENS = Number(__ENV.SCREENS || 100);

const step = (vus, startTime, stage, duration = '3m') => ({
  executor: 'constant-vus', exec: 'customers', vus, duration, startTime, tags: { stage },
});

const load = {
  customers: { executor: 'constant-vus', exec: 'customers', vus: 200, duration: '5m' },
  // 10 polls at 30 s intervals: 5 min of one screen each.
  screens: { executor: 'per-vu-iterations', exec: 'screens', vus: SCREENS, iterations: 10, maxDuration: '6m' },
};

const breakpoint = {
  s50: step(50, '0s', 's50'),
  s100: step(100, '3m', 's100'),
  s200: step(200, '6m', 's200'),
  s400: step(400, '9m', 's400'),
  recovery_grace: step(50, '12m', 'grace', '2m'),
  recovery: step(50, '14m', 'recovery', '2m'),
};

// Up to 200 VUs the targets must hold; at 400 only the process surviving matters (no threshold);
// the recovery step is judged after 2 min of grace.
const stageThresholds = Object.fromEntries(
  ['s50', 's100', 's200', 'recovery'].flatMap((s) => [
    [`http_req_duration{stage:${s}}`, ['p(95)<500']],
    [`http_req_failed{stage:${s}}`, ['rate<0.01']],
  ]),
);

export const options = {
  scenarios: SCENARIO === 'breakpoint' ? breakpoint : load,
  thresholds: SCENARIO === 'breakpoint'
    ? stageThresholds
    : { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.01'], checks: ['rate>0.99'] },
};

export function setup() {
  return SCENARIO === 'breakpoint' ? {} : { tokens: ensureScreens(SCREENS) };
}

export function customers() {
  customerFlow(0.1);
  sleep(1);
}

// One screen per VU, polling with If-None-Match as the player does.
const state = {};
export function screens(data) {
  pollPlaylist(data.tokens[(__VU - 1) % data.tokens.length], state);
  sleep(30);
}
