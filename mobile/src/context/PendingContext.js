import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usersAPI } from '../services/api';

const PendingContext = createContext({ count: 0, refresh: () => {} });

export function PendingProvider({ children }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const list = await usersAPI.pending();
      setCount(Array.isArray(list) ? list.length : 0);
    } catch {
      // silently ignore — badge just won't show
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PendingContext.Provider value={{ count, refresh }}>
      {children}
    </PendingContext.Provider>
  );
}

export function usePending() {
  return useContext(PendingContext);
}
