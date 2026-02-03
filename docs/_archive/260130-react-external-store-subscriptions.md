# React External Store Subscriptions

**Date:** 2026-01-30  
**Status:** Mandatory pattern

## Rule

Use `useSyncExternalStore` for external store subscriptions. Never use useState + useEffect.

## Why

The useState + useEffect pattern for subscriptions is an antipattern:

1. Extra render cycle (init → effect → setState → re-render)
2. Breaks under concurrent rendering (stale values during transitions)
3. Error-prone cleanup/setup dance
4. Violates "don't set state in effects" principle

## Bad

```tsx
const [isConnected, setIsConnected] = useState(() => isAppConnected('rickroll'));

useEffect(() => {
  const unsubscribe = subscribeConnectedApps(() => {
    setIsConnected(isAppConnected('rickroll')); // setState in effect - NO
  });
  return unsubscribe;
}, []);
```

## Good

```tsx
import { useSyncExternalStore } from 'react';

const getIsRickrollConnected = () => isAppConnected('rickroll');

const isConnected = useSyncExternalStore(subscribeConnectedApps, getIsRickrollConnected);
```

## When to use useSyncExternalStore

- localStorage/sessionStorage subscriptions
- Browser APIs (online/offline, media queries, resize)
- Custom pub/sub or event emitter systems
- Any external mutable data source

## When NOT needed

- React state/context (already integrated)
- Libraries with React hooks (SWR, TanStack Query, Zustand, Jotai)
- One-time reads (no subscription needed)

## Reference

**Official React Documentation:**  
https://react.dev/reference/react/useSyncExternalStore

> `useSyncExternalStore` is a React Hook that lets you subscribe to an external store.
> 
> Most of your React components will only read data from their props, state, and context. However, sometimes a component needs to read some data from some store outside of React that changes over time. This includes:
> - Third-party state management libraries that hold state outside of React.
> - Browser APIs that expose a mutable value and events to subscribe to its changes.
