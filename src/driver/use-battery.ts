import * as Battery from 'expo-battery';
import React from 'react';

export function useBatteryStatus() {
  const [level, setLevel] = React.useState<number | null>(null);
  const [state, setState] = React.useState<Battery.BatteryState | null>(null);

  React.useEffect(() => {
    if (process.env.EXPO_OS === 'web') return;

    let mounted = true;

    Battery.getBatteryLevelAsync()
      .then((v) => {
        if (!mounted) return;
        if (typeof v === 'number') setLevel(v);
      })
      .catch(() => {});

    Battery.getBatteryStateAsync()
      .then((v) => {
        if (!mounted) return;
        setState(v);
      })
      .catch(() => {});

    const subLevel = Battery.addBatteryLevelListener((e) => setLevel(e.batteryLevel));
    const subState = Battery.addBatteryStateListener((e) => setState(e.batteryState));

    return () => {
      mounted = false;
      subLevel.remove();
      subState.remove();
    };
  }, []);

  const percent = level == null ? null : Math.round(level * 100);
  const isCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;

  return { percent, isCharging };
}

