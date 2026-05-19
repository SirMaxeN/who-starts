import { TouchModeSurface } from './TouchModeSurface';
import type { RoundMode, SurfaceSize, TouchPoint } from '../../types/game';

type FirstPlayerModeScreenProps = {
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
  onStartManualRound: () => void;
  onTouchCancel: (event: any) => void;
  onTouchEnd: (event: any) => void;
  onTouchEndCapture: (event: any) => void;
  onTouchMove: (event: any) => void;
  onTouchStart: (event: any) => void;
  playerLabels: Record<string, string>;
  remainingMs: number | null;
  roundMode: RoundMode;
  surfaceSize: SurfaceSize;
  visibleTouches: TouchPoint[];
  winner: TouchPoint | null;
  winnerBurstKey: number;
  showPremiumButton?: boolean;
};

export function FirstPlayerModeScreen(props: FirstPlayerModeScreenProps) {
  return <TouchModeSurface {...props} screen="first-player" />;
}
