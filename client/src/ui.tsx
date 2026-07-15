import React, { useState } from 'react';

/**
 * Parse a CSS declaration string (as used verbatim in the design prototype) into a
 * React style object, so design markup can be ported with minimal transformation.
 * e.g. css("padding:30px 38px;color:var(--ink)") -> { padding: "30px 38px", color: "var(--ink)" }
 */
export function css(str: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const part of str.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!key) continue;
    const camel = key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val;
  }
  return out as React.CSSProperties;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { base: string; hover?: string };
export function HoverButton({ base, hover, children, ...rest }: BtnProps) {
  const [h, setH] = useState(false);
  return (
    <button
      {...rest}
      onMouseEnter={(e) => { setH(true); rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setH(false); rest.onMouseLeave?.(e); }}
      style={{ ...css(base), ...(h && hover ? css(hover) : {}) }}
    >
      {children}
    </button>
  );
}

type DivProps = React.HTMLAttributes<HTMLDivElement> & { base: string; hover?: string };
export function HoverDiv({ base, hover, children, ...rest }: DivProps) {
  const [h, setH] = useState(false);
  return (
    <div
      {...rest}
      onMouseEnter={(e) => { setH(true); rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setH(false); rest.onMouseLeave?.(e); }}
      style={{ ...css(base), ...(h && hover ? css(hover) : {}) }}
    >
      {children}
    </div>
  );
}
