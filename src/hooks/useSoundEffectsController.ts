import { createAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import type { RoundMode } from '../types/game';

const CHOSEN_SOUND = require('../../assets/sounds/chosen.mp3');
const MENU_SOUND = require('../../assets/sounds/menu.mp3');
const PLAYER_SOUND = require('../../assets/sounds/player.mp3');
const PRESS_1_SOUND = require('../../assets/sounds/press1.mp3');
const PRESS_2_SOUND = require('../../assets/sounds/press2.mp3');
const PRESS_3_SOUND = require('../../assets/sounds/press3.mp3');
const SLIDE_SOUND = require('../../assets/sounds/slide.mp3');
const TIMER_SOUND = require('../../assets/sounds/timer.mp3');
const PLAYER_POOL_SIZE = 6;
const PRESS_POOL_SIZE = 4;
const SLIDE_POOL_SIZE = 4;
const TIMER_POOL_SIZE = 6;

const PRESS_VOLUMES = [0.55, 0.55, 0.55] as const;
const PLAYER_BASE_RATE = 0.9;
const PLAYER_RATE_STEP = 0.08;
const PLAYER_MAX_RATE = 1.55;
const CHOSEN_VOLUME = 0.82;
const MENU_VOLUME = 0.5;
const PLAYER_VOLUME = 0.68;
const PLAYER_FEEDBACK_VOLUME = 0.82;
const SLIDE_VOLUME = 0.62;
const TIMER_VOLUME = 0.08;

type SoundPlayer = ReturnType<typeof createAudioPlayer>;

type UseSoundEffectsControllerParams = {
  countdownActive: boolean;
  enabled: boolean;
  playerCount: number;
  remainingMs: number | null;
  roundMode: RoundMode;
  winnerId: string | null;
};

export function useSoundEffectsController({
  countdownActive,
  enabled,
  playerCount,
  remainingMs,
  roundMode,
  winnerId,
}: UseSoundEffectsControllerParams) {
  const [timerPlayers] = useState(() =>
    Array.from({ length: TIMER_POOL_SIZE }, () => createAudioPlayer(TIMER_SOUND))
  );
  const [playerJoinPlayers] = useState(() =>
    Array.from({ length: PLAYER_POOL_SIZE }, () => createAudioPlayer(PLAYER_SOUND))
  );
  const [slidePlayers] = useState(() =>
    Array.from({ length: SLIDE_POOL_SIZE }, () => createAudioPlayer(SLIDE_SOUND))
  );
  const [pressPools] = useState(() => [
    Array.from({ length: PRESS_POOL_SIZE }, () => createAudioPlayer(PRESS_1_SOUND)),
    Array.from({ length: PRESS_POOL_SIZE }, () => createAudioPlayer(PRESS_2_SOUND)),
    Array.from({ length: PRESS_POOL_SIZE }, () => createAudioPlayer(PRESS_3_SOUND)),
  ]);
  const [menuPlayer] = useState(() => createAudioPlayer(MENU_SOUND));
  const [chosenPlayer] = useState(() => createAudioPlayer(CHOSEN_SOUND));

  const previousPlayerCount = useRef(playerCount);
  const previousWinnerId = useRef<string | null>(winnerId);
  const previousRemainingMs = useRef<number | null>(remainingMs);
  const previousCountdownActive = useRef(countdownActive);
  const playerPoolIndex = useRef(0);
  const pressIndex = useRef(0);
  const pressPoolIndexes = useRef([0, 0, 0]);
  const slidePoolIndex = useRef(0);
  const timerPoolIndex = useRef(0);

  useEffect(() => {
    const players = [
      ...timerPlayers,
      ...playerJoinPlayers,
      ...slidePlayers,
      ...pressPools.flat(),
      menuPlayer,
      chosenPlayer,
    ];

    for (const player of players) {
      player.loop = false;
    }

    return () => {
      for (const player of players) {
        player.pause();
        player.remove();
      }
    };
  }, [
    chosenPlayer,
    menuPlayer,
    playerJoinPlayers,
    pressPools,
    slidePlayers,
    timerPlayers,
  ]);

  useEffect(() => {
    if (!enabled) {
      previousPlayerCount.current = playerCount;
      previousWinnerId.current = winnerId;
      previousRemainingMs.current = remainingMs;
      previousCountdownActive.current = countdownActive;
      return;
    }

    if (playerCount > previousPlayerCount.current) {
      const playbackRate = Math.min(
        PLAYER_MAX_RATE,
        PLAYER_BASE_RATE + (playerCount - 1) * PLAYER_RATE_STEP
      );

      playPlayerJoin(playerJoinPlayers, playerPoolIndex, {
        playbackRate,
        shouldCorrectPitch: false,
        volume: PLAYER_VOLUME,
      });
    }

    previousPlayerCount.current = playerCount;
  }, [enabled, playerCount, playerJoinPlayers]);

  useEffect(() => {
    if (!enabled) {
      previousWinnerId.current = winnerId;
      return;
    }

    if (winnerId && previousWinnerId.current !== winnerId) {
      replaySound(chosenPlayer, { volume: CHOSEN_VOLUME });
    }

    previousWinnerId.current = winnerId;
  }, [chosenPlayer, enabled, winnerId]);

  useEffect(() => {
    if (!enabled) {
      previousRemainingMs.current = remainingMs;
      previousCountdownActive.current = countdownActive;
      return;
    }

    if (!countdownActive || roundMode === 'manual' || remainingMs === null) {
      previousRemainingMs.current = remainingMs;
      previousCountdownActive.current = countdownActive;
      return;
    }

    const previousRemaining = previousCountdownActive.current ? previousRemainingMs.current : null;
    const shouldPlayImmediateStartBeep =
      !previousCountdownActive.current ||
      previousRemaining === null ||
      remainingMs > previousRemaining;

    if (shouldPlayImmediateStartBeep) {
      playTimerBeep(timerPlayers, timerPoolIndex);
    } else if (previousRemaining !== null) {
      const crossedBucket = getCrossedCountdownBucket(previousRemaining, remainingMs);

      if (crossedBucket) {
        playTimerBeep(timerPlayers, timerPoolIndex);
      }
    }

    previousRemainingMs.current = remainingMs;
    previousCountdownActive.current = countdownActive;
  }, [countdownActive, enabled, remainingMs, roundMode, timerPlayers]);

  function playPress() {
    if (!enabled) {
      return;
    }

    const nextIndex = pressIndex.current % pressPools.length;
    const pool = pressPools[nextIndex];
    const poolIndex = pressPoolIndexes.current[nextIndex] % pool.length;
    const player = pool[poolIndex];

    replaySound(player, { volume: PRESS_VOLUMES[nextIndex] });
    pressPoolIndexes.current[nextIndex] = (poolIndex + 1) % pool.length;
    pressIndex.current = (nextIndex + 1) % pressPools.length;
  }

  function playMenuOpen() {
    if (!enabled) {
      return;
    }

    playPress();
    replaySound(menuPlayer, { volume: MENU_VOLUME });
  }

  function playChosen() {
    playChosenWithRate();
  }

  function playChosenWithRate(playbackRate = 1, volume = CHOSEN_VOLUME) {
    if (!enabled) {
      return;
    }

    replaySound(chosenPlayer, {
      playbackRate,
      shouldCorrectPitch: false,
      volume,
    });
  }

  function playPlayerTone(playbackRate: number) {
    if (!enabled) {
      return;
    }

    playPlayerJoin(playerJoinPlayers, playerPoolIndex, {
      playbackRate,
      shouldCorrectPitch: false,
      volume: PLAYER_FEEDBACK_VOLUME,
    });
  }

  function playSlide() {
    if (!enabled) {
      return;
    }

    const player = slidePlayers[slidePoolIndex.current % slidePlayers.length];
    slidePoolIndex.current = (slidePoolIndex.current + 1) % slidePlayers.length;
    replaySound(player, { volume: SLIDE_VOLUME });
  }

  return {
    playChosen,
    playChosenWithRate,
    playMenuOpen,
    playPlayerTone,
    playPress,
    playSlide,
  };
}

function playTimerBeep(timerPlayers: SoundPlayer[], timerPoolIndex: { current: number }) {
  const player = timerPlayers[timerPoolIndex.current % timerPlayers.length];
  timerPoolIndex.current = (timerPoolIndex.current + 1) % timerPlayers.length;
  replaySound(player, { volume: TIMER_VOLUME });
}

function playPlayerJoin(
  playerJoinPlayers: SoundPlayer[],
  playerPoolIndex: { current: number },
  options: {
    playbackRate?: number;
    shouldCorrectPitch?: boolean;
    volume?: number;
  }
) {
  const player = playerJoinPlayers[playerPoolIndex.current % playerJoinPlayers.length];
  playerPoolIndex.current = (playerPoolIndex.current + 1) % playerJoinPlayers.length;
  replaySound(player, options);
}

function replaySound(
  player: SoundPlayer,
  options: {
    playbackRate?: number;
    shouldCorrectPitch?: boolean;
    volume?: number;
  } = {}
) {
  if (typeof options.volume === 'number') {
    player.volume = options.volume;
  }

  if (typeof options.shouldCorrectPitch === 'boolean') {
    player.shouldCorrectPitch = options.shouldCorrectPitch;
  }

  if (typeof options.playbackRate === 'number') {
    player.setPlaybackRate(options.playbackRate);
  }

  void player
    .seekTo(0)
    .catch(() => {
      // Ignore rewind errors and still try to play.
    })
    .finally(() => {
      player.play();
    });
}

function getCrossedCountdownBucket(previousRemainingMs: number, nextRemainingMs: number) {
  if (nextRemainingMs >= previousRemainingMs) {
    return false;
  }

  const previousBucket = getCountdownBucket(previousRemainingMs);
  const nextBucket = getCountdownBucket(nextRemainingMs);

  if (previousBucket === null || nextBucket === null) {
    return false;
  }

  return previousBucket !== nextBucket;
}

function getCountdownBucket(remainingMs: number) {
  if (remainingMs <= 0) {
    return null;
  }

  if (remainingMs > 4_000) {
    return `wide-${Math.ceil(remainingMs / 1_000)}`;
  }

  if (remainingMs > 2_000 && remainingMs <= 4_000) {
    return `slow-${Math.ceil(remainingMs / 500)}`;
  }

  if (remainingMs > 1_000 && remainingMs <= 2_000) {
    return `mid-${Math.ceil(remainingMs / 250)}`;
  }

  if (remainingMs > 0 && remainingMs <= 1_000) {
    return `fast-${Math.ceil(remainingMs / 180)}`;
  }

  return null;
}
