import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_SORT, PAGE_SIZE, SORT_OPTIONS } from '../constants/listDefaults';
import { buildSearchParams, parseNumberParam } from '../utils/queryParams';

export const useListParams = ({
  defaultSort = DEFAULT_SORT,
  defaultSize = PAGE_SIZE,
  includeQuery = false,
} = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseNumberParam(searchParams.get('page'), 1));
  const size = Math.max(1, parseNumberParam(searchParams.get('size'), defaultSize));
  const rawSort = searchParams.get('sort');
  const sort = SORT_OPTIONS.some((option) => option.value === rawSort) ? rawSort : defaultSort;
  const query = includeQuery ? searchParams.get('query') || '' : undefined;

  const canonicalParams = useMemo(() => {
    const updates = { page, size, sort };
    if (includeQuery) {
      updates.query = query;
    }
    return buildSearchParams(searchParams, updates);
  }, [includeQuery, page, query, searchParams, size, sort]);

  useEffect(() => {
    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [canonicalParams, searchParams, setSearchParams]);

  const setPage = useCallback(
    (nextPage) => {
      const updates = { page: nextPage, size, sort };
      if (includeQuery) {
        updates.query = query;
      }
      setSearchParams(buildSearchParams(searchParams, updates));
    },
    [includeQuery, query, searchParams, setSearchParams, size, sort]
  );

  const setSort = useCallback(
    (nextSort) => {
      const updates = { sort: nextSort, page: 1, size };
      if (includeQuery) {
        updates.query = query;
      }
      setSearchParams(buildSearchParams(searchParams, updates));
    },
    [includeQuery, query, searchParams, setSearchParams, size]
  );

  const setQuery = useCallback(
    (nextQuery) => {
      setSearchParams(
        buildSearchParams(searchParams, { query: nextQuery, page: 1, size, sort })
      );
    },
    [searchParams, setSearchParams, size, sort]
  );

  return {
    page,
    size,
    sort,
    query,
    setPage,
    setSort,
    setQuery,
    searchParams,
    setSearchParams,
  };
};
