import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { dcaAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txResponse, purchaseResponse] = await Promise.all([
        dcaAPI.getTransactions(),
        dcaAPI.getPurchases(),
      ]);

      if (txResponse.success && txResponse.data) {
        setTransactions(txResponse.data);
      }
      if (purchaseResponse.success && purchaseResponse.data) {
        setPurchases(purchaseResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const styles = createStyles(colors);

  const renderPurchase = ({ item }) => {
    const netCost = item.eurCost - (item.tradingFee || 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardType}>DCA Purchase</Text>
          <Text style={styles.cardDate}>
            {new Date(item.purchaseDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <View>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>{parseFloat(item.btcAmount).toFixed(8)} BTC</Text>
          </View>
          <View>
            <Text style={styles.label}>Cost</Text>
            <Text style={styles.value}>€{netCost.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.value}>€{parseFloat(item.eurPrice).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardType}>Withdrawal</Text>
        <Text style={styles.cardDate}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{parseFloat(item.amount).toFixed(8)} BTC</Text>
        </View>
        <View>
          <Text style={styles.label}>Fee</Text>
          <Text style={styles.value}>{parseFloat(item.transactionFee).toFixed(8)} BTC</Text>
        </View>
      </View>
      <Text style={styles.txId} numberOfLines={1}>
        TX: {item.txid || 'Pending'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const allItems = [
    ...(purchases || []).map(p => ({ ...p, type: 'purchase' })),
    ...(transactions || []).map(t => ({ ...t, type: 'transaction' })),
  ].sort((a, b) => {
    const dateA = new Date(a.purchaseDate || a.timestamp);
    const dateB = new Date(b.purchaseDate || b.timestamp);
    return dateB - dateA;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>
          {allItems.length} total transaction{allItems.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={allItems}
        renderItem={({ item }) =>
          item.type === 'purchase'
            ? renderPurchase({ item })
            : renderTransaction({ item })
        }
        keyExtractor={(item, index) => `${item.type}-${index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  txId: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
