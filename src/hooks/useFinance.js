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
          if (Array.isArray(parsed)) {
            const validTransactions = parsed.filter(tx => 
              tx && typeof tx.amount === 'number' && !isNaN(tx.amount)
            );
            setTransactions(validTransactions);
          }
        }
      } catch (e) {
        console.warn('Error loading or parsing financial data from AsyncStorage:', e);
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

  const addTransaction = useCallback((newTransactionData) => {
    const amount = parseFloat(newTransactionData.amount);

    if (isNaN(amount) || !newTransactionData.type || !newTransactionData.description) {
      console.error("Validation failed: Attempted to add an invalid transaction.", newTransactionData);
      return;
    }

    const transaction = {
      ...newTransactionData,
      amount: amount,
      id: `tx-${Date.now().toString()}`,
      date: new Date().toISOString(),
    };
    setTransactions(prev => [transaction, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))); // Keep sorted
    console.log('Added transaction:', transaction);
  }, []);
  
  // --- NEW: Function to update an existing transaction ---
  const updateTransaction = useCallback((updatedTransaction) => {
    setTransactions(prev => 
      prev
        .map(tx => (tx.id === updatedTransaction.id ? { ...tx, ...updatedTransaction } : tx))
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Re-sort after update
    );
    console.log('Updated transaction:', updatedTransaction.id);
  }, []);

  // --- NEW: Function to delete a transaction by its ID ---
  const deleteTransaction = useCallback((transactionId) => {
    setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
    console.log('Deleted transaction:', transactionId);
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
    updateTransaction,
    deleteTransaction,
    getTransactions,
    clearAllTransactions,
    financeReady,
  };
}