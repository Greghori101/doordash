import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/theme';

export type LatLng = { latitude: number; longitude: number };

export function DriverMap(props: { driver: LatLng | null }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 10, backgroundColor: colors.card }}>
      <Text selectable style={{ fontWeight: '800', color: colors.text }}>
        Map preview is not available on web in this build.
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
        you: {props.driver ? `${props.driver.latitude.toFixed(5)}, ${props.driver.longitude.toFixed(5)}` : '—'}
      </Text>
    </View>
  );
}
