import React from 'react';
import { Linking, Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/theme';

export type LatLng = { latitude: number; longitude: number };

export function OrderMap(props: { region: any; pickup: LatLng | null; dropoff: LatLng | null; driver?: LatLng | null }) {
  const { colors } = useAppTheme();
  const pickup = props.pickup;
  const dropoff = props.dropoff;
  const driver = props.driver ?? null;

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 10, backgroundColor: colors.card }}>
      <Text selectable style={{ fontWeight: '800', color: colors.text }}>
        Map preview is not available on web in this build.
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
        pickup: {pickup ? `${pickup.latitude.toFixed(5)}, ${pickup.longitude.toFixed(5)}` : '—'}
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
        dropoff: {dropoff ? `${dropoff.latitude.toFixed(5)}, ${dropoff.longitude.toFixed(5)}` : '—'}
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'], color: colors.mutedText }}>
        driver: {driver ? `${driver.latitude.toFixed(5)}, ${driver.longitude.toFixed(5)}` : '—'}
      </Text>
      {pickup ? (
        <Text
          selectable
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pickup.latitude},${pickup.longitude}`)}
          style={{ textDecorationLine: 'underline', fontWeight: '700', color: colors.text }}
        >
          Open pickup in Google Maps
        </Text>
      ) : null}
    </View>
  );
}
