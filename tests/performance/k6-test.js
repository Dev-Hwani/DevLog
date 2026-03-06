import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const PAGE_SIZE = __ENV.PAGE_SIZE ? parseInt(__ENV.PAGE_SIZE, 10) : 10;
const SLEEP_SEC = __ENV.SLEEP ? parseFloat(__ENV.SLEEP) : 1;
const TARGET = (__ENV.TARGET || 'mixed').toLowerCase();
const RANDOM_PAGE = (__ENV.RANDOM_PAGE || 'false').toLowerCase() === 'true';
const MAX_PAGE = __ENV.MAX_PAGE ? parseInt(__ENV.MAX_PAGE, 10) : 100;
const status2xx = new Counter('status_2xx');
const status3xx = new Counter('status_3xx');
const status4xx = new Counter('status_4xx');
const status429 = new Counter('status_429');
const status5xx = new Counter('status_5xx');
const statusOther = new Counter('status_other');
const articlesDuration = new Trend('duration_articles_list');
const detailDuration = new Trend('duration_article_detail');
const trendingDuration = new Trend('duration_trending');
const tagsDuration = new Trend('duration_tags');

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

function recordStatus(response) {
  const status = response?.status;
  if (status >= 200 && status < 300) {
    status2xx.add(1);
    return;
  }
  if (status >= 300 && status < 400) {
    status3xx.add(1);
    return;
  }
  if (status >= 400 && status < 500) {
    status4xx.add(1);
    if (status === 429) {
      status429.add(1);
    }
    return;
  }
  if (status >= 500 && status < 600) {
    status5xx.add(1);
    return;
  }
  statusOther.add(1);
}

function shouldRunArticles() {
  return TARGET === 'mixed' || TARGET === 'articles';
}

function shouldRunDetail() {
  return TARGET === 'mixed' || TARGET === 'detail';
}

function shouldRunTrending() {
  return TARGET === 'mixed' || TARGET === 'trending';
}

function shouldRunTags() {
  return TARGET === 'mixed' || TARGET === 'tags';
}

export default function () {
  let articleId = null;
  const listPage = RANDOM_PAGE
    ? Math.floor(Math.random() * Math.max(MAX_PAGE, 1)) + 1
    : 1;

  if (shouldRunArticles() || shouldRunDetail()) {
    group('articles list', () => {
      const res = http.get(`${BASE_URL}/api/articles?page=${listPage}&size=${PAGE_SIZE}`);
      recordStatus(res);
      articlesDuration.add(res.timings.duration);
      check(res, { 'list 200': (r) => r.status === 200 });
      if (res.status === 200) {
        articleId = pickRandomId(res.json('items'));
      }
    });
  }

  if (shouldRunDetail() && articleId !== null) {
    group('article detail', () => {
      const res = http.get(`${BASE_URL}/api/articles/${articleId}`);
      recordStatus(res);
      detailDuration.add(res.timings.duration);
      check(res, { 'detail 200': (r) => r.status === 200 });
    });
  }

  if (shouldRunTrending()) {
    group('feed trending', () => {
      const res = http.get(`${BASE_URL}/api/feed/trending?range=24h&size=${PAGE_SIZE}`);
      recordStatus(res);
      trendingDuration.add(res.timings.duration);
      check(res, { 'trending 200': (r) => r.status === 200 });
    });
  }

  if (shouldRunTags()) {
    group('tags', () => {
      const res = http.get(`${BASE_URL}/api/tags`);
      recordStatus(res);
      tagsDuration.add(res.timings.duration);
      check(res, { 'tags 200': (r) => r.status === 200 });
    });
  }

  sleep(SLEEP_SEC);
}
