// src/contexts/FinanceContext.js
import React, { createContext } from 'react';
import { useFinance } from '../hooks/useFinance';

export const FinanceContext = createContext();

// Canonical provider to ensure all finance consumers share state
export function FinanceProvider({ children }) {
  const finance = useFinance();
  return (
    <FinanceContext.Provider value={finance}>
      {children}
    </FinanceContext.Provider>
  );
}
