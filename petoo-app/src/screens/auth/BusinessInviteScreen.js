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
    ScrollView,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { apiRequest } from '../../services/api';

export default function BusinessInviteScreen({ navigation }) {
    const [inviteLink, setInviteLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Request Invite State
    const [requestEmail, setRequestEmail] = useState('');
    const [requestPhone, setRequestPhone] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);

    const handleValidateLink = async () => {
        if (!inviteLink.trim()) {
            Alert.alert('Erro', 'Por favor, insira seu link ou código de convite.');
            return;
        }

        setLoading(true);
        try {
            const response = await apiRequest('/invites/validate', 'POST', { code: inviteLink });

            if (response.valid) {
                navigation.navigate('BusinessRegister', {
                    inviteCode: inviteLink,
                    role: response.role,
                    email: response.email
                });
            } else {
                Alert.alert('Convite Inválido', response.error || 'Código não encontrado.');
            }
        } catch (error) {
            Alert.alert(
                'Convite Inválido',
                error.message || 'Este link ou código não foi encontrado em nosso sistema.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRequestInvite = async () => {
        if (!requestEmail || !requestPhone) {
            Alert.alert('Erro', 'Preencha todos os campos.');
            return;
        }

        // Format phone number
        const cleanPhone = requestPhone.replace(/\D/g, '');
        if (cleanPhone.length !== 11) {
            Alert.alert('Erro', 'Número de telefone inválido. Use o formato (XX) XXXXX-XXXX');
            return;
        }

        setRequestLoading(true);
        try {
            await apiRequest('/invites/request', 'POST', {
                phone: `+55${cleanPhone}`,
                email: requestEmail
            });
            Alert.alert(
                'Solicitação Enviada',
                'Sua solicitação foi enviada para análise. Entraremos em contato em breve.'
            );
            setModalVisible(false);
            setRequestEmail('');
            setRequestPhone('');
        } catch (error) {
            Alert.alert('Erro', error.message || 'Não foi possível enviar a solicitação.');
        } finally {
            setRequestLoading(false);
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
                    </TouchableOpacity>

                    {/* Secret Admin Button (Dev Only) */}
                    <TouchableOpacity
                        style={styles.adminBadge}
                        onLongPress={() => navigation.navigate('AdminRequests')}
                    >
                        <Text style={styles.adminBadgeText}>👨‍💼 Admin (Dev)</Text>
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <View style={styles.headerIcon}>
                            <Ionicons name="mail-open-outline" size={60} color={COLORS.PRIMARY} />
                        </View>

                        <Text style={styles.title}>Convite para Parcerias</Text>
                        <Text style={styles.subtitle}>
                            Para garantir a qualidade, aceitamos novas empresas apenas via convite de nossos consultores.
                        </Text>

                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Seu link ou código de convite</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="petoo-convite-xyz"
                                placeholderTextColor={COLORS.TEXT_MUTED}
                                value={inviteLink}
                                onChangeText={setInviteLink}
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.validateButton, { backgroundColor: COLORS.PRIMARY }]}
                            activeOpacity={0.9}
                            onPress={handleValidateLink}
                            disabled={loading}
                        >
                            <View style={styles.buttonContent}>
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Acessar Cadastro</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>Não tem um convite?</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity
                            style={styles.contactButton}
                            activeOpacity={0.8}
                            onPress={() => setModalVisible(true)}
                        >
                            <Ionicons name="chatbubbles-outline" size={24} color={COLORS.PRIMARY} />
                            <Text style={styles.contactButtonText}>Solicitar uma Parceria</Text>
                        </TouchableOpacity>

                        <Text style={styles.contactInfo}>
                            Nossa equipe avaliará sua empresa e retornará em até 24h.
                        </Text>
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Request Invite Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Solicitar Parceria</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.TEXT_MUTED} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDescription}>
                            Informe seus dados para que um consultor possa criar seu acesso.
                        </Text>

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>E-mail Comercial</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="exemplo@empresa.com"
                                value={requestEmail}
                                onChangeText={setRequestEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Telefone</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="(XX) XXXXX-XXXX"
                                value={requestPhone}
                                onChangeText={setRequestPhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.submitRequestButton}
                            onPress={handleRequestInvite}
                            disabled={requestLoading}
                        >
                            {requestLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitRequestText}>Enviar Solicitação</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 25,
        paddingBottom: 40,
    },
    backButton: {
        marginTop: 60,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    adminBadge: {
        position: 'absolute',
        top: 60,
        right: 0,
        backgroundColor: '#F1F2F6',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        borderWidth: 1,
        borderColor: '#DFE2E6',
    },
    adminBadgeText: {
        fontSize: 12,
        color: '#747D8C',
        fontWeight: 'bold',
    },
    content: {
        marginTop: 20,
        alignItems: 'center',
    },
    headerIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.PRIMARY_LIGHT,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    inputSection: {
        width: '100%',
        marginBottom: 30,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 10,
        marginLeft: 5,
    },
    input: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 15,
        fontSize: 16,
        color: '#2D3436',
        borderWidth: 1.5,
        borderColor: '#E8DEFF',
    },
    validateButton: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        marginBottom: 50,
    },
    buttonContent: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        width: '100%',
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
    contactButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.PRIMARY,
        marginBottom: 15,
    },
    contactButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    contactInfo: {
        fontSize: 12,
        color: COLORS.TEXT_MUTED,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 30,
        paddingBottom: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    modalDescription: {
        fontSize: 14,
        color: COLORS.TEXT_MUTED,
        marginBottom: 25,
        lineHeight: 20,
    },
    modalInputGroup: {
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#F1F2F6',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 12,
        fontSize: 16,
        color: '#2D3436',
    },
    submitRequestButton: {
        backgroundColor: COLORS.PRIMARY,
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    submitRequestText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
