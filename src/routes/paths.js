const encodeSegment = (value) => encodeURIComponent(String(value ?? ''));

export const ROUTE_PATHS = {
  home: '/',
  trending: '/trending',
  following: '/following',
  editor: '/editor',
  editorEdit: '/editor/:id',
  tag: '/tag/:name',
  search: '/search',
  article: '/article/:id',
  profile: '/profile/:id',
  login: '/login',
  signup: '/signup',
  notFound: '*',
};

export const buildPath = {
  article: (id) => `/article/${encodeSegment(id)}`,
  editorEdit: (id) => `/editor/${encodeSegment(id)}`,
  tag: (name) => `/tag/${encodeSegment(name)}`,
  profile: (id) => `/profile/${encodeSegment(id)}`,
  search: (query) => `${ROUTE_PATHS.search}?query=${encodeSegment(query)}`,
};
