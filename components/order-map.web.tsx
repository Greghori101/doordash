import React from 'react';
import { Linking, Text, View } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

export function OrderMap(props: { region: any; pickup: LatLng | null; dropoff: LatLng | null; driver?: LatLng | null }) {
  const pickup = props.pickup;
  const dropoff = props.dropoff;
  const driver = props.driver ?? null;

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.06)' }}>
      <Text selectable style={{ fontWeight: '800' }}>
        Map preview is not available on web in this build.
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
        pickup: {pickup ? `${pickup.latitude.toFixed(5)}, ${pickup.longitude.toFixed(5)}` : '—'}
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
        dropoff: {dropoff ? `${dropoff.latitude.toFixed(5)}, ${dropoff.longitude.toFixed(5)}` : '—'}
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
        driver: {driver ? `${driver.latitude.toFixed(5)}, ${driver.longitude.toFixed(5)}` : '—'}
      </Text>
      {pickup ? (
        <Text
          selectable
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pickup.latitude},${pickup.longitude}`)}
          style={{ textDecorationLine: 'underline', fontWeight: '700' }}
        >
          Open pickup in Google Maps
        </Text>
      ) : null}
    </View>
  );
}

