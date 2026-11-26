// TC-112 (RNF-003): 50 VUs for 5 min on public catalog and order creation.
import { sleep } from 'k6';
import { customerFlow } from './lib.js';

export const options = {
  scenarios: {
    nominal: { executor: 'constant-vus', vus: 50, duration: '5m' },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

// Every iteration browses the catalog and, one time in two, confirms an order.
export default function () {
  customerFlow(0.5);
  sleep(1);
}
