// src/screens/FinanceScreen.js

import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { FinanceContext } from '../contexts/FinanceContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { improveDescription } from '../agents/descriptionAgent';
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';
import ToggleSwitch from '../components/ToggleSwitch';

// --- NEW: Restructured categories for dynamic display ---
const transactionCategories = {
  expense: [
    { key: 'Food', label: 'Food', icon: 'fast-food-outline', color: '#F59E0B' },
    { key: 'Transport', label: 'Transport', icon: 'bus-outline', color: '#3B82F6' },
    { key: 'Shopping', label: 'Shopping', icon: 'cart-outline', color: '#8B5CF6' },
    { key: 'Bills', label: 'Bills', icon: 'document-text-outline', color: '#EF4444' },
    { key: 'Entertainment', label: 'Entertainment', icon: 'film-outline', color: '#EC4899' },
    { key: 'Health', label: 'Health', icon: 'medkit-outline', color: '#10B981' },
    { key: 'Other', label: 'Other', icon: 'apps-outline', color: '#64748B' },
  ],
  income: [
    { key: 'Salary', label: 'Salary', icon: 'cash-outline', color: '#22C55E' },
    { key: 'Freelance', label: 'Freelance', icon: 'briefcase-outline', color: '#34D399' },
    { key: 'Bonus', label: 'Bonus', icon: 'gift-outline', color: '#A78BFA' },
    { key: 'Investment', label: 'Investment', icon: 'trending-up-outline', color: '#60A5FA' },
    { key: 'Other', label: 'Other', icon: 'apps-outline', color: '#64748B' },
  ]
};

// Helper to find category info from the new structure
const getCategoryInfo = (key) => {
  const allCategories = [...transactionCategories.expense, ...transactionCategories.income];
  return allCategories.find(c => c.key === key) || transactionCategories.expense.find(c => c.key === 'Other');
};


// --- UPDATED: CategorySelector is now context-aware ---
const CategorySelector = ({ type, selectedCategory, onSelect }) => {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const categoriesToShow = transactionCategories[type] || [];

  return (
    <View style={styles.categoryGrid}>
      {categoriesToShow.map(cat => {
        const isSelected = cat.key === selectedCategory;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, isSelected && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => onSelect(cat.key)}
          >
            <Ionicons name={cat.icon} size={20} color={isSelected ? '#fff' : cat.color} />
            <Text style={[styles.categoryChipText, isSelected && { color: '#fff' }]}>{cat.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  );
};

const TransactionInputModal = ({ visible, onClose, onSave, transaction }) => {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const isEditMode = !!transaction;
  const [type, setType] = useState(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(transaction?.category || 'Food');
  const canSave = amount && description && category;
  const [isImproving, setIsImproving] = useState(false);
  const { apiKey, agentModelName } = useContext(SettingsContext);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDescription(transaction.description);
      setCategory(transaction.category);
    } else {
      setType('expense');
      setAmount('');
      setDescription('');
      setCategory('Food');
    }
  }, [transaction]);


  const handleImproveDescription = useCallback(async () => {
    if (!description.trim() || isImproving) return;
    if (!apiKey) {
      return Alert.alert(
        "API Key Required",
        "Please set your Google AI API Key in Settings to use this feature."
      );
    }
    setIsImproving(true);
    try {
      const result = await improveDescription(apiKey, agentModelName, description);
      if (result.success) {
        setDescription(result.description);
      } else {
        Alert.alert("Improvement Failed", result.reason || "Could not improve the description.");
      }
    } catch (error) {
      console.error("Description improvement error:", error);
      Alert.alert("Error", "An unexpected error occurred while improving the description.");
    } finally {
      setIsImproving(false);
    }
  }, [description, isImproving, apiKey, agentModelName]);
  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number for the amount.");
      return;
    }
    onSave({ id: transaction?.id, type, amount: numAmount, description, category, date: transaction?.date || new Date().toISOString() });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isEditMode ? 'Edit' : 'Add'} Transaction</Text>
            <ToggleSwitch
              options={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]}
              selected={type}
              onSelect={(newType) => {
                setType(newType);
                // Set a sensible default category when type changes
                setCategory(newType === 'income' ? 'Salary' : 'Food');
              }}
              indicatorColors={type === 'income' ? ['#10B981'] : ['#EF4444']}
            />
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.subtext }]}>Amount</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., 15.50"
                placeholderTextColor={colors.subtext}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.subtext }]}>Description</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., Lunch with team"
                  placeholderTextColor={colors.subtext}
                  value={description}
                  onChangeText={setDescription}
                />
                {description.trim().length > 0 && (
                  <TouchableOpacity style={styles.improveButton} onPress={handleImproveDescription} disabled={isImproving}>
                    {isImproving
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Ionicons name="sparkles-outline" size={22} color={colors.accent} />}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={[styles.categoryHeader, { color: colors.text }]}>Category</Text>
            <CategorySelector type={type} selectedCategory={category} onSelect={setCategory} />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.border }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={[styles.saveButtonText, { color: canSave ? '#fff' : colors.subtext }]}>Save Transaction</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const SummaryCard = ({ title, value, icon, color }) => {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const formattedValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.summaryIconContainer, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.summaryTitle, { color: colors.subtext }]}>{title}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formattedValue}</Text>
    </View>
  );
};

