import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { awardsAPI } from '../services/api';

export default function AwardsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [awards, setAwards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAward, setSelectedAward] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchAwards = useCallback(async () => {
    try {
      const response = await awardsAPI.getAwards();
      if (response.success) {
        setAwards(response.awards);
        setCategories(response.categories);
        setStats(response.stats);
      }
    } catch (error) {
      // Failed to fetch awards - will show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAwards();
  }, [fetchAwards]);

  const handleAwardPress = (award) => {
    setSelectedAward(award);
    setShowModal(true);
  };

  const getAwardsByCategory = (categoryId) => {
    return awards.filter(award => award.category === categoryId);
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading awards...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Ionicons name="trophy" size={28} color={colors.secondary} />
            <Text style={styles.statsTitle}>Your Progress</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.unlockedCount}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.percentComplete}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${stats.percentComplete}%` }
              ]}
            />
          </View>
        </View>
      )}

      {/* Categories and Awards */}
      {categories.map(category => {
        const categoryAwards = getAwardsByCategory(category.id);
        const unlockedCount = categoryAwards.filter(a => a.unlocked).length;

        return (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons
                name={category.icon}
                size={22}
                color={colors.secondary}
              />
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={styles.categoryCount}>
                {unlockedCount}/{categoryAwards.length}
              </Text>
            </View>

            <View style={styles.awardsGrid}>
              {categoryAwards.map(award => (
                <TouchableOpacity
                  key={award.id}
                  style={[
                    styles.awardCard,
                    !award.unlocked && styles.awardCardLocked
                  ]}
                  onPress={() => handleAwardPress(award)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.awardIconContainer,
                    award.unlocked && styles.awardIconUnlocked
                  ]}>
                    <Ionicons
                      name={award.icon}
                      size={28}
                      color={award.unlocked ? colors.secondary : colors.textTertiary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.awardName,
                      !award.unlocked && styles.awardNameLocked
                    ]}
                    numberOfLines={2}
                  >
                    {award.name}
                  </Text>
                  {award.unlocked && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.success}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Award Detail Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedAward && (
              <>
                <View style={[
                  styles.modalIconContainer,
                  selectedAward.unlocked && styles.modalIconUnlocked
                ]}>
                  <Ionicons
                    name={selectedAward.icon}
                    size={48}
                    color={selectedAward.unlocked ? colors.secondary : colors.textTertiary}
                  />
                </View>
                <Text style={styles.modalTitle}>{selectedAward.name}</Text>
                <Text style={styles.modalDescription}>
                  {selectedAward.description}
                </Text>
                {selectedAward.unlocked ? (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.unlockedText}>
                      Unlocked {new Date(selectedAward.unlockedAt).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
                    <Text style={styles.lockedText}>Not yet unlocked</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsCard: {
    backgroundColor: colors.cardBackground,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  categorySection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  awardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  awardCard: {
    width: '30%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  awardCardLocked: {
    opacity: 0.6,
  },
  awardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  awardIconUnlocked: {
    backgroundColor: `${colors.secondary}20`,
  },
  awardName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  awardNameLocked: {
    color: colors.textTertiary,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconUnlocked: {
    backgroundColor: `${colors.secondary}20`,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  unlockedText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 8,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  lockedText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
