'use client';;
import * as React from 'react';
import { flushSync } from 'react-dom';

function getSystemEffective() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getClipKeyframes(direction) {
  switch (direction) {
    case 'ltr':
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
    case 'rtl':
      return ['inset(0 0 0 100%)', 'inset(0 0 0 0)'];
    case 'ttb':
      return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
    case 'btt':
      return ['inset(100% 0 0 0)', 'inset(0 0 0 0)'];
    default:
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
  }
}

function ThemeToggler({
  theme,
  resolvedTheme,
  setTheme,
  onImmediateChange,
  direction = 'ltr',
  children,
  ...props
}) {
  const [preview, setPreview] = React.useState(null);
  const [current, setCurrent] = React.useState({
    effective: theme,
    resolved: resolvedTheme,
  });

  React.useEffect(() => {
    if (
      preview &&
      theme === preview.effective &&
      resolvedTheme === preview.resolved
    ) {
      setPreview(null);
    }
  }, [theme, resolvedTheme, preview]);

  const [fromClip, toClip] = getClipKeyframes(direction);

  const toggleTheme = React.useCallback(async (theme) => {
    const resolved = theme === 'system' ? getSystemEffective() : theme;

    setCurrent({ effective: theme, resolved });
    onImmediateChange?.(theme);

    if (theme === 'system' && resolved === resolvedTheme) {
      setTheme(theme);
      return;
    }

    if (!document.startViewTransition) {
      flushSync(() => {
        setPreview({ effective: theme, resolved });
      });
      setTheme(theme);
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        setPreview({ effective: theme, resolved });
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      });
    }).ready;

    document.documentElement
      .animate({ clipPath: [fromClip, toClip] }, {
      duration: 700,
      easing: 'ease-in-out',
      pseudoElement: '::view-transition-new(root)',
    })
      .finished.finally(() => {
        setTheme(theme);
      });
  }, [onImmediateChange, resolvedTheme, fromClip, toClip, setTheme]);

  return (
    <React.Fragment {...props}>
      {typeof children === 'function'
        ? children({
            effective: current.effective,
            resolved: current.resolved,
            toggleTheme,
          })
        : children}
      <style>{`::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>
    </React.Fragment>
  );
}

export { ThemeToggler };
