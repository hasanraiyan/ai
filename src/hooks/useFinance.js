// src/hooks/useFinance.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FINANCE_STORAGE_KEY = '@finance_transactions';

export function useFinance() {
  const [transactions, setTransactions] = useState([]);
  const [financeReady, setFinanceReady] = useState(false);

  // Effect to load transactions from storage on mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const storedTransactionsJSON = await AsyncStorage.getItem(FINANCE_STORAGE_KEY);
        if (storedTransactionsJSON !== null) {
          const parsed = JSON.parse(storedTransactionsJSON);
          // --- FIX START: Validate data upon loading from storage ---
          if (Array.isArray(parsed)) {
            const validTransactions = parsed.filter(tx => 
              tx && typeof tx.amount === 'number' && !isNaN(tx.amount)
            );
            setTransactions(validTransactions);
          }
          // --- FIX END ---
        }
      } catch (e) {
        console.warn('Error loading or parsing financial data from AsyncStorage:', e);
        // If parsing fails, start with an empty list to prevent crashes.
        setTransactions([]);
      } finally {
        setFinanceReady(true);
      }
    };
    loadTransactions();
  }, []);

  // Effect to save transactions to storage whenever the list changes
  useEffect(() => {
    if (financeReady) {
      AsyncStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions, financeReady]);

  /**
   * Adds a new transaction to the list, validating the data first.
   */
  const addTransaction = useCallback((newTransactionData) => {
    const amount = parseFloat(newTransactionData.amount);

    if (isNaN(amount) || !newTransactionData.type || !newTransactionData.description) {
      console.error("Validation failed: Attempted to add an invalid transaction.", newTransactionData);
      return; // Stop if data is invalid
    }

    const transaction = {
      ...newTransactionData,
      amount: amount,
      id: `tx-${Date.now().toString()}`,
      date: new Date().toISOString(),
    };
    setTransactions(prev => [transaction, ...prev]);
    console.log('Added transaction:', transaction);
  }, []);
  
  const getTransactions = useCallback(() => {
    return transactions;
  }, [transactions]);

  const clearAllTransactions = useCallback(() => {
    setTransactions([]);
    console.log('All financial data cleared.');
  }, []);

  return {
    transactions,
    addTransaction,
    getTransactions,
    clearAllTransactions,
    financeReady,
  };
}