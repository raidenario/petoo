import React from 'react';
import { View, Text } from 'react-native';

export default function MainScreen({ route }) {
    const mode = route?.params?.mode || 'client';

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Welcome to Petoo!</Text>
            <Text>Mode: {mode}</Text>
        </View>
    );
}
