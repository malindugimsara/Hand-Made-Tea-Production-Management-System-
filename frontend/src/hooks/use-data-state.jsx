'use client';;
import * as React from 'react';

function parseDatasetValue(value) {
  if (value === null) return null;
  if (value === '' || value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function useDataState(key, forwardedRef, onChange) {
  const localRef = React.useRef(null);
  React.useImperativeHandle(forwardedRef, () => localRef.current);

  const getSnapshot = () => {
    const el = localRef.current;
    return el ? parseDatasetValue(el.getAttribute(`data-${key}`)) : null;
  };

  const subscribe = (callback) => {
    const el = localRef.current;
    if (!el) return () => {};
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === `data-${key}`) {
          callback();
          break;
        }
      }
    });
    observer.observe(el, {
      attributes: true,
      attributeFilter: [`data-${key}`],
    });
    return () => observer.disconnect();
  };

  const value = React.useSyncExternalStore(subscribe, getSnapshot);

  React.useEffect(() => {
    if (onChange) onChange(value);
  }, [value, onChange]);

  return [value, localRef];
}

export { useDataState };
