import { TouchModeSurface } from './TouchModeSurface';
import type { RoundMode, SurfaceSize, TouchPoint } from '../../types/game';

type PlayersOrderModeScreenProps = {
  activeTouches: TouchPoint[];
  animationsEnabled: boolean;
  awaitingRelease: boolean;
  contextLabel: string;
  isChoosing: boolean;
  onLayout: (event: any) => void;
  onOpenContext: () => void;
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
  premiumUnlocked?: boolean;
  remainingMs: number | null;
  roundMode: RoundMode;
  selectedOrder: TouchPoint[] | null;
  showOrderList: boolean;
  surfaceSize: SurfaceSize;
  visibleTouches: TouchPoint[];
  winner: TouchPoint | null;
  winnerBurstKey: number;
};

export function PlayersOrderModeScreen(props: PlayersOrderModeScreenProps) {
  return (
    <TouchModeSurface
      {...props}
      onOrderRevealSound={props.onOrderRevealSound}
      screen="players-order"
      selectedOrder={props.selectedOrder}
      showOrderList={props.showOrderList}
    />
  );
}
