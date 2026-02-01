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
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

import * as ImagePicker from 'expo-image-picker';

export default function BusinessRegisterScreen({ navigation, route }) {
    const { inviteCode, email: initialEmail } = route.params || {};
    // Prefilled for testing "Giovanna Pet Hotel"
    const [companyName, setCompanyName] = useState('Giovanna Pet Hotel');
    const [cnpj, setCnpj] = useState('12.345.678/0001-90');
    const [address, setAddress] = useState('Rua das Flores, 123, Jardim Botânico, Rio de Janeiro - RJ');
    const [phoneNumber, setPhoneNumber] = useState('21999999999');
    const [serviceType, setServiceType] = useState('hotel'); // 'banho_tosa', 'hotel', 'ambos'
    const [operatingHours, setOperatingHours] = useState('Seg a Dom: 07:00 - 20:00');
    const [logo, setLogo] = useState(null);

    const handlePickLogo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], // Updated: generic mediaTypes is deprecated in some versions, 'images' is simpler directly if supported or ImagePicker.MediaTypeOptions.Images
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                setLogo(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
    };

    const isFormValid = () => {
        return (
            companyName.trim() !== '' &&
            cnpj.trim().length >= 14 &&
            address.trim() !== '' &&
            phoneNumber.length >= 10 &&
            serviceType !== '' &&
            operatingHours.trim() !== ''
        );
    };

    const handleContinue = () => {
        if (!isFormValid()) {
            Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios (*) para continuar.');
            return;
        }

        const registrationDate = new Date().toISOString();

        // Enviar para verificação de SMS
        navigation.navigate('Verification', {
            phoneNumber,
            flow: 'register',
            registerType: 'business',
            businessData: {
                name: companyName,
                cnpj,
                address,
                serviceType,
                operatingHours,
                registrationDate,
                inviteCode,
                email: initialEmail,
                logo: logo || 'default_logo'
            }
        });
    };

    const renderServiceOption = (type, label, icon) => (
        <TouchableOpacity
            style={[
                styles.serviceOption,
                serviceType === type && { borderColor: COLORS.PRIMARY, backgroundColor: COLORS.PRIMARY + '10' }
            ]}
            onPress={() => setServiceType(type)}
        >
            <Ionicons name={icon} size={24} color={serviceType === type ? COLORS.PRIMARY : COLORS.TEXT_MUTED} />
            <Text style={[styles.serviceLabel, serviceType === type && { color: COLORS.PRIMARY, fontWeight: 'bold' }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[COLORS.BG_LIGHTER, '#F0F9F8']}
                style={styles.gradient}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Cadastro Empresa 🏢</Text>
                        <Text style={styles.subtitle}>Preencha os dados obrigatórios para sua empresa aparecer no Petoo.</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Logo Upload Simulation */}
                        <View style={styles.logoSection}>
                            <TouchableOpacity style={styles.logoCircle} onPress={handlePickLogo}>
                                {logo ? (
                                    <Image source={{ uri: logo }} style={styles.logoImage} />
                                ) : (
                                    <Ionicons name="camera-outline" size={30} color={COLORS.PRIMARY} />
                                )}
                            </TouchableOpacity>
                            <Text style={styles.label}>Logotipo da Empresa *</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome Fantasia *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="business-outline" size={20} color={COLORS.PRIMARY} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Pet Palace Resort"
                                    placeholderTextColor={COLORS.TEXT_MUTED}
                                    value={companyName}
                                    onChangeText={setCompanyName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CNPJ *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="document-text-outline" size={20} color={COLORS.PRIMARY} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="00.000.000/0000-00"
                                    placeholderTextColor={COLORS.TEXT_MUTED}
                                    keyboardType="numeric"
                                    value={cnpj}
                                    onChangeText={setCnpj}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Telefone para Acesso *</Text>
                            <View style={styles.phoneInputRow}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryCodeText}>+55</Text>
                                </View>
                                <TextInput
                                    style={styles.inputPhone}
                                    placeholder="(00) 00000-0000"
                                    placeholderTextColor={COLORS.TEXT_MUTED}
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Endereço Completo *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="location-outline" size={20} color={COLORS.PRIMARY} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Rua, Número, Bairro, Cidade"
                                    placeholderTextColor={COLORS.TEXT_MUTED}
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tipo de Serviço *</Text>
                            <View style={styles.serviceRow}>
                                {renderServiceOption('banho_tosa', 'Banho & Tosa', 'water-outline')}
                                {renderServiceOption('hotel', 'Hotel Pet', 'home-outline')}
                                {renderServiceOption('ambos', 'Ambos', 'paw-outline')}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Horário de Funcionamento *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="time-outline" size={20} color={COLORS.PRIMARY} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Seg a Sex: 08:00 - 18:00"
                                    placeholderTextColor={COLORS.TEXT_MUTED}
                                    value={operatingHours}
                                    onChangeText={setOperatingHours}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                { backgroundColor: COLORS.PRIMARY },
                                !isFormValid() && styles.buttonDisabled
                            ]}
                            disabled={!isFormValid()}
                            onPress={handleContinue}
                        >
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>Enviar Código e Continuar</Text>
                                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    scrollContent: { paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 20 : 10 },
    backButton: {
        marginTop: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 4,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    header: { marginBottom: 25 },
    title: { fontSize: 26, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.TEXT_MUTED, lineHeight: 20 },
    form: { gap: 20 },
    logoSection: { alignItems: 'center', marginBottom: 10 },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.BG_LIGHT,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    logoImage: { width: '100%', height: '100%', borderRadius: 40 },
    inputGroup: { width: '100%' },
    label: { fontSize: 13, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY, marginBottom: 8, marginLeft: 2 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    phoneInputRow: { flexDirection: 'row', alignItems: 'center' },
    countryCode: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 16,
        marginRight: 10,
        elevation: 2,
    },
    countryCodeText: { fontSize: 15, color: COLORS.PRIMARY, fontWeight: 'bold' },
    inputPhone: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 16,
        fontSize: 15,
        color: COLORS.TEXT_PRIMARY,
        elevation: 2,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 15, fontSize: 15, color: COLORS.TEXT_PRIMARY },
    serviceRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
    serviceOption: {
        flex: 1,
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
        gap: 5,
    },
    serviceLabel: { fontSize: 10, color: COLORS.TEXT_MUTED, textAlign: 'center' },
    button: { borderRadius: 18, overflow: 'hidden', marginTop: 10, elevation: 5 },
    buttonDisabled: { opacity: 0.5 },
    buttonContent: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
