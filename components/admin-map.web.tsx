import React from 'react';
import { Text, View } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

type DriverMarker = { id: string; location: LatLng };

export function AdminMap(props: { drivers: DriverMarker[]; pickup?: LatLng | null; dropoff?: LatLng | null }) {
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.06)' }}>
      <Text selectable style={{ fontWeight: '800' }}>
        Map preview is not available on web in this build.
      </Text>
      <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
        drivers: {props.drivers.length}
      </Text>
      {props.pickup ? (
        <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
          pickup: {props.pickup.latitude.toFixed(5)}, {props.pickup.longitude.toFixed(5)}
        </Text>
      ) : null}
      {props.dropoff ? (
        <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
          dropoff: {props.dropoff.latitude.toFixed(5)}, {props.dropoff.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

