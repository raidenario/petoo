import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import HotelPetLoading from '../components/HotelPetLoading';

export default function LoadingDemoScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <HotelPetLoading />

            {/* Botão de voltar flutuante */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#8B6F47',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8B6F47',
    },
});
