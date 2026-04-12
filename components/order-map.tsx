import React from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { doordropMapStyle } from '@/src/maps/map-style';

export type LatLng = { latitude: number; longitude: number };

export function OrderMap(props: { region: Region; pickup: LatLng | null; dropoff: LatLng | null; driver?: LatLng | null }) {
    return (
        <View style={{ flex: 1 }}>
            <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={{ flex: 1 }}
                customMapStyle={doordropMapStyle as any}
                initialRegion={props.region}
                region={props.region}
            >
                {props.pickup ? <Marker coordinate={props.pickup} title="Pickup" /> : null}
                {props.dropoff ? <Marker coordinate={props.dropoff} title="Dropoff" /> : null}
                {props.driver ? <Marker coordinate={props.driver} title="Driver" /> : null}
            </MapView>
        </View>
    );
}
