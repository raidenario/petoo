import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function BanhoTosaScreen({ navigation }) {
    return (
        <LinearGradient
            colors={[COLORS.BG_LIGHT, COLORS.BG_LIGHTER, '#FFFFFF']}
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Image
                    source={require('../../assets/banho-tosa-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Banho & Tosa</Text>
                <Text style={styles.subtitle}>Em desenvolvimento... 🚧</Text>
                <Text style={styles.description}>
                    Em breve você poderá agendar serviços de banho e tosa para seu pet!
                </Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 30,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 20,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 20,
    },
    description: {
        fontSize: 16,
        color: COLORS.TEXT_MUTED,
        textAlign: 'center',
        lineHeight: 24,
    },
});
