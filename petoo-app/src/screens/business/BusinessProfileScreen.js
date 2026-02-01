import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    Platform,
    StatusBar,
    Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

import { useAuth } from '../../context/AuthContext';

export default function BusinessProfileScreen({ navigation }) {
    const { businessTheme, updateTheme } = useTheme();
    const { selectedRole, user, logout } = useAuth();

    // Initialize with data from context/login
    const initialName = selectedRole?.enterpriseName || user?.name || 'Pet Shop';
    const initialAddress = selectedRole?.enterpriseAddress || 'Endereço não cadastrado';

    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState('O melhor resort para o seu pet descansar e se divertir com segurança e carinho.');
    const [address, setAddress] = useState(initialAddress);
    const [isOpen, setIsOpen] = useState(true);

    const THEME_COLORS = [COLORS.PRIMARY, '#F54927', '#F5B027', '#32EC98', '#27AE60', '#2D3436'];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FDFBFF', '#F0F9F8']} style={styles.background}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={businessTheme} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Minha Empresa</Text>
                    <TouchableOpacity style={[styles.saveHeaderBtn, { backgroundColor: businessTheme + '15' }]}>
                        <Text style={[styles.saveHeaderText, { color: businessTheme }]}>Salvar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Cover & Logo Section */}
                    <View style={styles.imagesSection}>
                        <View style={styles.coverImage}>
                            <Image source={require('../../../assets/hotel-1.png')} style={styles.fullImage} />
                            <TouchableOpacity style={styles.editImageBtn}>
                                <Ionicons name="camera" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.logoCircle}>
                            <Ionicons name="business" size={40} color={businessTheme} />
                            <TouchableOpacity style={[styles.editLogoBtn, { backgroundColor: businessTheme }]}>
                                <Ionicons name="pencil" size={12} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Status Toggle */}
                    <View style={styles.statusBox}>
                        <View>
                            <Text style={styles.statusTitle}>Loja Aberta</Text>
                            <Text style={styles.statusSubtitle}>Os clientes podem agendar agora</Text>
                        </View>
                        <Switch
                            value={isOpen}
                            onValueChange={setIsOpen}
                            trackColor={{ false: '#767577', true: businessTheme + '50' }}
                            thumbColor={isOpen ? businessTheme : '#f4f3f4'}
                        />
                    </View>

                    {/* Form Sections */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Informações Básicas</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: businessTheme }]}>Nome Fantasia</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: businessTheme }]}>Descrição / Slogan</Text>
                            <TextInput
                                style={[styles.input, { height: 80, paddingTop: 12 }]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Localização</Text>
                        <View style={styles.addressBox}>
                            <Ionicons name="location-outline" size={20} color={businessTheme} />
                            <Text style={styles.addressText}>{address}</Text>
                            <TouchableOpacity>
                                <Text style={[styles.editText, { color: businessTheme }]}>Alterar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Identidade Visual</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                            {THEME_COLORS.map((color, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => updateTheme(color)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        businessTheme === color && {
                                            borderWidth: 3,
                                            borderColor: '#FFF',
                                            shadowColor: color,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                        }
                                    ]}
                                >
                                    {businessTheme === color && (
                                        <Ionicons name="checkmark" size={20} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.addColorBtn}>
                                <Ionicons name="add" size={20} color={COLORS.TEXT_MUTED} />
                            </TouchableOpacity>
                        </ScrollView>
                        <Text style={styles.colorHint}>Esta cor será usada para personalizar sua página na busca.</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: businessTheme + '10' }]}
                        onPress={() => {
                            logout();
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'AuthSelect' }],
                            });
                        }}
                    >
                        <Ionicons name="log-out-outline" size={20} color={businessTheme} />
                        <Text style={[styles.logoutText, { color: businessTheme }]}>Sair da Conta Empresa</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: '#FFF',
    },
    backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    saveHeaderBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
    saveHeaderText: { fontWeight: 'bold' },
    content: { flex: 1 },
    imagesSection: { height: 200, marginBottom: 50 },
    coverImage: { height: 160, width: '100%', backgroundColor: '#E0E0E0' },
    fullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    editImageBtn: { position: 'absolute', right: 20, bottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    logoCircle: { position: 'absolute', bottom: -40, left: 25, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1 },
    editLogoBtn: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    statusBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.05 },
    statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
    statusSubtitle: { fontSize: 12, color: COLORS.TEXT_MUTED },
    formSection: { marginHorizontal: 20, marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#2D3436', marginBottom: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    input: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 18, fontSize: 15, color: '#2D3436', borderWidth: 1, borderColor: '#F0F0F0' },
    addressBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 18, gap: 12 },
    addressText: { flex: 1, fontSize: 13, color: '#2D3436', lineHeight: 18 },
    editText: { fontSize: 13, fontWeight: 'bold' },
    colorRow: { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 10, paddingRight: 20 },
    colorCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    addColorBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.BG_LIGHT, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.TEXT_MUTED },
    colorHint: { fontSize: 12, color: COLORS.TEXT_MUTED, fontStyle: 'italic' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFF0F0', paddingVertical: 18, marginHorizontal: 20, borderRadius: 20, marginTop: 10 },
    logoutText: { color: '#EB5757', fontWeight: 'bold', fontSize: 15 },
});
