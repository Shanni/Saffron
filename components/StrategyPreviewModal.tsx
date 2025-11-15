import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface StrategyConfig {
  name: string;
  type: 'grid' | 'dca' | 'momentum' | 'mean_reversion' | 'arbitrage';
  market: string;
  maxLeverage: number;
  stopLoss: number;
  takeProfit: number;
  riskPerTrade: number;
  gridLevels?: number;
  gridSpacing?: number;
  dcaInterval?: number;
  dcaAmount?: number;
  maxPositions?: number;
  rebalanceThreshold?: number;
}

interface StrategyPreviewModalProps {
  visible: boolean;
  strategy: StrategyConfig | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StrategyPreviewModal({
  visible,
  strategy,
  onConfirm,
  onCancel,
}: StrategyPreviewModalProps) {
  const colorScheme = useColorScheme();

  if (!strategy) return null;

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'grid': return 'grid';
      case 'dca': return 'arrow.up.circle';
      case 'momentum': return 'bolt';
      case 'mean_reversion': return 'arrow.2.squarepath';
      case 'arbitrage': return 'arrow.triangle.swap';
      default: return 'gear';
    }
  };

  const getStrategyDescription = (type: string) => {
    switch (type) {
      case 'grid':
        return 'Places buy and sell orders at regular intervals above and below current price to profit from market volatility.';
      case 'dca':
        return 'Dollar Cost Averaging - makes regular purchases over time to reduce impact of volatility.';
      case 'momentum':
        return 'Follows trending markets by buying when price moves up and selling when it moves down.';
      case 'mean_reversion':
        return 'Trades against extreme price movements, buying oversold and selling overbought conditions.';
      case 'arbitrage':
        return 'Exploits price differences across multiple DEXs for risk-free profits.';
      default:
        return 'Automated trading strategy';
    }
  };

  const getRiskLevel = () => {
    // Consider both leverage and strategy type for risk assessment
    const leverageRisk = strategy.maxLeverage;
    const stopLossRisk = strategy.stopLoss;
    
    // Arbitrage and DCA are inherently lower risk
    if (strategy.type === 'arbitrage') return { level: 'Very Low', color: '#4CAF50' };
    if (strategy.type === 'dca') return { level: 'Low', color: '#8BC34A' };
    
    // For other strategies, consider leverage and stop loss
    if (leverageRisk >= 4 || stopLossRisk <= 5) return { level: 'High', color: '#F44336' };
    if (leverageRisk >= 3 || stopLossRisk <= 10) return { level: 'Medium', color: '#FF9800' };
    if (leverageRisk >= 2) return { level: 'Medium-Low', color: '#FFC107' };
    return { level: 'Low', color: '#4CAF50' };
  };

  const risk = getRiskLevel();

  const renderStrategySpecificConfig = () => {
    switch (strategy.type) {
      case 'grid':
        return (
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Grid Trading Configuration</ThemedText>
            <ThemedText style={styles.configDescription}>
              Places buy and sell orders at regular price intervals to capture volatility profits.
            </ThemedText>
            
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Grid Levels</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.gridLevels || 10}</ThemedText>
                <ThemedText style={styles.parameterHint}>Number of price levels</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Grid Spacing</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.gridSpacing || 1}%</ThemedText>
                <ThemedText style={styles.parameterHint}>Distance between levels</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Price Range</ThemedText>
                <ThemedText style={styles.parameterValue}>±{((strategy.gridLevels || 10) * (strategy.gridSpacing || 1) / 2).toFixed(1)}%</ThemedText>
                <ThemedText style={styles.parameterHint}>Total coverage range</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Order Size</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.riskPerTrade}% each</ThemedText>
                <ThemedText style={styles.parameterHint}>Per grid level</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        );

      case 'dca':
        return (
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Dollar Cost Averaging (DCA)</ThemedText>
            <ThemedText style={styles.configDescription}>
              Makes regular purchases over time to reduce the impact of volatility through averaging.
            </ThemedText>
            
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Purchase Interval</ThemedText>
                <ThemedText style={styles.parameterValue}>{Math.floor((strategy.dcaInterval || 300) / 60)} min</ThemedText>
                <ThemedText style={styles.parameterHint}>Time between purchases</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Purchase Amount</ThemedText>
                <ThemedText style={styles.parameterValue}>${strategy.dcaAmount || 100}</ThemedText>
                <ThemedText style={styles.parameterHint}>Fixed amount per buy</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Daily Investment</ThemedText>
                <ThemedText style={styles.parameterValue}>${Math.floor((strategy.dcaAmount || 100) * 1440 / (strategy.dcaInterval || 300))}</ThemedText>
                <ThemedText style={styles.parameterHint}>Estimated daily total</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Accumulation Mode</ThemedText>
                <ThemedText style={styles.parameterValue}>Long Only</ThemedText>
                <ThemedText style={styles.parameterHint}>Buy and hold strategy</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        );

      case 'momentum':
        return (
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Momentum Trading Configuration</ThemedText>
            <ThemedText style={styles.configDescription}>
              Follows trending markets by buying strength and selling weakness using technical indicators.
            </ThemedText>
            
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Trend Period</ThemedText>
                <ThemedText style={styles.parameterValue}>20 / 50 MA</ThemedText>
                <ThemedText style={styles.parameterHint}>Moving average crossover</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Entry Threshold</ThemedText>
                <ThemedText style={styles.parameterValue}>2.0%</ThemedText>
                <ThemedText style={styles.parameterHint}>Minimum momentum signal</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>RSI Filter</ThemedText>
                <ThemedText style={styles.parameterValue}>30-70</ThemedText>
                <ThemedText style={styles.parameterHint}>Avoid overbought/oversold</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Position Direction</ThemedText>
                <ThemedText style={styles.parameterValue}>Long & Short</ThemedText>
                <ThemedText style={styles.parameterHint}>Bidirectional trading</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        );

      case 'mean_reversion':
        return (
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Mean Reversion Configuration</ThemedText>
            <ThemedText style={styles.configDescription}>
              Trades against extreme price movements, buying oversold and selling overbought conditions.
            </ThemedText>
            
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Bollinger Bands</ThemedText>
                <ThemedText style={styles.parameterValue}>20, 2.0σ</ThemedText>
                <ThemedText style={styles.parameterHint}>Period and deviation</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>RSI Levels</ThemedText>
                <ThemedText style={styles.parameterValue}>20 / 80</ThemedText>
                <ThemedText style={styles.parameterHint}>Oversold / Overbought</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Mean Distance</ThemedText>
                <ThemedText style={styles.parameterValue}>±2.5%</ThemedText>
                <ThemedText style={styles.parameterHint}>Entry trigger distance</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Reversion Target</ThemedText>
                <ThemedText style={styles.parameterValue}>50% to mean</ThemedText>
                <ThemedText style={styles.parameterHint}>Profit taking level</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        );

      case 'arbitrage':
        return (
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Arbitrage Configuration</ThemedText>
            <ThemedText style={styles.configDescription}>
              Exploits price differences across multiple DEXs for risk-free profits with minimal market exposure.
            </ThemedText>
            
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>DEX Coverage</ThemedText>
                <ThemedText style={styles.parameterValue}>5 DEXs</ThemedText>
                <ThemedText style={styles.parameterHint}>Jupiter, Drift, Zeta, Mango</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Min Spread</ThemedText>
                <ThemedText style={styles.parameterValue}>0.5%</ThemedText>
                <ThemedText style={styles.parameterHint}>Minimum profit threshold</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Execution Speed</ThemedText>
                <ThemedText style={styles.parameterValue}>{'< 100ms'}</ThemedText>
                <ThemedText style={styles.parameterHint}>Average trade latency</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Market Exposure</ThemedText>
                <ThemedText style={styles.parameterValue}>Market Neutral</ThemedText>
                <ThemedText style={styles.parameterHint}>Hedged positions</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        );

      default:
        return (
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Strategy Configuration</ThemedText>
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Max Positions</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.maxPositions}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Rebalance Threshold</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.rebalanceThreshold}%</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>Strategy Preview</ThemedText>
          <View style={styles.placeholder} />
        </ThemedView>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Strategy Overview */}
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedView style={styles.strategyHeader}>
              <IconSymbol 
                name={getStrategyIcon(strategy.type)} 
                size={32} 
                color={Colors[colorScheme ?? 'light'].tint} 
              />
              <ThemedView style={styles.strategyInfo}>
                <ThemedText type="subtitle" style={styles.strategyName}>
                  {strategy.name}
                </ThemedText>
                <ThemedText style={styles.strategyType}>
                  {strategy.type.toUpperCase()} • {strategy.market}
                </ThemedText>
              </ThemedView>
              <ThemedView style={[styles.riskBadge, { backgroundColor: risk.color }]}>
                <Text style={styles.riskText}>{risk.level}</Text>
              </ThemedView>
            </ThemedView>
            
            <ThemedText style={styles.description}>
              {getStrategyDescription(strategy.type)}
            </ThemedText>
          </ThemedView>

          {/* Risk Parameters */}
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Risk Management</ThemedText>
            
            <ThemedView style={styles.parameterGrid}>
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Max Leverage</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.maxLeverage}x</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Stop Loss</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.stopLoss}%</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Take Profit</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.takeProfit}%</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.parameter}>
                <ThemedText style={styles.parameterLabel}>Risk per Trade</ThemedText>
                <ThemedText style={styles.parameterValue}>{strategy.riskPerTrade}%</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {/* Strategy-Specific Configuration */}
          {renderStrategySpecificConfig()}

          {/* Expected Performance */}
          <ThemedView style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Expected Performance</ThemedText>
            
            <ThemedView style={styles.performanceGrid}>
              <ThemedView style={styles.performanceItem}>
                <ThemedText style={styles.performanceLabel}>Estimated APY</ThemedText>
                <ThemedText style={[styles.performanceValue, { color: '#4CAF50' }]}>
                  {strategy.type === 'grid' ? '8-15%' : 
                   strategy.type === 'dca' ? '12-25%' :
                   strategy.type === 'momentum' ? '15-30%' :
                   strategy.type === 'mean_reversion' ? '6-12%' :
                   strategy.type === 'arbitrage' ? '3-8%' : '10-20%'}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.performanceItem}>
                <ThemedText style={styles.performanceLabel}>Win Rate</ThemedText>
                <ThemedText style={styles.performanceValue}>
                  {strategy.type === 'grid' ? '70-80%' : 
                   strategy.type === 'dca' ? '85-95%' :
                   strategy.type === 'momentum' ? '45-60%' :
                   strategy.type === 'mean_reversion' ? '65-75%' :
                   strategy.type === 'arbitrage' ? '95-99%' : '60-70%'}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.performanceItem}>
                <ThemedText style={styles.performanceLabel}>Max Drawdown</ThemedText>
                <ThemedText style={[styles.performanceValue, { color: '#F44336' }]}>
                  {strategy.type === 'arbitrage' ? '1-2%' :
                   strategy.type === 'dca' ? '15-25%' :
                   `${Math.min(strategy.stopLoss * 1.2, 25).toFixed(0)}%`}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {/* Warning */}
          <ThemedView style={[styles.warningCard, { backgroundColor: 'rgba(255, 152, 0, 0.1)', borderColor: '#FF9800' }]}>
            <IconSymbol name="exclamationmark.triangle" size={20} color="#FF9800" />
            <ThemedText style={[styles.warningText, { color: '#FF9800' }]}>
              Trading involves risk. Past performance doesn&apos;t guarantee future results. Only invest what you can afford to lose.
            </ThemedText>
          </ThemedView>
        </ScrollView>

        {/* Action Buttons */}
        <ThemedView style={styles.actions}>
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
            onPress={onCancel}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.confirmButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={onConfirm}
          >
            <ThemedText style={styles.confirmButtonText}>Activate Strategy</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  strategyInfo: {
    flex: 1,
    marginLeft: 16,
  },
  strategyName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  strategyType: {
    fontSize: 14,
    opacity: 0.7,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  riskText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  parameterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  parameter: {
    width: '48%',
    marginBottom: 16,
  },
  parameterLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  parameterValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  configDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  parameterHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
