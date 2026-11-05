"use client";

import { useState } from "react";

// Cursor pagination as the API does it ({ items, nextCursor }): a stack of the cursors that
// led to each page, so "Previous" can go back without offsets. A new resetKey (the filters)
// starts again from the first page.
export function useCursorPages<C = string>(resetKey = "") {
  const [state, setState] = useState<{ key: string; stack: (C | undefined)[] }>({ key: resetKey, stack: [undefined] });
  const stack = state.key === resetKey ? state.stack : [undefined];

  return {
    cursor: stack[stack.length - 1],
    page: stack.length,
    hasPrevious: stack.length > 1,
    next: (cursor: C | null | undefined) => {
      if (cursor) setState({ key: resetKey, stack: [...stack, cursor] });
    },
    previous: () => setState({ key: resetKey, stack: stack.slice(0, -1) }),
  };
}
