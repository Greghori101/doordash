import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/theme';

export type LatLng = { latitude: number; longitude: number };

type DriverMarker = { id: string; location: LatLng };

export function AdminMap(props: { drivers: DriverMarker[]; pickup?: LatLng | null; dropoff?: LatLng | null }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 10, backgroundColor: colors.card }}>
      <Text selectable style={{ fontWeight: '800', color: colors.text }}>
        Map preview is not available on web in this build.
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
        drivers: {props.drivers.length}
      </Text>
      {props.pickup ? (
        <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
          pickup: {props.pickup.latitude.toFixed(5)}, {props.pickup.longitude.toFixed(5)}
        </Text>
      ) : null}
      {props.dropoff ? (
        <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
          dropoff: {props.dropoff.latitude.toFixed(5)}, {props.dropoff.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}
