import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { verifyOtp, apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function VerificationScreen({ navigation, route }) {
    const { phoneNumber, flow, registerType, businessData, debugToken } = route.params;
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const inputs = useRef([]);
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    // Auto-fill debug token in dev mode
    useEffect(() => {
        if (debugToken) {
            const digits = debugToken.toString().split('');
            if (digits.length === 6) {
                setCode(digits);
            }
        }
    }, [debugToken]);

    const handleCodeChange = (text, index) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        // Move to next input
        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handleVerifyCode = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            Alert.alert('Erro', 'Por favor, insira o código completo de 6 dígitos.');
            return;
        }

        setLoading(true);
        try {
            // Verify OTP - now returns profiles instead of auto-creating client
            const otpResponse = await verifyOtp(phoneNumber, fullCode);

            console.log('OTP Response:', otpResponse);

            // Check if this is for business registration
            if (registerType === 'business') {
                // Prepare payload for Enterprise Registration
                const slug = businessData.name
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

                const payload = {
                    enterprise: {
                        name: businessData.name,
                        slug: slug,
                        contactPhone: phoneNumber,
                        address: businessData.address,
                        cnpj: businessData.cnpj,
                        serviceType: businessData.serviceType,
                    },
                    user: {
                        name: businessData.ownerName || 'Owner',
                        phone: phoneNumber,
                        email: businessData.email || null
                    },
                    inviteCode: businessData.inviteCode
                };

                console.log('Registering enterprise via API:', payload);

                const response = await apiRequest('/auth/enterprise/register', 'POST', payload);

                console.log('Enterprise Registered Successfully:', response);

                // Login with the new Enterprise User credentials
                const authData = {
                    token: response.token,
                    client: null,
                    user: {
                        id: response.user.id,
                        name: response.user.name,
                        phone: response.user.phone,
                        email: response.user.email
                    },
                    profiles: [{
                        type: 'ENTERPRISE',
                        enterpriseId: response.enterprise.id,
                        role: response.user.role,
                        enterpriseName: response.enterprise.name
                    }]
                };

                await login(authData);
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'BusinessDashboard' }],
                });

            } else {
                // Client/Login Normal Flow
                // otpResponse can have two formats:
                // 1. New format: { profiles: [...], phone, needs-selection }
                // 2. Legacy format: { client: {...}, token: '...' } for auto-created clients

                // Handle legacy format (backend auto-created client)
                if (otpResponse.client && otpResponse.token) {
                    console.log('Legacy response detected - client already exists or was auto-created');

                    // Check if this is a new user that needs to complete registration
                    if (otpResponse.client['is-new-user'] || !otpResponse.client.name) {
                        // New user - needs to complete registration
                        navigation.replace('ClientRegister', {
                            phoneNumber: phoneNumber,
                            clientId: otpResponse.client.id,
                            token: otpResponse.token
                        });
                        return;
                    }

                    // Existing user - login directly
                    const authData = {
                        token: otpResponse.token,
                        client: otpResponse.client,
                        user: null,
                        profiles: [{
                            type: 'CLIENT',
                            id: otpResponse.client.id,
                            name: otpResponse.client.name
                        }]
                    };
                    await login(authData);
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                    return;
                }

                // New format with profiles array
                const profiles = otpResponse.profiles || [];
                const responsePhone = otpResponse.phone || phoneNumber;

                console.log('Profiles found:', profiles);

                if (profiles.length === 0) {
                    // No profiles exist - navigate to client registration
                    navigation.replace('ClientRegister', { phoneNumber: phoneNumber });
                } else if (profiles.length === 1) {
                    // Single profile - auto-select and login
                    const profile = profiles[0];
                    const selectResponse = await apiRequest('/auth/select-profile', 'POST', {
                        phone: phoneNumber,
                        'profile-type': profile.type,
                        'enterprise-id': profile.enterpriseId || profile.enterprise_id
                    });

                    // Transform select-profile response to login format
                    const authData = {
                        token: selectResponse.token,
                        profiles: [selectResponse.profile]
                    };

                    // Add client or user data based on profile type
                    if (selectResponse.profile.type === 'CLIENT') {
                        authData.client = {
                            id: selectResponse.profile.id,
                            name: selectResponse.profile.name,
                            email: selectResponse.profile.email,
                            phone: phoneNumber,
                            avatar_url: selectResponse.profile['avatar-url'] || selectResponse.profile.avatar_url
                        };
                    } else {
                        authData.user = {
                            id: selectResponse.profile.id,
                            name: selectResponse.profile.name,
                            email: selectResponse.profile.email,
                            enterprise_id: selectResponse.profile['enterprise-id'] || selectResponse.profile.enterprise_id,
                            enterprise_name: selectResponse.profile['enterprise-name'] || selectResponse.profile.enterprise_name,
                            enterprise_slug: selectResponse.profile['enterprise-slug'] || selectResponse.profile.enterprise_slug
                        };
                    }

                    await login(authData);

                    // Navigate based on profile type
                    if (profile.type === 'CLIENT') {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
                        });
                    } else {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'BusinessDashboard' }],
                        });
                    }
                } else {
                    // Multiple profiles - show selection screen
                    navigation.replace('RoleSelection', {
                        phone: phoneNumber,
                        profiles: profiles
                    });
                }
            }
        } catch (error) {
            console.error("Verification ERROR:", error);
            Alert.alert(
                'Erro',
                error.message || 'Código inválido ou falha no registro da empresa.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            const { requestOtp } = await import('../../services/api');
            await requestOtp(phoneNumber);
            Alert.alert('Sucesso', 'Novo código enviado!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível reenviar o código.');
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
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                    >
                        <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={50} color={COLORS.PRIMARY} />
                        </View>
                        <Text style={styles.title}>Verificação</Text>
                        <Text style={styles.subtitle}>
                            Digite o código enviado para{'\n'}
                            <Text style={styles.phoneHighlight}>{phoneNumber}</Text>
                        </Text>
                    </View>

                    {/* Code Input */}
                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputs.current[index] = ref)}
                                style={[
                                    styles.codeInput,
                                    digit && styles.codeInputFilled
                                ]}
                                value={digit}
                                onChangeText={(text) => handleCodeChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                                editable={!loading}
                            />
                        ))}
                    </View>

                    {/* Resend Code */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Não recebeu o código?</Text>
                        <TouchableOpacity onPress={handleResend} disabled={loading}>
                            <Text style={styles.resendButton}>Reenviar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[
                            styles.verifyButton,
                            { backgroundColor: COLORS.PRIMARY, opacity: loading ? 0.7 : 1 }
                        ]}
                        activeOpacity={0.9}
                        onPress={handleVerifyCode}
                        disabled={loading}
                    >
                        <View style={styles.buttonContent}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Verificar</Text>
                                    <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        alignItems: 'center',
        marginBottom: 50,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.PRIMARY_LIGHT,
        textAlign: 'center',
        lineHeight: 22,
    },
    phoneHighlight: {
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    codeInput: {
        width: 50,
        height: 60,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#E8DEFF',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    codeInputFilled: {
        borderColor: COLORS.PRIMARY,
        backgroundColor: '#F8F5FC',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        gap: 5,
    },
    resendText: {
        color: COLORS.PRIMARY_LIGHT,
        fontSize: 14,
    },
    resendButton: {
        color: COLORS.PRIMARY,
        fontSize: 14,
        fontWeight: 'bold',
    },
    verifyButton: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonContent: {
        paddingVertical: 18,
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
});
