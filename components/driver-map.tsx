import React from 'react';
import { View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export type LatLng = { latitude: number; longitude: number };

export function DriverMap(props: { driver: LatLng | null }) {
  const region: Region = props.driver
    ? { latitude: props.driver.latitude, longitude: props.driver.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.2, longitudeDelta: 0.2 };

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={region} region={region}>
        {props.driver ? <Marker coordinate={props.driver} title="You" /> : null}
      </MapView>
    </View>
  );
}

