// src/screens/FinanceScreen.js
import React, { useState, useContext, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { FinanceContext } from '../contexts/FinanceContext';
import ScreenHeader from '../components/ScreenHeader';
import ToggleSwitch from '../components/ToggleSwitch';
import { useTheme, spacing, typography } from '../utils/theme';

const categoryColors = {
  Food: '#FF6B6B',
  Transport: '#4ECDC4',
  Salary: '#45B7D1',
  Bills: '#FFA07A',
  Entertainment: '#9D65E4',
  Other: '#6C757D',
};

const getPeriodRange = (period) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (period) {
    case 'Today':
      return { start: startOfDay, end: endOfDay };
    case 'This Week':
      const firstDayOfWeek = new Date(startOfDay);
      firstDayOfWeek.setDate(startOfDay.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Adjust for week start
      return { start: firstDayOfWeek, end: endOfDay };
    case 'This Year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay };
    case 'This Month':
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay };
  }
};

const AddTransactionModal = ({ visible, onClose, onAdd }) => {
  const theme = useTheme();
  const styles = useStyles(theme);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleAdd = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number for the amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter a description.');
      return;
    }
    const finalCategory = category.trim() || 'Other';
    onAdd({ type, amount: numAmount, description, category: finalCategory });
    setAmount('');
    setDescription('');
    setCategory('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Transaction</Text>
          <ToggleSwitch
            options={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]}
            selected={type}
            onSelect={setType}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.emptyBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Amount"
            placeholderTextColor={theme.colors.subtext}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.emptyBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Description (e.g., Coffee, Paycheck)"
            placeholderTextColor={theme.colors.subtext}
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.emptyBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Category (e.g., Food, Salary)"
            placeholderTextColor={theme.colors.subtext}
            value={category}
            onChangeText={setCategory}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <Text style={{ color: theme.colors.subtext, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={[styles.modalButton, { backgroundColor: theme.colors.accent }]}>
              <Text style={{ color: theme.colors.fabText, fontWeight: '600' }}>Add</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function FinanceScreen({ navigation }) {
  const theme = useTheme();
  const styles = useStyles(theme);
  const { transactions, addTransaction } = useContext(FinanceContext);
  const [period, setPeriod] = useState('This Month');
  const [modalVisible, setModalVisible] = useState(false);

  const financialData = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    const filtered = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= end;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory = {};

    filtered.forEach(tx => {
      const amount = Number(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
        const cat = tx.category || 'Other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amount;
      }
    });

    const pieData = Object.entries(expenseByCategory).map(([key, value]) => ({
      value,
      label: key,
      color: categoryColors[key] || categoryColors.Other,
      text: `${((value / totalExpense) * 100).toFixed(0)}%`,
    }));

    return {
      filteredTransactions: filtered.sort((a,b) => new Date(b.date) - new Date(a.date)),
      totalIncome,
      totalExpense,
      netFlow: totalIncome - totalExpense,
      pieData,
    };
  }, [transactions, period]);


  const renderTransactionItem = ({ item }) => (
    <View style={[styles.txItem, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.txIconContainer, { backgroundColor: item.type === 'income' ? '#D1FAE5' : '#FEE2E2' }]}>
        <Ionicons name={item.type === 'income' ? 'arrow-up' : 'arrow-down'} size={20} color={item.type === 'income' ? '#065F46' : '#991B1B'} />
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txDescription, { color: theme.colors.text }]} numberOfLines={1}>{item.description}</Text>
        <Text style={[styles.txCategory, { color: theme.colors.subtext }]}>{item.category}</Text>
      </View>
      <View>
        <Text style={[styles.txAmount, { color: item.type === 'income' ? '#059669' : '#DC2626' }]}>
          {item.type === 'income' ? '+' : '-'}₹{item.amount.toFixed(2)}
        </Text>
        <Text style={[styles.txDate, { color: theme.colors.subtext }]}>
            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader navigation={navigation} title="Financial Overview" subtitle="Track your income and expenses" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.periodSelector}>
          <ToggleSwitch
            options={[{ key: 'Today' }, { key: 'This Week' }, { key: 'This Month' }, { key: 'This Year' }]}
            selected={period}
            onSelect={setPeriod}
          />
        </View>

        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="arrow-up-circle-outline" size={24} color="#059669" />
              <Text style={[styles.summaryTitle, { color: theme.colors.subtext }]}>Income</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>₹{financialData.totalIncome.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="arrow-down-circle-outline" size={24} color="#DC2626" />
              <Text style={[styles.summaryTitle, { color: theme.colors.subtext }]}>Expenses</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>₹{financialData.totalExpense.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="wallet-outline" size={24} color={theme.colors.accent} />
              <Text style={[styles.summaryTitle, { color: theme.colors.subtext }]}>Net Flow</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: financialData.netFlow >= 0 ? '#059669' : '#DC2626' }]}>
              {financialData.netFlow >= 0 ? '₹' : '-₹'}{Math.abs(financialData.netFlow).toFixed(2)}
            </Text>
          </View>
        </View>

        {financialData.pieData.length > 0 ? (
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expense Breakdown</Text>
            <View style={styles.pieChartWrapper}>
              <PieChart
                data={financialData.pieData}
                donut
                showText
                textColor="white"
                radius={90}
                innerRadius={55}
                textSize={14}
                focusOnPress
                centerLabelComponent={() => (
                    <Text style={{fontSize: 22, color: theme.colors.text, fontWeight: 'bold'}}>
                        ₹{financialData.totalExpense.toFixed(0)}
                    </Text>
                )}
              />
            </View>
          </View>
        ) : financialData.filteredTransactions.length > 0 && (
             <View style={[styles.emptyChartContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="stats-chart-outline" size={40} color={theme.colors.subtext} />
                <Text style={{color: theme.colors.subtext, fontWeight: '500'}}>No expenses to show in chart.</Text>
            </View>
        )}

        <View style={styles.txListContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.sm }]}>Recent Transactions</Text>
             <FlatList
                data={financialData.filteredTransactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransactionItem}
                scrollEnabled={false}
                ListEmptyComponent={() => (
                  <View style={[styles.emptyChartContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Ionicons name="document-text-outline" size={40} color={theme.colors.subtext} />
                    <Text style={{color: theme.colors.subtext, fontWeight: '500', textAlign: 'center'}}>No transactions for this period.</Text>
                  </View>
                )}
              />
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.accent }]} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color={theme.colors.fabText} />
      </TouchableOpacity>

      <AddTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addTransaction}
      />
    </SafeAreaView>
  );
}

const useStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: spacing.md, paddingBottom: 100 },
    periodSelector: { marginBottom: spacing.lg },
    summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.lg },
    summaryCard: { flex: 1, padding: spacing.md, borderRadius: 16, borderWidth: 1 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    summaryTitle: { ...typography.body, fontWeight: '600' },
    summaryAmount: { ...typography.h1, fontWeight: 'bold' },
    sectionTitle: { ...typography.h2, fontWeight: '700' },
    chartContainer: { padding: spacing.md, borderRadius: 16, marginBottom: spacing.lg, alignItems: 'center', borderWidth: 1 },
    emptyChartContainer: { padding: spacing.xl, borderRadius: 16, marginBottom: spacing.lg, alignItems: 'center', borderWidth: 1, justifyContent: 'center', gap: spacing.sm },
    pieChartWrapper: { paddingVertical: spacing.md },
    txListContainer: { marginBottom: spacing.lg },
    txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1 },
    txIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    txDetails: { flex: 1, marginRight: spacing.sm },
    txDescription: { ...typography.body, fontWeight: '600', marginBottom: 2 },
    txCategory: { ...typography.small },
    txAmount: { ...typography.body, fontWeight: '700', textAlign: 'right' },
    txDate: { ...typography.small, textAlign: 'right', marginTop: 2 },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalContent: { width: '100%', borderRadius: 20, padding: spacing.lg, gap: spacing.md },
    modalTitle: { ...typography.h2, fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.sm },
    input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, ...typography.body },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
    modalButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 12 },
});