import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PAGE_SIZE } from '../constants/listDefaults';
import { buildSearchParams, parseNumberParam } from '../utils/queryParams';

export const useCursorParams = ({ defaultSize = PAGE_SIZE } = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cursor = searchParams.get('cursor') || undefined;
  const size = Math.max(1, parseNumberParam(searchParams.get('size'), defaultSize));

  const canonicalParams = useMemo(
    () => buildSearchParams(searchParams, { cursor, size }),
    [cursor, searchParams, size]
  );

  useEffect(() => {
    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [canonicalParams, searchParams, setSearchParams]);

  const setCursor = useCallback(
    (nextCursor) => {
      setSearchParams(buildSearchParams(searchParams, { cursor: nextCursor, size }));
    },
    [searchParams, setSearchParams, size]
  );

  return { cursor, size, setCursor, searchParams, setSearchParams };
};
