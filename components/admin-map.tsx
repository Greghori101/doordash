import React from 'react';
import { View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export type LatLng = { latitude: number; longitude: number };

type DriverMarker = { id: string; location: LatLng };

function computeRegion(points: LatLng[], fallback: Region): Region {
    if (points.length === 0) return fallback;
    if (points.length === 1) {
        return { latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    }
    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    for (const p of points) {
        minLat = Math.min(minLat, p.latitude);
        maxLat = Math.max(maxLat, p.latitude);
        minLng = Math.min(minLng, p.longitude);
        maxLng = Math.max(maxLng, p.longitude);
    }

    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max(0.02, (maxLat - minLat) * 2 + 0.01);
    const longitudeDelta = Math.max(0.02, (maxLng - minLng) * 2 + 0.01);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export function AdminMap(props: {
    drivers: DriverMarker[];
    pickup?: LatLng | null;
    dropoff?: LatLng | null;
}) {
    const points = React.useMemo(() => {
        const list = props.drivers.map((d) => d.location);
        if (props.pickup) list.push(props.pickup);
        if (props.dropoff) list.push(props.dropoff);
        return list;
    }, [props.drivers, props.pickup, props.dropoff]);

    const fallback: Region = { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    const region = computeRegion(points, fallback);

    return (
        <View style={{ flex: 1 }}>
            <MapView style={{ flex: 1 }} initialRegion={region} region={region}>
                {props.drivers.map((d) => (
                    <Marker key={d.id} coordinate={d.location} title="Driver" description={d.id} />
                ))}
                {props.pickup ? <Marker coordinate={props.pickup} title="Pickup" /> : null}
                {props.dropoff ? <Marker coordinate={props.dropoff} title="Dropoff" /> : null}
            </MapView>
        </View>
    );
}