export default function FinanceScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useContext(FinanceContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const stats = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.type === 'income') acc.income += tx.amount;
        else acc.expenses += tx.amount;
        return acc;
      }, { income: 0, expenses: 0 }
    );
  }, [transactions]);

  const pieChartData = useMemo(() => {
    const expenseData = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => {
        const category = tx.category || 'Other';
        acc[category] = (acc[category] || 0) + tx.amount;
        return acc;
      }, {});

    return Object.entries(expenseData).map(([category, amount]) => ({
      value: amount,
      label: category,
      color: getCategoryInfo(category).color || '#64748B'
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  const groupedTransactions = useMemo(() => {
    const groups = transactions.reduce((acc, tx) => {
      const date = new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!acc[date]) acc[date] = [];
      acc[date].push(tx);
      return acc;
    }, {});
    return Object.entries(groups).flatMap(([date, txs]) => [{ type: 'header', date }, ...txs.map(tx => ({ type: 'item', data: tx }))]);
  }, [transactions]);

  const handleSave = (data) => {
    if (data.id) {
      updateTransaction(data);
    } else {
      addTransaction(data);
    }
  };

  const handleLongPress = (tx) => {
    Alert.alert(
      `"${tx.description}"`,
      "What would you like to do with this transaction?",
      [
        {
          text: "Edit",
          onPress: () => {
            setSelectedTransaction(tx);
            setModalVisible(true);
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Deletion",
              "Are you sure you want to permanently delete this transaction?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteTransaction(tx.id) }
              ]
            );
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const renderTransactionItem = ({ item }) => {
    if (item.type === 'header') {
      return <Text style={[styles.dateHeader, { color: colors.subtext }]}>{item.date}</Text>
    }
    const tx = item.data;
    const categoryInfo = getCategoryInfo(tx.category);

    return (
      <Pressable
        style={({ pressed }) => [styles.txRow, { backgroundColor: pressed ? colors.emptyBg : colors.card, borderLeftColor: categoryInfo.color }]}
        onLongPress={() => handleLongPress(tx)}
      >
        <View style={styles.txDetails}>
          <Text style={[styles.txDescription, { color: colors.text }]}>{tx.description}</Text>
          <View style={styles.txCategoryContainer}>
            <Ionicons name={categoryInfo.icon} size={14} color={categoryInfo.color} />
            <Text style={[styles.txCategory, { color: categoryInfo.color }]}>{tx.category}</Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: tx.type === 'income' ? '#10B981' : '#EF4444' }]}>
          {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader navigation={navigation} title="Finance" subtitle="Manual Management" />
      <FlatList
        data={groupedTransactions}
        keyExtractor={(item) => item.type === 'header' ? item.date : item.data.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard title="Total Income" value={stats.income} icon="arrow-up-circle-outline" color="#10B981" />
              <SummaryCard title="Total Expenses" value={stats.expenses} icon="arrow-down-circle-outline" color="#EF4444" />
            </View>
            {pieChartData.length > 0 && (
              <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Breakdown</Text>
                <View style={styles.pieChartWrapper}>
                  <PieChart data={pieChartData} donut radius={70} innerRadius={40} />
                </View>
              </View>
            )}
            <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: spacing.md, marginTop: spacing.lg }]}>History</Text>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={60} color={colors.subtext} />
            <Text style={styles.emptyText}>No transactions yet. Tap the '+' button to add one.</Text>
          </View>
        )}
      />
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => { setSelectedTransaction(null); setModalVisible(true); }}>
        <Ionicons name="add-outline" size={32} color="#fff" />
      </TouchableOpacity>
      <TransactionInputModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSave} transaction={selectedTransaction} />
    </SafeAreaView>
  );
}

const useStyles = ({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContainer: { paddingBottom: 100 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summaryCard: { flex: 1, padding: spacing.md, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  summaryIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  summaryTitle: { ...typography.small, fontWeight: '500' },
  summaryValue: { ...typography.h2, fontWeight: 'bold', marginTop: spacing.xs },
  chartContainer: { margin: spacing.md, padding: spacing.md, borderRadius: 16, borderWidth: 1 },
  sectionTitle: { ...typography.h2, fontWeight: 'bold' },
  pieChartWrapper: { alignItems: 'center', marginVertical: spacing.lg },
  dateHeader: { ...typography.body, fontWeight: 'bold', marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: 12, borderLeftWidth: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  txDetails: { flex: 1, marginRight: spacing.sm },
  txDescription: { ...typography.h4, fontWeight: '600' },
  txCategoryContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start' },
  txCategory: { ...typography.small, fontWeight: '600' },
  txAmount: { ...typography.body, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { ...typography.body, color: colors.subtext, marginTop: spacing.md, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingTop: spacing.md },
  modalTitle: { ...typography.h2, fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.lg },
  input: { backgroundColor: colors.emptyBg, borderRadius: 10, padding: 14, fontSize: 16, marginTop: spacing.md },
  categoryHeader: { ...typography.h4, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, gap: 6 },
  categoryChipText: { ...typography.small, fontWeight: '600' },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: spacing.lg },
  inputContainer: { marginTop: spacing.md },
  inputLabel: { ...typography.small, fontWeight: '600', marginBottom: -spacing.sm, marginLeft: spacing.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  improveButton: { padding: 10, marginTop: spacing.md },
  categoryHeader: { ...typography.h4, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm, marginLeft: spacing.xs },
});