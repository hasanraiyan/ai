// src/hooks/useFinance.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FINANCE_STORAGE_KEY = '@finance_transactions';
const BUDGET_STORAGE_KEY = '@finance_budgets'; // --- NEW ---

export function useFinance() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({}); // --- NEW ---
  const [financeReady, setFinanceReady] = useState(false);

  // Effect to load transactions and budgets from storage on mount
  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        const [storedTransactionsJSON, storedBudgetsJSON] = await Promise.all([
          AsyncStorage.getItem(FINANCE_STORAGE_KEY),
          AsyncStorage.getItem(BUDGET_STORAGE_KEY) // --- NEW ---
        ]);

        if (storedTransactionsJSON !== null) {
          const parsed = JSON.parse(storedTransactionsJSON);
          if (Array.isArray(parsed)) {
            const validTransactions = parsed.filter(tx => 
              tx && typeof tx.amount === 'number' && !isNaN(tx.amount)
            );
            setTransactions(validTransactions);
          }
        }
        
        // --- NEW: Load budgets ---
        if (storedBudgetsJSON !== null) {
          const parsedBudgets = JSON.parse(storedBudgetsJSON);
          if (typeof parsedBudgets === 'object' && parsedBudgets !== null) {
            setBudgets(parsedBudgets);
          }
        }

      } catch (e) {
        console.warn('Error loading or parsing financial data from AsyncStorage:', e);
        setTransactions([]);
        setBudgets({}); // --- NEW ---
      } finally {
        setFinanceReady(true);
      }
    };
    loadFinanceData();
  }, []);

  // Effect to save transactions to storage whenever the list changes
  useEffect(() => {
    if (financeReady) {
      AsyncStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions, financeReady]);

  // --- NEW: Effect to save budgets ---
  useEffect(() => {
    if (financeReady) {
      AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
    }
  }, [budgets, financeReady]);

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

  // --- NEW: Budget management functions ---
  const setBudget = useCallback((category, amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !category) {
      console.error("Validation failed: Invalid budget data.", { category, amount });
      throw new Error("Invalid budget data provided. Please provide a valid category and a positive number for the amount.");
    }
    setBudgets(prev => ({ ...prev, [category]: numAmount }));
    console.log(`Set budget for ${category}: ${numAmount}`);
  }, []);

  const deleteBudget = useCallback((category) => {
    setBudgets(prev => {
        const newBudgets = { ...prev };
        delete newBudgets[category];
        return newBudgets;
    });
    console.log(`Deleted budget for ${category}`);
  }, []);

  const getBudgets = useCallback(() => {
    return budgets;
  }, [budgets]);
  
  // --- MODIFIED: Clear all financial data ---
  const clearAllFinanceData = useCallback(() => {
    setTransactions([]);
    setBudgets({}); // --- NEW ---
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
    report += `**Total Income:** Rs ${totalIncome.toFixed(2)}\n`;
    report += `**Total Expenses:** Rs ${totalExpense.toFixed(2)}\n`;
    report += `**Net Balance:** Rs ${balance.toFixed(2)}\n\n`;

    // Detailed section
    report += `## Income by Category\n`;
    if (Object.keys(incomeByCat).length === 0) {
      report += 'No income recorded.\n';
    } else {
      for (const [cat, amt] of Object.entries(incomeByCat)) {
        report += `- ${cat}: Rs ${amt.toFixed(2)}\n`;
      }
    }
    report += `\n## Expenses by Category\n`;
    if (Object.keys(expenseByCat).length === 0) {
      report += 'No expenses recorded.\n';
    } else {
      for (const [cat, amt] of Object.entries(expenseByCat)) {
        report += `- ${cat}: Rs ${amt.toFixed(2)}\n`;
      }
    }

    // Optionally, list recent transactions (5 most recent)
    if (txs.length > 0) {
      report += `\n## Recent Transactions\n`;
      txs.slice(0, 5).forEach(tx => {
        report += `- [${tx.type.toUpperCase()}] Rs ${tx.amount.toFixed(2)} | ${tx.category} | ${tx.description} | ${new Date(tx.date).toLocaleString()}\n`;
      });
    }

    return report;
  }, [transactions]);

  return {
    transactions,
    budgets, // --- NEW ---
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactions,
    clearAllFinanceData, // --- MODIFIED ---
    setBudget, // --- NEW ---
    deleteBudget, // --- NEW ---
    getBudgets, // --- NEW ---
    financeReady,
    getFinancialReport, 
  };
}