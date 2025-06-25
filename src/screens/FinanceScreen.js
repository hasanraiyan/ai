// src/screens/FinanceScreen.js
import React, { useState, useContext, useMemo, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput, Alert, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { FinanceContext } from '../contexts/FinanceContext';
import ScreenHeader from '../components/ScreenHeader';
import ToggleSwitch from '../components/ToggleSwitch';
import { useTheme, spacing, typography } from '../utils/theme';

// --- Reusable Components ---
const SectionCard = ({ title, icon, children, containerStyle, onAdd }) => {
    const theme = useTheme(); const styles = useStyles(theme);
    return (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, containerStyle]}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.cardIconContainer, { backgroundColor: theme.colors.accent20 }]}>
                      <Ionicons name={icon} size={18} color={theme.colors.accent} />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
                </View>
                {onAdd && (
                  <TouchableOpacity onPress={onAdd} style={styles.addButton}>
                    <Ionicons name="add" size={24} color={theme.colors.accent} />
                  </TouchableOpacity>
                )}
            </View>
            <View style={styles.cardContent}>{children}</View>
        </View>
    );
};

const EmptyState = ({ icon, title, subtitle }) => {
    const theme = useTheme(); const styles = useStyles(theme);
    return (
        <View style={styles.emptyStateContainer}>
            <Ionicons name={icon} size={28} color={theme.colors.emptyIcon} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>{title}</Text>
            {subtitle && <Text style={[styles.emptyStateSubtitle, { color: theme.colors.subtext }]}>{subtitle}</Text>}
        </View>
    );
};

