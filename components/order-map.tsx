import React from 'react';
import { View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export type LatLng = { latitude: number; longitude: number };

export function OrderMap(props: { region: Region; pickup: LatLng | null; dropoff: LatLng | null; driver?: LatLng | null }) {
    return (
        <View style={{ flex: 1 }}>
            <MapView style={{ flex: 1 }} initialRegion={props.region} region={props.region}>
                {props.pickup ? <Marker coordinate={props.pickup} title="Pickup" /> : null}
                {props.dropoff ? <Marker coordinate={props.dropoff} title="Dropoff" /> : null}
                {props.driver ? <Marker coordinate={props.driver} title="Driver" /> : null}
            </MapView>
        </View>
    );
}

