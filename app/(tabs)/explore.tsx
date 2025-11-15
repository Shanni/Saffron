import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { strategyEngine } from '../../services/strategyEngine';
import { dexService } from '../../services/dexIntegration';

interface PortfolioItem {
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  change: number;
  changePercent: number;
}

interface AccountBalance {
  cash: number;
  total: number;
  strategiesValue: number;
  totalPnL: number;
}

interface StrategyOverview {
  id: string;
  name: string;
  type: string;
  status: string;
  pnl: number;
  winRate: number;
  trades: number;
}

export default function PortfolioScreen() {
  const colorScheme = useColorScheme();
  const [strategies, setStrategies] = useState<StrategyOverview[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  
  // Enhanced account balance with strategy data
  const [accountBalance, setAccountBalance] = useState<AccountBalance>({
    cash: 2500.00,
    total: 2500.00,
    strategiesValue: 0,
    totalPnL: 0
  });

  // Load strategy data
  useEffect(() => {
    const loadData = () => {
      // Get strategies from engine
      const engineStrategies = strategyEngine.getAllStrategies();
      const strategyOverviews: StrategyOverview[] = engineStrategies.map(strategy => {
        const performance = strategyEngine.getPerformance(strategy.id);
        return {
          id: strategy.id,
          name: strategy.name,
          type: strategy.type,
          status: strategy.status,
          pnl: performance?.totalPnL || 0,
          winRate: performance?.winRate || 0,
          trades: performance?.totalTrades || 0,
        };
      });
      
      setStrategies(strategyOverviews);
      
      // Get positions
      const currentPositions = dexService.getPositions();
      setPositions(currentPositions);
      
      // Calculate total strategy value and P&L
      const totalStrategyPnL = strategyOverviews.reduce((sum, s) => sum + s.pnl, 0);
      const totalPositionValue = currentPositions.reduce((sum, p) => sum + (p.size * p.currentPrice), 0);
      
      setAccountBalance(prev => ({
        ...prev,
        strategiesValue: totalPositionValue,
        totalPnL: totalStrategyPnL,
        total: prev.cash + totalPositionValue + totalStrategyPnL
      }));
      
      // Create some demo strategies if none exist
      if (engineStrategies.length === 0) {
        strategyEngine.createStrategy({
          name: 'SOL Grid Bot',
          type: 'grid',
          market: 'SOL-PERP',
          status: 'active',
          maxLeverage: 5,
          stopLoss: 5,
          takeProfit: 10,
          riskPerTrade: 2,
          gridLevels: 10,
          gridSpacing: 1,
          maxPositions: 5,
          rebalanceThreshold: 5,
        });
        
        strategyEngine.createStrategy({
          name: 'BTC DCA Strategy',
          type: 'dca',
          market: 'BTC-PERP',
          status: 'active',
          maxLeverage: 3,
          stopLoss: 8,
          takeProfit: 15,
          riskPerTrade: 1.5,
          dcaInterval: 300,
          dcaAmount: 100,
          maxPositions: 3,
          rebalanceThreshold: 10,
        });
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'paused': return '#FF9800';
      case 'stopped': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={[styles.title, { color: Colors[colorScheme ?? 'light'].tint }]}>Trading</ThemedText>
          <ThemedText style={styles.subtitle}>AI-powered trading strategies</ThemedText>
        </ThemedView>

        {/* Trading Balance Card */}
        <ThemedView style={[styles.balanceCard, { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
          <ThemedView style={styles.balanceHeader}>
            <IconSymbol name="chart.line.uptrend.xyaxis" size={24} color={Colors[colorScheme ?? 'light'].tint} />
            <ThemedText type="subtitle" style={styles.balanceTitle}>Trading Portfolio</ThemedText>
          </ThemedView>
          
          <ThemedText style={styles.totalBalance}>${accountBalance.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</ThemedText>
          
          <ThemedView style={styles.balanceBreakdown}>
            <ThemedView style={styles.balanceItem}>
              <ThemedText style={styles.balanceLabel}>Available Cash</ThemedText>
              <ThemedText style={styles.balanceValue}>${accountBalance.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.balanceItem}>
              <ThemedText style={styles.balanceLabel}>Position Value</ThemedText>
              <ThemedText style={styles.balanceValue}>${accountBalance.strategiesValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</ThemedText>
            </ThemedView>
          </ThemedView>
          
          {/* Strategy P&L Summary */}
          <ThemedView style={styles.pnlSummary}>
            <ThemedText style={styles.pnlLabel}>Total P&L</ThemedText>
            <ThemedText style={[styles.pnlValue, { color: accountBalance.totalPnL >= 0 ? '#4CAF50' : '#F44336' }]}>
              {accountBalance.totalPnL >= 0 ? '+' : ''}${accountBalance.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Active Strategies Section */}
        {strategies.length > 0 && (
          <ThemedView style={styles.strategiesSection}>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Active Strategies</ThemedText>
              <ThemedText style={styles.strategiesCount}>{strategies.filter(s => s.status === 'active').length} Active</ThemedText>
            </ThemedView>
            
            {strategies.slice(0, 3).map((strategy) => (
              <ThemedView key={strategy.id} style={[styles.strategyItem, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                <ThemedView style={styles.strategyHeader}>
                  <ThemedView style={styles.strategyInfo}>
                    <IconSymbol 
                      name={getStrategyIcon(strategy.type)} 
                      size={20} 
                      color={Colors[colorScheme ?? 'light'].tint} 
                    />
                    <ThemedView style={styles.strategyDetails}>
                      <ThemedText style={styles.strategyName}>{strategy.name}</ThemedText>
                      <ThemedText style={styles.strategyType}>{strategy.type.toUpperCase()}</ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <ThemedView style={styles.strategyMetrics}>
                    <ThemedText style={[styles.strategyPnL, { color: strategy.pnl >= 0 ? '#4CAF50' : '#F44336' }]}>
                      {strategy.pnl >= 0 ? '+' : ''}${strategy.pnl.toFixed(2)}
                    </ThemedText>
                    <ThemedText style={styles.strategyStats}>
                      {strategy.winRate.toFixed(1)}% • {strategy.trades} trades
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedView style={[styles.statusIndicator, { backgroundColor: getStatusColor(strategy.status) }]} />
              </ThemedView>
            ))}
            
            {strategies.length > 3 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <ThemedText style={[styles.viewAllText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                  View All {strategies.length} Strategies
                </ThemedText>
                <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tint} />
              </TouchableOpacity>
            )}
          </ThemedView>
        )}

        {/* Current Positions */}
        {positions.length > 0 && (
          <ThemedView style={styles.positionsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Open Positions</ThemedText>
            
            {positions.map((position) => (
              <ThemedView key={position.id} style={[styles.positionItem, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                <ThemedView style={styles.positionHeader}>
                  <ThemedView style={styles.positionInfo}>
                    <ThemedText style={styles.positionMarket}>{position.market}</ThemedText>
                    <ThemedText style={styles.positionSide}>{position.side.toUpperCase()} • {position.leverage}x</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.positionMetrics}>
                    <ThemedText style={styles.positionSize}>${(position.size * position.currentPrice).toFixed(2)}</ThemedText>
                    <ThemedText style={[styles.positionPnL, { color: position.pnl >= 0 ? '#4CAF50' : '#F44336' }]}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            ))}
          </ThemedView>
        )}

        {/* Quick Trading Actions */}
        <ThemedView style={styles.actionsSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
          
          <ThemedView style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
              <IconSymbol name="plus.circle" size={24} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.actionText}>Add Funds</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
              <IconSymbol name="bolt" size={24} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.actionText}>New Strategy</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
              <IconSymbol name="chart.bar" size={24} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.actionText}>Analytics</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  balanceCard: {
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTitle: {
    marginLeft: 8,
    fontSize: 18,
  },
  totalBalance: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4CAF50',
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  holdingsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  holdingItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  holdingName: {
    fontSize: 14,
    opacity: 0.7,
  },
  holdingPrice: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharesText: {
    fontSize: 14,
    opacity: 0.7,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  // New styles for strategy and position sections
  pnlSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  pnlLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  pnlValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  strategiesSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  strategiesCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  strategyItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strategyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  strategyDetails: {
    marginLeft: 12,
    flex: 1,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  strategyType: {
    fontSize: 12,
    opacity: 0.7,
  },
  strategyMetrics: {
    alignItems: 'flex-end',
  },
  strategyPnL: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  strategyStats: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  positionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  positionItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positionInfo: {
    flex: 1,
  },
  positionMarket: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  positionSide: {
    fontSize: 12,
    opacity: 0.7,
  },
  positionMetrics: {
    alignItems: 'flex-end',
  },
  positionSize: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  positionPnL: {
    fontSize: 14,
    fontWeight: '600',
  },
});