const AddModal = ({ visible, onClose, onAdd, fields, title }) => {
  const theme = useTheme(); const styles = useStyles(theme);
  const [state, setState] = useState({});

  useEffect(() => { if (visible) setState({}); }, [visible]);

  const handleAdd = () => {
    onAdd(state);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{title}</Text>
          {fields.map(f => (
            <TextInput
              key={f.key}
              style={[styles.input, { backgroundColor: theme.colors.emptyBg, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder={f.placeholder}
              placeholderTextColor={theme.colors.subtext}
              keyboardType={f.keyboard || 'default'}
              value={state[f.key] || ''}
              onChangeText={text => setState(s => ({ ...s, [f.key]: text }))}
            />
          ))}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}><Text style={{ color: theme.colors.subtext, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={[styles.modalButton, { backgroundColor: theme.colors.accent }]}><Text style={{ color: theme.colors.fabText, fontWeight: '600' }}>Add</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};


// --- Helper Functions and Main Component ---

const categoryColors = { Food: '#FF6B6B', Transport: '#4ECDC4', Salary: '#45B7D1', Bills: '#FFA07A', Entertainment: '#9D65E4', Other: '#6C757D' };
const getPeriodRange = (period) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (period) {
    case 'Today': return { start: startOfDay, end: endOfDay };
    case 'This Week': const firstDayOfWeek = new Date(startOfDay); firstDayOfWeek.setDate(startOfDay.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); return { start: firstDayOfWeek, end: endOfDay };
    case 'This Year': return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay };
    case 'This Month': default: return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay };
  }
};

export default function FinanceScreen({ navigation }) {
  const theme = useTheme(); const styles = useStyles(theme);
  const { transactions, addTransaction, budgets, addBudget, goals, addGoal, investments, addInvestment, reminders, addReminder } = useContext(FinanceContext);
  const [period, setPeriod] = useState('This Month');
  const [modal, setModal] = useState({ visible: false, type: '' });

  const financialData = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    const filtered = transactions.filter(t => new Date(t.date) >= start && new Date(t.date) <= end);
    let totalIncome = 0; let totalExpense = 0;
    const expenseByCategory = {};

    filtered.forEach(tx => {
      const amount = Number(tx.amount);
      if (tx.type === 'income') totalIncome += amount;
      else { totalExpense += amount; const cat = tx.category || 'Other'; expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amount; }
    });
    const pieData = Object.entries(expenseByCategory).map(([key, value]) => ({ value, label: key, color: categoryColors[key] || categoryColors.Other, text: `${((value / totalExpense) * 100).toFixed(0)}%` }));
    
    const budgetWithSpending = budgets.map(b => {
      const spent = expenseByCategory[b.category] || 0;
      return { ...b, spent, progress: b.amount > 0 ? (spent / b.amount) : 0 };
    });

    const sortedReminders = reminders.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

    return { filteredTransactions: filtered.sort((a, b) => new Date(b.date) - new Date(a.date)), totalIncome, totalExpense, netFlow: totalIncome - totalExpense, pieData, hasData: filtered.length > 0, budgetWithSpending, sortedReminders };
  }, [transactions, period, budgets, reminders]);


  const openModal = (type) => setModal({ visible: true, type });
  const handleAdd = (data) => {
    switch (modal.type) {
      case 'transaction': addTransaction({ ...data, type: data.type || 'expense', amount: parseFloat(data.amount) }); break;
      case 'budget': addBudget({ ...data, amount: parseFloat(data.amount) }); break;
      case 'goal': addGoal({ ...data, targetAmount: parseFloat(data.targetAmount) }); break;
      case 'investment': addInvestment({ ...data, initialValue: parseFloat(data.initialValue), currentValue: parseFloat(data.currentValue) }); break;
      case 'reminder': addReminder({ ...data, amount: parseFloat(data.amount) }); break;
    }
  };

  const modalConfig = useMemo(() => ({
    transaction: { title: 'New Transaction', fields: [{ key: 'type', placeholder: 'Type (income/expense)' }, { key: 'amount', placeholder: 'Amount', keyboard: 'numeric' }, { key: 'description', placeholder: 'Description' }, { key: 'category', placeholder: 'Category' }] },
    budget: { title: 'New Budget', fields: [{ key: 'category', placeholder: 'Category (e.g., Food)' }, { key: 'amount', placeholder: 'Amount', keyboard: 'numeric' }] },
    goal: { title: 'New Goal', fields: [{ key: 'name', placeholder: 'Goal Name (e.g., Vacation Fund)' }, { key: 'targetAmount', placeholder: 'Target Amount', keyboard: 'numeric' }, { key: 'targetDate', placeholder: 'Target Date (YYYY-MM-DD)' }] },
    investment: { title: 'New Investment', fields: [{ key: 'name', placeholder: 'Investment Name (e.g., Stocks)' }, { key: 'initialValue', placeholder: 'Initial Value', keyboard: 'numeric' }, { key: 'currentValue', placeholder: 'Current Value', keyboard: 'numeric' }] },
    reminder: { title: 'New Bill Reminder', fields: [{ key: 'name', placeholder: 'Bill Name (e.g., Rent)' }, { key: 'amount', placeholder: 'Amount', keyboard: 'numeric' }, { key: 'dueDate', placeholder: 'Due Date (YYYY-MM-DD)' }] },
  }), []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader navigation={navigation} title="Financial Overview" subtitle="Track your income and expenses" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}><ToggleSwitch options={[{ key: 'Today', label: 'Today' }, { key: 'This Week', label: 'Week' }, { key: 'This Month', label: 'Month' }, { key: 'This Year', label: 'Year' }]} selected={period} onSelect={setPeriod} /></View>
        <SectionCard title="Summary" icon="stats-chart-outline">
          
        </SectionCard>
        {financialData.pieData.length > 0 && <SectionCard title="Expense Breakdown" icon="pie-chart-outline">{/* Pie chart content */}</SectionCard>}
        
        <SectionCard title="Budgets" icon="flag-outline" onAdd={() => openModal('budget')}>
          {financialData.budgetWithSpending.length > 0 ? financialData.budgetWithSpending.map(b => (
              <View key={b.id} style={styles.budgetItem}>
                  <View style={styles.budgetInfo}>
                      <Text style={[styles.txDescription, { color: theme.colors.text }]}>{b.category}</Text>
                      <Text style={[styles.txCategory, { color: theme.colors.subtext }]}>Spent â‚¹{b.spent.toFixed(2)} of â‚¹{b.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}><View style={[styles.progressBar, { width: `${Math.min(b.progress * 100, 100)}%` }]} /></View>
              </View>
          )) : <EmptyState icon="flag-outline" title="No Budgets Set" subtitle="Tap '+' to create one." />}
        </SectionCard>
        
        <SectionCard title="Financial Goals" icon="trophy-outline" onAdd={() => openModal('goal')}>
            {goals.length > 0 ? goals.map(g => (
                <View key={g.id} style={[styles.txItem, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.txDetails}><Text style={[styles.txDescription, { color: theme.colors.text }]}>{g.name}</Text><Text style={[styles.txCategory, { color: theme.colors.subtext }]}>Target Date: {g.targetDate}</Text></View>
                    <Text style={[styles.txAmount, { color: theme.colors.accent }]}>â‚¹{g.targetAmount.toFixed(2)}</Text>
                </View>
            )) : <EmptyState icon="trophy-outline" title="No Goals Set" subtitle="Tap '+' to create one." />}
        </SectionCard>

        <SectionCard title="Investments" icon="analytics-outline" onAdd={() => openModal('investment')}>
            {investments.length > 0 ? investments.map(i => {
                const gainLoss = i.currentValue - i.initialValue;
                return (
                    <View key={i.id} style={[styles.txItem, { borderBottomColor: theme.colors.border }]}>
                        <View style={styles.txDetails}><Text style={[styles.txDescription, { color: theme.colors.text }]}>{i.name}</Text><Text style={[styles.txCategory, { color: theme.colors.subtext }]}>Current Value: â‚¹{i.currentValue.toFixed(2)}</Text></View>
                        <Text style={[styles.txAmount, { color: gainLoss >= 0 ? '#059669' : '#DC2626' }]}>{gainLoss >= 0 ? '+' : '-'}â‚¹{Math.abs(gainLoss).toFixed(2)}</Text>
                    </View>
                )
            }) : <EmptyState icon="analytics-outline" title="No Investments Tracked" subtitle="Tap '+' to add one." />}
        </SectionCard>

        <SectionCard title="Bill Reminders" icon="calendar-outline" onAdd={() => openModal('reminder')}>
            {financialData.sortedReminders.length > 0 ? financialData.sortedReminders.map(r => (
                <View key={r.id} style={[styles.txItem, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.txDetails}><Text style={[styles.txDescription, { color: theme.colors.text }]}>{r.name}</Text><Text style={[styles.txCategory, { color: theme.colors.subtext }]}>Due: {r.dueDate}</Text></View>
                    <Text style={[styles.txAmount, { color: theme.colors.text }]}>â‚¹{r.amount.toFixed(2)}</Text>
                </View>
            )) : <EmptyState icon="calendar-outline" title="No Upcoming Bills" subtitle="Tap '+' to add a reminder." />}
        </SectionCard>
        
        <SectionCard title="Transactions" icon="list-outline">{/* Transactions content */}</SectionCard>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.accent }]} onPress={() => openModal('transaction')}><Ionicons name="add" size={32} color={theme.colors.fabText} /></TouchableOpacity>
      <AddModal visible={modal.visible} onClose={() => setModal({ visible: false, type: '' })} onAdd={handleAdd} fields={modalConfig[modal.type]?.fields || []} title={modalConfig[modal.type]?.title || ''} />
    </SafeAreaView>
  );
}

const useStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: spacing.md, paddingBottom: 100 },
    section: { marginBottom: spacing.lg },
    sectionCard: { borderRadius: 20, marginBottom: spacing.lg, borderWidth: 1, },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    addButton: { padding: spacing.xs },
    cardIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', },
    cardTitle: { ...typography.h2, fontWeight: '700' },
    cardContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },

    txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1 },
    txDetails: { flex: 1, marginRight: spacing.sm },
    txDescription: { ...typography.body, fontWeight: '600', marginBottom: 2 },
    txCategory: { ...typography.small },
    txAmount: { ...typography.body, fontWeight: '700' },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
    
    emptyStateContainer: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
    emptyStateTitle: { ...typography.body, fontWeight: '600' },
    emptyStateSubtitle: { ...typography.small, color: theme.colors.subtext, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalContent: { width: '100%', borderRadius: 20, padding: spacing.lg, gap: spacing.md },
    modalTitle: { ...typography.h2, fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.sm },
    input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, ...typography.body },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
    modalButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 12 },

    budgetItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    budgetInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    progressBarContainer: { height: 8, backgroundColor: theme.colors.emptyBg, borderRadius: 4, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 4 },
});