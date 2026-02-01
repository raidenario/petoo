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
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { requestOtp } from '../../services/api';

export default function LoginScreen({ navigation }) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    // Format phone number for display
    const formatPhoneForDisplay = (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    };

    // Format phone for API (E.164)
    const formatPhoneForApi = (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        return `+55${cleaned}`;
    };

    const handlePhoneChange = (text) => {
        const cleaned = text.replace(/\D/g, '');
        setPhoneNumber(cleaned.slice(0, 11)); // Max 11 digits
    };

    const handleSendCode = async () => {
        if (phoneNumber.length < 10) {
            Alert.alert('Erro', 'Por favor, insira um número de telefone válido.');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = formatPhoneForApi(phoneNumber);
            const response = await requestOtp(formattedPhone);

            console.log('OTP Response:', response);

            // Navigate to verification screen with phone number
            navigation.navigate('Verification', {
                phoneNumber: formattedPhone,
                flow: 'login',
                // In dev mode, we might get the token in response for testing
                debugToken: response.debug?.token
            });
        } catch (error) {
            console.error('OTP Request Error:', error);
            Alert.alert(
                'Erro',
                error.message || 'Não foi possível enviar o código. Tente novamente.'
            );
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
                colors={['#F5EBE0', '#E3D5CA', '#D6CCC2']}
                style={styles.gradient}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={28} color="#8B6F47" />
                </TouchableOpacity>

                <View style={styles.content}>
                    <Text style={styles.title}>Bem-vindo de volta!</Text>
                    <Text style={styles.subtitle}>Insira seu número de telefone para entrar</Text>

                    <View style={styles.inputContainer}>
                        <View style={styles.phoneInputRow}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+55</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="(00) 00000-0000"
                                placeholderTextColor="#A0826D"
                                keyboardType="phone-pad"
                                value={formatPhoneForDisplay(phoneNumber)}
                                onChangeText={handlePhoneChange}
                                autoFocus
                                editable={!loading}
                            />
                        </View>
                        <Text style={styles.helperText}>
                            Enviaremos um código de verificação por SMS.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.nextButton, { backgroundColor: '#8B6F47', opacity: loading ? 0.7 : 1 }]}
                        activeOpacity={0.9}
                        onPress={handleSendCode}
                        disabled={loading}
                    >
                        <View style={styles.buttonContent}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Enviar Código</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
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
        paddingHorizontal: 30,
    },
    backButton: {
        marginTop: 60,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8B6F47',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    content: {
        marginTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#8B6F47',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#A0826D',
        marginBottom: 40,
    },
    inputContainer: {
        marginBottom: 40,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    countryCode: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#E3D5CA',
        marginRight: 10,
    },
    countryCodeText: {
        fontSize: 18,
        color: '#8B6F47',
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 15,
        fontSize: 18,
        color: '#8B6F47',
        borderWidth: 1,
        borderColor: '#E3D5CA',
    },
    helperText: {
        color: '#A0826D',
        fontSize: 13,
        marginTop: 15,
        textAlign: 'center',
    },
    nextButton: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#8B6F47',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
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
    },
});
