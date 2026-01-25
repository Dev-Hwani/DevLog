import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const PAGE_SIZE = __ENV.PAGE_SIZE ? parseInt(__ENV.PAGE_SIZE, 10) : 10;
const SLEEP_SEC = __ENV.SLEEP ? parseFloat(__ENV.SLEEP) : 1;

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS, 10) : 1000,
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function pickRandomId(items) {
  if (!items || items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index].id ?? null;
}

export default function () {
  let articleId = null;

  group('articles list', () => {
    const res = http.get(`${BASE_URL}/api/articles?page=1&size=${PAGE_SIZE}`);
    check(res, { 'list 200': (r) => r.status === 200 });
    if (res.status === 200) {
      articleId = pickRandomId(res.json('items'));
    }
  });

  if (articleId !== null) {
    group('article detail', () => {
      const res = http.get(`${BASE_URL}/api/articles/${articleId}`);
      check(res, { 'detail 200': (r) => r.status === 200 });
    });
  }

  group('feed trending', () => {
    const res = http.get(`${BASE_URL}/api/feed/trending?range=24h&size=${PAGE_SIZE}`);
    check(res, { 'trending 200': (r) => r.status === 200 });
  });

  group('tags', () => {
    const res = http.get(`${BASE_URL}/api/tags`);
    check(res, { 'tags 200': (r) => r.status === 200 });
  });

  sleep(SLEEP_SEC);
}
