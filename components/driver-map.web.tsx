import React from 'react';
import { Text, View } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

export function DriverMap(props: { driver: LatLng | null }) {
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.06)' }}>
      <Text selectable style={{ fontWeight: '800' }}>
        Map preview is not available on web in this build.
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
        you: {props.driver ? `${props.driver.latitude.toFixed(5)}, ${props.driver.longitude.toFixed(5)}` : '—'}
      </Text>
    </View>
  );
}

