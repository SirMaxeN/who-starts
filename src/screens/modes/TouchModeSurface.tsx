import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { CenterPanel } from '../../components/CenterPanel';
import {
  OrderBurstEffects,
  type OrderBurstEvent,
} from '../../components/OrderBurstEffects';
import {
  PlayersOrderOverlay,
  PlayersOrderPanel,
} from '../../components/PlayersOrderOverlay';
import { SciFiBackdrop } from '../../components/SciFiBackdrop';
import { SelectionEffects } from '../../components/SelectionEffects';
import { TopBar } from '../../components/TopBar';
import { TouchMarker } from '../../components/TouchMarker';
import type { AppScreen, RoundMode, SurfaceSize, TouchPoint } from '../../types/game';

type TouchModeSurfaceProps = {
  activeTouches: TouchPoint[];
  animationsEnabled: boolean;
  awaitingRelease: boolean;
  contextLabel: string;
  isChoosing: boolean;
  onLayout: (event: any) => void;
  onOpenContext: () => void;
  onOpenHelp?: () => void;
  onOpenPremium: () => void;
  onOpenSettings: () => void;
  onOrderRevealSound?: (playbackRate: number) => void;
  onStartManualRound: () => void;
  onTouchCancel: (event: any) => void;
  onTouchEnd: (event: any) => void;
  onTouchEndCapture: (event: any) => void;
  onTouchMove: (event: any) => void;
  onTouchStart: (event: any) => void;
  playerLabels: Record<string, string>;
  remainingMs: number | null;
  roundMode: RoundMode;
  screen: AppScreen;
  selectedOrder?: TouchPoint[] | null;
  showPremiumButton?: boolean;
  showOrderList?: boolean;
  surfaceSize: SurfaceSize;
  visibleTouches: TouchPoint[];
  winner: TouchPoint | null;
  winnerBurstKey: number;
};

const ORDER_REVEAL_STEP_MS = 340;
const ORDER_MARKER_COMPACT_DELAY_MS = 290;

