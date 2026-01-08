import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dcaAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

// Currency code to symbol mapping (matches server config)
const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'USDT': '₮',
    'USDC': 'USDC',
    'BUSD': 'BUSD',
    'AUD': 'A$',
    'BRL': 'R$',
    'TRY': '₺',
    'TUSD': 'TUSD',
  };
  return symbols[currencyCode] || currencyCode;
};

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMockData, setIsMockData] = useState(false);

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
        setIsMockData(txResponse.isMockData || false);
      }
      if (purchaseResponse.success && purchaseResponse.data) {
        setPurchases(purchaseResponse.data);
        // Update isMockData if either response indicates mock data
        if (purchaseResponse.isMockData) {
          setIsMockData(true);
        }
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
    // Handle both old (eurCost/eurPrice) and new (fiatCost/fiatPrice) field names
    const cost = item.fiatCost !== undefined ? item.fiatCost : (item.eurCost || 0);
    const price = item.fiatPrice !== undefined ? item.fiatPrice : (item.eurPrice || 0);
    const currencySymbol = getCurrencySymbol(item.currency || 'EUR');
    const netCost = cost - (item.tradingFee || 0);

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
            <Text style={styles.value}>{parseFloat(item.btcAmount || 0).toFixed(8)} BTC</Text>
          </View>
          <View>
            <Text style={styles.label}>Cost</Text>
            <Text style={styles.value}>{currencySymbol}{netCost.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.value}>{currencySymbol}{parseFloat(price).toFixed(2)}</Text>
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
          <Text style={styles.value}>{parseFloat(item.amount || 0).toFixed(8)} BTC</Text>
        </View>
        <View>
          <Text style={styles.label}>Fee</Text>
          <Text style={styles.value}>{parseFloat(item.transactionFee || 0).toFixed(8)} BTC</Text>
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
      {isMockData && (
        <View style={styles.mockDataBanner}>
          <Text style={styles.mockDataText}>
            📊 Preview Data - Subscribe to see your real transaction history
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>
          {allItems.length} total transaction{allItems.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.dashboardCard}
        onPress={() => Linking.openURL('https://www.mybitcoindca.com/dashboard')}
        activeOpacity={0.7}
      >
        <View style={styles.dashboardContent}>
          <Ionicons name="bar-chart-outline" size={24} color={colors.primary} />
          <View style={styles.dashboardTextContainer}>
            <Text style={styles.dashboardTitle}>View Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>
              See your DCA performance charts on the web
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

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
  mockDataBanner: {
    backgroundColor: '#FF9800',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockDataText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dashboardCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
