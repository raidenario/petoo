import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { requestOtp } from '../../services/api';
import { ActivityIndicator } from 'react-native';

export default function AuthSelectScreen({ navigation }) {
    const [phoneNumber, setPhoneNumber] = useState('');

    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (phoneNumber.length < 8) {
            Alert.alert('Ops!', 'Por favor, insira um número válido para continuar.');
            return;
        }

        setLoading(true);
        try {
            // Format phone to E.164 (+55...)
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            const formattedPhone = `+55${cleanPhone}`;

            const response = await requestOtp(formattedPhone);

            // Navega para verificação
            navigation.navigate('Verification', {
                phoneNumber: formattedPhone,
                flow: 'entry',
                registerType: 'client',
                debugToken: response.debug?.token // Pass token in dev mode
            });
        } catch (error) {
            console.error('OTP Request Error:', error);
            Alert.alert('Erro', error.message || 'Não foi possível enviar o código. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#FDFBFF', '#F8F5FC', '#E8DEFF']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Top Section: Logo & Welcome */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../../assets/petoo-logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <View style={styles.subtitleRow}>
                            <Text style={styles.subtitle}>O melhor para o seu pet</Text>
                            <Ionicons name="paw" size={18} color={COLORS.PRIMARY_LIGHT} style={{ marginLeft: 6 }} />
                        </View>
                    </View>

                    {/* Middle Section: Phone Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Seu número para começar</Text>
                        <View style={styles.phoneInputRow}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+55</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="(00) 00000-0000"
                                placeholderTextColor={COLORS.TEXT_MUTED}
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.continueButton, { backgroundColor: COLORS.PRIMARY }]}
                            activeOpacity={0.9}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            <View style={styles.buttonContent}>
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Continuar</Text>
                                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Section: Business Link */}
                    <View style={styles.footer}>
                        <View style={styles.businessDivider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity
                            style={styles.businessButton}
                            onPress={() => navigation.navigate('BusinessInvite')}
                        >
                            <Ionicons name="business-outline" size={20} color={COLORS.PRIMARY} />
                            <Text style={styles.businessButtonText}>Parceiro Petoo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ padding: 10, marginTop: 10 }}
                            onPress={() => navigation.navigate('AdminRequests')}
                        >
                            <Text style={{ color: '#CCC', fontSize: 12 }}>Admin (Dev)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 30,
        justifyContent: 'space-between',
        paddingTop: 80,
        paddingBottom: 50,
    },
    header: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: '600',
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -15,
    },
    inputSection: {
        width: '100%',
        marginTop: -150,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 15,
        textAlign: 'center',
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    countryCode: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#E8DEFF',
        marginRight: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    countryCodeText: {
        fontSize: 18,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 18,
        fontSize: 18,
        color: '#2D3436',
        borderWidth: 1.5,
        borderColor: '#E8DEFF',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    continueButton: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonContent: {
        paddingVertical: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    footer: {
        width: '100%',
        alignItems: 'center',
    },
    businessDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        width: '60%',
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E8DEFF',
    },
    dividerText: {
        paddingHorizontal: 15,
        color: COLORS.TEXT_MUTED,
        fontSize: 14,
    },
    logoImage: {
        marginLeft: 20,
        marginTop: 30,
        width: 350,
        height: 200,
    },
    businessButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    businessButtonText: {
        fontSize: 16,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
});
