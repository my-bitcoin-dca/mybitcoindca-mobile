import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { COUNTRIES, getAvailableExchanges, getCountryFlag } from '../config/countries';
import storage from '../utils/storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 'country',
    type: 'country_select',
    icon: 'globe-outline',
    title: 'Select Your Country',
    description: '',
  },
  {
    id: '1',
    icon: 'calculator-outline',
    title: 'What is DCA?',
    description: 'Dollar Cost Averaging (DCA) is an investment strategy where you invest a fixed amount at regular intervals, regardless of price. This reduces the impact of volatility and removes the stress of timing the market.',
  },
  {
    id: '2',
    icon: 'trending-up',
    title: 'Automate Your Investing',
    description: 'With My Bitcoin DCA Set up Dollar Cost Averaging strategies that enable one-click trades on your schedule. Build wealth consistently without the emotional decision-making.',
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    title: 'You Stay in Control',
    description: 'Your API keys never leave your device. Every trade/withdrawal requires your explicit approval via push notification. No surprises.',
  },
  {
    id: '4',
    icon: 'swap-horizontal',
    title: 'Connect Your Exchange',
    description: 'Works with Kraken and Binance. Simply add your API keys with permissions and start automating your DCA strategy.',
  },
  {
    id: '5',
    icon: 'notifications',
    title: 'Approve with a Tap',
    description: 'When it\'s time to trade, you\'ll receive a notification. Review the details and approve or reject with a single tap. It\'s that simple.',
  },
  {
    id: '6',
    icon: 'book-outline',
    title: 'Need Help?',
    description: 'Visit our website at mybitcoindca.com for detailed guides, FAQs, and support. We\'re here to help you on your DCA journey.',
  },
];

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = async () => {
    if (currentIndex < slides.length - 1) {
      // If on country selection, save the country before proceeding
      if (currentIndex === 0 && selectedCountry) {
        await storage.setItem('user_country', selectedCountry);
      }
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const scrollToPrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
    }
  };

  const completeOnboarding = () => {
    navigation.replace('Disclaimer');
  };

  const handleCountrySelect = (countryCode) => {
    setSelectedCountry(countryCode);
  };

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCountryItem = ({ item }) => {
    const exchanges = getAvailableExchanges(item.code);
    const isSelected = selectedCountry === item.code;
    const hasExchanges = exchanges.length > 0;

    return (
      <TouchableOpacity
        style={[
          styles.countryItem,
          isSelected && styles.countryItemSelected,
          !hasExchanges && styles.countryItemDisabled,
        ]}
        onPress={() => hasExchanges && handleCountrySelect(item.code)}
        disabled={!hasExchanges}
      >
        <Text style={styles.countryFlag}>{getCountryFlag(item.code)}</Text>
        <Text style={[
          styles.countryName,
          isSelected && styles.countryNameSelected,
          !hasExchanges && styles.countryNameDisabled,
        ]}>
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    // Special rendering for country selection slide
    if (item.type === 'country_select') {
      return (
        <View style={styles.slide}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={64} color={colors.primary} />
            </View>
          </Animated.View>
          <Animated.View style={{ opacity, width: '100%' }}>
            <Text style={styles.title}>{item.title}</Text>
          </Animated.View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.countryListContainer}>
            <ScrollView
              style={styles.countryList}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCountries.length === 0 ? (
                <Text style={styles.noResultsText}>No countries found</Text>
              ) : (
                filteredCountries.map((country) => (
                  <View key={country.code}>
                    {renderCountryItem({ item: country })}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      );
    }

    // Regular slide rendering
    return (
      <View style={styles.slideRegular}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon} size={64} color={colors.primary} />
          </View>
        </Animated.View>
        <Animated.View style={{ opacity }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Check if we can proceed (country must be selected on first slide)
  const canProceed = currentIndex === 0 ? selectedCountry !== null : true;
  // Hide skip button on country selection (first slide)
  const showSkipButton = currentIndex > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {showSkipButton ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={completeOnboarding}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={16}
        scrollEnabled={currentIndex > 0 || selectedCountry !== null}
      />

      {renderPagination()}

      <View style={styles.footer}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={scrollToPrev}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={scrollToNext}
          disabled={!canProceed}
        >
          {currentIndex === slides.length - 1 ? (
            <Text style={styles.nextButtonText}>Get Started</Text>
          ) : currentIndex === 0 ? (
            <>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          ) : (
            <>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    skipButton: {
      padding: 10,
      minWidth: 50,
    },
    skipText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    slide: {
      width: width,
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    slideRegular: {
      width: width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingBottom: 80,
    },
    iconContainer: {
      marginBottom: 20,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    backButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 140,
    },
    nextButtonDisabled: {
      opacity: 0.5,
    },
    nextButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    // Country selection styles
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginTop: 16,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      height: 44,
      fontSize: 16,
      color: colors.text,
    },
    clearButton: {
      padding: 4,
    },
    countryListContainer: {
      flex: 1,
      width: '100%',
      marginTop: 12,
      maxHeight: 280,
    },
    countryList: {
      flex: 1,
      width: '100%',
    },
    noResultsText: {
      textAlign: 'center',
      color: colors.textTertiary,
      fontSize: 16,
      marginTop: 20,
    },
    countryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 8,
      marginHorizontal: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    countryFlag: {
      fontSize: 24,
      marginRight: 12,
    },
    countryItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    countryItemDisabled: {
      opacity: 0.4,
    },
    countryInfo: {
      flex: 1,
    },
    countryName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    countryNameSelected: {
      color: colors.primary,
    },
    countryNameDisabled: {
      color: colors.textTertiary,
    },
    exchangeText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    exchangeTextSelected: {
      color: colors.primary,
    },
    noExchangeText: {
      fontSize: 13,
      color: colors.textTertiary,
      fontStyle: 'italic',
    },
  });

export default OnboardingScreen;