export function TouchModeSurface({
  activeTouches,
  animationsEnabled,
  awaitingRelease,
  contextLabel,
  isChoosing,
  onLayout,
  onOpenContext,
  onOpenHelp,
  onOpenPremium,
  onOpenSettings,
  onOrderRevealSound,
  onStartManualRound,
  onTouchCancel,
  onTouchEnd,
  onTouchEndCapture,
  onTouchMove,
  onTouchStart,
  playerLabels,
  remainingMs,
  roundMode,
  screen,
  selectedOrder = null,
  showPremiumButton = true,
  showOrderList = false,
  surfaceSize,
  visibleTouches,
  winner,
  winnerBurstKey,
}: TouchModeSurfaceProps) {
  const orderBurstKeyRef = useRef(0);
  const orderRevealSoundRef = useRef(onOrderRevealSound);
  const [orderBursts, setOrderBursts] = useState<OrderBurstEvent[]>([]);
  const [compactOrderTouchIds, setCompactOrderTouchIds] = useState<Set<string>>(() => new Set());
  const [orderRevealCount, setOrderRevealCount] = useState(0);

  useEffect(() => {
    orderRevealSoundRef.current = onOrderRevealSound;
  }, [onOrderRevealSound]);

  useEffect(() => {
    if (screen !== 'players-order' || !selectedOrder) {
      setOrderBursts([]);
      setCompactOrderTouchIds(new Set());
      setOrderRevealCount(0);
      return;
    }

    if (!animationsEnabled) {
      setOrderBursts([]);
      setCompactOrderTouchIds(new Set());
      setOrderRevealCount(selectedOrder.length);
      return;
    }

    setOrderBursts([]);
    setCompactOrderTouchIds(new Set());
    setOrderRevealCount(1);
    const burstTimers: ReturnType<typeof setTimeout>[] = [];
    const sequenceTimers: ReturnType<typeof setTimeout>[] = [];

    const addBurst = (touch: TouchPoint, orderIndex: number) => {
      const burstKey = orderBurstKeyRef.current;
      orderBurstKeyRef.current += 1;
      const burst = { key: burstKey, touch };
      setOrderBursts((currentBursts) => [...currentBursts, burst]);
      orderRevealSoundRef.current?.(0.88 + orderIndex * 0.08);

      const timer = setTimeout(() => {
        setOrderBursts((currentBursts) =>
          currentBursts.filter((currentBurst) => currentBurst.key !== burstKey)
        );
      }, 760);
      burstTimers.push(timer);
    };

    const scheduleCompact = (touch: TouchPoint, delay: number) => {
      const timer = setTimeout(() => {
        setCompactOrderTouchIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.add(touch.id);
          return nextIds;
        });
      }, delay);
      sequenceTimers.push(timer);
    };

    addBurst(selectedOrder[0], 0);
    scheduleCompact(selectedOrder[0], ORDER_MARKER_COMPACT_DELAY_MS);

    if (selectedOrder.length <= 1) {
      return () => {
        burstTimers.forEach((timer) => clearTimeout(timer));
        sequenceTimers.forEach((timer) => clearTimeout(timer));
      };
    }

    selectedOrder.slice(1).forEach((touch, index) => {
      const revealCount = index + 2;
      const revealDelay = ORDER_REVEAL_STEP_MS * (index + 1);
      const revealTimer = setTimeout(() => {
        setOrderRevealCount(revealCount);
        addBurst(touch, index + 1);
      }, revealDelay);

      sequenceTimers.push(revealTimer);
      scheduleCompact(touch, revealDelay + ORDER_MARKER_COMPACT_DELAY_MS);
    });

    return () => {
      burstTimers.forEach((burstTimer) => clearTimeout(burstTimer));
      sequenceTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [animationsEnabled, screen, selectedOrder]);

  const revealedOrder = useMemo(() => {
    if (screen !== 'players-order' || !selectedOrder) {
      return selectedOrder;
    }

    return selectedOrder.slice(0, Math.max(1, orderRevealCount));
  }, [orderRevealCount, screen, selectedOrder]);
  const markerTouches = screen === 'players-order' && selectedOrder ? selectedOrder : visibleTouches;
  const footerHint =
    screen === 'players-order' && selectedOrder && activeTouches.length === 0
      ? 'Tap to reset'
      : awaitingRelease
        ? 'Release to reset'
        : `${activeTouches.length} active`;

  return (
    <View
      onLayout={onLayout}
      onTouchCancel={onTouchCancel}
      onTouchEndCapture={onTouchEndCapture}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
      style={styles.surface}
    >
      <SciFiBackdrop animationsEnabled={animationsEnabled} />
      <SelectionEffects
        isChoosing={isChoosing}
        showScreenFlash
        winnerBurstKey={winner ? winnerBurstKey : orderRevealCount}
        winner={animationsEnabled ? winner : null}
      />
      <OrderBurstEffects bursts={orderBursts} />
      {screen === 'players-order' && showOrderList ? (
        <PlayersOrderOverlay
          animationsEnabled={animationsEnabled}
          order={revealedOrder}
          playerLabels={playerLabels}
        />
      ) : null}
      {markerTouches.map((touch) => (
        <TouchMarker
          animationsEnabled={animationsEnabled}
          compact={compactOrderTouchIds.has(touch.id)}
          isChoosing={isChoosing}
          key={touch.id}
          label={playerLabels[touch.id] ?? 'Player'}
          surfaceSize={surfaceSize}
          touch={touch}
          winnerId={winner?.id}
        />
      ))}
      <TopBar
        contextLabel={contextLabel}
        onOpenHelp={onOpenHelp}
        onOpenModePicker={onOpenContext}
        onOpenPremium={onOpenPremium}
        onOpenSettings={onOpenSettings}
        roundMode={roundMode}
        showPremiumButton={showPremiumButton}
      />
      <CenterPanel
        activeTouches={activeTouches}
        awaitingRelease={awaitingRelease}
        isChoosing={isChoosing}
        onStartManualRound={onStartManualRound}
        playerLabels={playerLabels}
        remainingMs={remainingMs}
        roundMode={roundMode}
        screen={screen}
        selectedOrder={revealedOrder}
        winner={winner}
      />
      {screen === 'players-order' && showOrderList ? (
        <PlayersOrderPanel order={revealedOrder} playerLabels={playerLabels} />
      ) : null}
      <Text pointerEvents="none" style={styles.footerHint}>
        {footerHint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: '#02030A',
    overflow: 'hidden',
  },
  footerHint: {
    position: 'absolute',
    bottom: Platform.select({ web: 18, default: 34 }),
    alignSelf: 'center',
    color: '#8099B8',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
