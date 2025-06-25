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

  // --- NEW: Financial report generator ---
  const getFinancialReport = useCallback((period = 'all time') => {
    // Helper: getPeriodRange - matches logic in tools.js for consistency
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start, end;
    switch (period?.toLowerCase()) {
      case 'today':
        start = startOfDay;
        end = endOfDay;
        break;
      case 'this week':
        const firstDayOfWeek = new Date(startOfDay);
        firstDayOfWeek.setDate(startOfDay.getDate() - now.getDay());
        start = firstDayOfWeek;
        end = endOfDay;
        break;
      case 'this month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = endOfDay;
        break;
      case 'this year':
        start = new Date(now.getFullYear(), 0, 1);
        end = endOfDay;
        break;
      default:
        start = new Date(0);
        end = now;
    }

    // Filter transactions
    const txs = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });

    const incomeTxs = txs.filter(tx => tx.type === 'income');
    const expenseTxs = txs.filter(tx => tx.type === 'expense');

    const totalIncome = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = expenseTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const balance = totalIncome - totalExpense;

    // Group by category
    const incomeByCat = {};
    for (const tx of incomeTxs) {
      incomeByCat[tx.category] = (incomeByCat[tx.category] || 0) + tx.amount;
    }
    const expenseByCat = {};
    for (const tx of expenseTxs) {
      expenseByCat[tx.category] = (expenseByCat[tx.category] || 0) + tx.amount;
    }

    // Build Markdown report
    let report = `# Financial Report (${period.charAt(0).toUpperCase() + period.slice(1)})\n\n`;
    report += `**Total Income:** $${totalIncome.toFixed(2)}\n`;
    report += `**Total Expenses:** $${totalExpense.toFixed(2)}\n`;
    report += `**Net Balance:** $${balance.toFixed(2)}\n\n`;

    // Detailed section
    report += `## Income by Category\n`;
    if (Object.keys(incomeByCat).length === 0) {
      report += 'No income recorded.\n';
    } else {
      for (const [cat, amt] of Object.entries(incomeByCat)) {
        report += `- ${cat}: $${amt.toFixed(2)}\n`;
      }
    }
    report += `\n## Expenses by Category\n`;
    if (Object.keys(expenseByCat).length === 0) {
      report += 'No expenses recorded.\n';
    } else {
      for (const [cat, amt] of Object.entries(expenseByCat)) {
        report += `- ${cat}: $${amt.toFixed(2)}\n`;
      }
    }

    // Optionally, list recent transactions (5 most recent)
    if (txs.length > 0) {
      report += `\n## Recent Transactions\n`;
      txs.slice(0, 5).forEach(tx => {
        report += `- [${tx.type.toUpperCase()}] $${tx.amount.toFixed(2)} | ${tx.category} | ${tx.description} | ${new Date(tx.date).toLocaleString()}\n`;
      });
    }

    return report;
  }, [transactions]);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactions,
    clearAllTransactions,
    financeReady,
    getFinancialReport, // <-- ADDED
  };
}
