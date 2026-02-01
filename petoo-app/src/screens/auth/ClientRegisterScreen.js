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
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { apiRequest, setToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ClientRegisterScreen({ navigation, route }) {
    const { phoneNumber, clientId, token } = route.params || {};
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleCompleteRegistration = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'Por favor, informe seu nome.');
            return;
        }

        setLoading(true);
        try {
            // If we already have a token (from OTP verification), set it first
            if (token) {
                await setToken(token);
            }

            // Call the API to create/update client profile
            const response = await apiRequest('/auth/create-client', 'POST', {
                phone: phoneNumber,
                name: name.trim(),
                email: email.trim() || null,
            });

            console.log('Client created/updated:', response);

            // Prepare auth data for login
            const authData = {
                token: response.token || token,
                client: response.client,
                user: null,
                profiles: [{
                    type: 'CLIENT',
                    id: response.client.id,
                    name: response.client.name
                }]
            };

            // Login with the new data
            await login(authData);

            // Navigate to Home
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Erro', error.message || 'Não foi possível completar o cadastro.');
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Quase lá! 🐾</Text>
                        <Text style={styles.subtitle}>Preencha apenas o básico para começarmos.</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Seu Nome Completo *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color="#8B6F47" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: João Silva"
                                    placeholderTextColor="#A0826D"
                                    value={name}
                                    onChangeText={setName}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>E-mail (opcional)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#8B6F47" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: joao@email.com"
                                    placeholderTextColor="#A0826D"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Seu Endereço Principal (opcional)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="location-outline" size={20} color="#8B6F47" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Rua, Número, Bairro, Cidade"
                                    placeholderTextColor="#A0826D"
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color="#8B6F47" />
                            <Text style={styles.infoText}>
                                Você poderá editar e adicionar mais detalhes depois no seu perfil.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#8B6F47' }, (!name || loading) && styles.buttonDisabled]}
                            disabled={!name || loading}
                            onPress={handleCompleteRegistration}
                        >
                            <View style={styles.buttonContent}>
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Finalizar Cadastro</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 30,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 40,
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
    },
    form: {
        gap: 25,
    },
    inputGroup: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8B6F47',
        marginBottom: 10,
        marginLeft: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E3D5CA',
        paddingHorizontal: 15,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 18,
        fontSize: 16,
        color: '#8B6F47',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        padding: 15,
        borderRadius: 15,
        gap: 10,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#8B6F47',
        fontStyle: 'italic',
    },
    button: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#8B6F47',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonContent: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
