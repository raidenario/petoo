import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

export default function HotelPetLoading() {
    const fadeAnimation = useRef(new Animated.Value(0)).current;
    const scaleAnimation = useRef(new Animated.Value(0.8)).current;
    const pulseAnimation = useRef(new Animated.Value(1)).current;
    const glowAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animação de fade in inicial
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Animação de escala inicial com bounce
        Animated.spring(scaleAnimation, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Animação de pulsação contínua (zoom in/out)
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnimation, {
                    toValue: 1.1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnimation, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        // Animação de brilho
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnimation, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnimation, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ])
        );

        pulseLoop.start();
        glowLoop.start();

        return () => {
            pulseLoop.stop();
            glowLoop.stop();
        };
    }, []);

    // Interpolação para o brilho
    const glowOpacity = glowAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <LinearGradient
            colors={[COLORS.BG_LIGHT, COLORS.BG_LIGHTER, '#FFFFFF']}
            style={styles.container}
        >
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnimation,
                        transform: [{ scale: scaleAnimation }],
                    },
                ]}
            >
                {/* Círculo de fundo com brilho */}
                <Animated.View
                    style={[
                        styles.iconCircle,
                        {
                            shadowOpacity: glowOpacity,
                        },
                    ]}
                >
                    {/* Imagem do Petoo com pulsação */}
                    <Animated.Image
                        source={require('../../assets/petoo-logo.png')}
                        style={[
                            styles.logoImage,
                            {
                                transform: [{ scale: pulseAnimation }],
                            },
                        ]}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Texto de loading */}
                <Text style={styles.loadingText}>Abrindo as portas...</Text>
                <Text style={styles.subText}>Preparando o Hotel Pet para você 🐾</Text>

                {/* Dots animados */}
                <View style={styles.dotsContainer}>
                    <AnimatedDot delay={0} />
                    <AnimatedDot delay={200} />
                    <AnimatedDot delay={400} />
                </View>
            </Animated.View>
        </LinearGradient>
    );
}

// Componente para os dots animados
function AnimatedDot({ delay }) {
    const dotAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const dotLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(dotAnimation, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(dotAnimation, {
                    toValue: 0,
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        dotLoop.start();

        return () => dotLoop.stop();
    }, [delay]);

    const dotScale = dotAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.5],
    });

    const dotOpacity = dotAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });

    return (
        <Animated.View
            style={[
                styles.dot,
                {
                    transform: [{ scale: dotScale }],
                    opacity: dotOpacity,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
    loadingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    subText: {
        fontSize: 15,
        color: COLORS.TEXT_MUTED,
        marginBottom: 30,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.PRIMARY_LIGHT,
    },
    logoImage: {
        width: 140,
        height: 140,
    },
});
