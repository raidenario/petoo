import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getClientProfile, updateClientProfile, getClientPets } from '../services/api';

export default function ProfileScreen({ navigation, route }) {
    const { user, updateUser, logout, isAuthenticated } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pets, setPets] = useState([]);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        photo: null,
        addresses: [],
    });

    const [tempProfile, setTempProfile] = useState({});

    // Auto-edit if coming from Home to register address
    useEffect(() => {
        if (route.params?.edit) {
            setIsEditing(true);
        }
    }, [route.params]);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            // Get profile from API
            const response = await getClientProfile();
            const clientData = response.client || response;

            const profileData = {
                name: clientData.name || user?.name || '',
                email: clientData.email || user?.email || '',
                phone: clientData.phone || user?.phone || '',
                photo: clientData.avatar_url || clientData.avatarUrl || null,
                addresses: [
                    // Mock addresses for now - can be enhanced with real address API
                    { id: '1', label: 'Casa', details: 'Adicione seu endereço' },
                ],
            };

            setProfile(profileData);
            setTempProfile(profileData);

            // Also fetch pets for quick preview
            try {
                const petsResponse = await getClientPets();
                const petsData = petsResponse.pets || petsResponse.data || petsResponse || [];
                setPets(Array.isArray(petsData) ? petsData.slice(0, 2) : []);
            } catch (e) {
                console.log('Could not load pets preview:', e.message);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Fallback to auth context user data
            if (user) {
                setProfile({
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    photo: user.avatar_url || null,
                    addresses: [],
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateClientProfile({
                name: tempProfile.name,
                email: tempProfile.email,
            });

            setProfile({ ...profile, ...tempProfile });
            await updateUser({ name: tempProfile.name, email: tempProfile.email });

            setIsEditing(false);
            Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Erro', error.message || 'Não foi possível salvar o perfil.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Sair',
            'Tem certeza que deseja sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'AuthSelect' }],
                        });
                    }
                }
            ]
        );
    };

    const renderPet = (pet) => (
        <View key={pet.id} style={styles.petCard}>
            <View style={styles.petIconCircle}>
                <Ionicons name="paw" size={24} color={COLORS.PRIMARY} />
            </View>
            <View style={styles.petInfo}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petDetails}>{pet.breed || pet.species || 'Pet'}</Text>
            </View>
        </View>
    );

    const renderAddress = (address) => (
        <View key={address.id} style={styles.addressCard}>
            <View style={styles.addressIconCircle}>
                <Ionicons
                    name={address.label === 'Casa' ? 'home-outline' : 'business-outline'}
                    size={20}
                    color={COLORS.PRIMARY}
                />
            </View>
            <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{address.label}</Text>
                <Text style={styles.addressDetails}>{address.details}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Carregando perfil...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[COLORS.BG_LIGHTER, '#FFFDF9']}
                style={styles.background}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Meu Perfil</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    {/* Profile Photo */}
                    <View style={styles.photoSection}>
                        <View style={styles.photoContainer}>
                            {profile.photo ? (
                                <Image source={{ uri: profile.photo }} style={styles.photo} />
                            ) : (
                                <Ionicons name="person" size={60} color="#E8DEFF" />
                            )}
                            {isEditing && (
                                <TouchableOpacity style={styles.changePhotoButton}>
                                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isEditing ? (
                            <TextInput
                                style={styles.nameInput}
                                value={tempProfile.name}
                                onChangeText={(text) => setTempProfile({ ...tempProfile, name: text })}
                                placeholder="Seu nome completo"
                            />
                        ) : (
                            <Text style={styles.profileName}>{profile.name || 'Nome não informado'}</Text>
                        )}

                        <Text style={styles.profilePhone}>{profile.phone}</Text>
                        <Text style={styles.profileStatus}>Cliente Petoo desde 2026</Text>

                        {/* Edit Action */}
                        <TouchableOpacity
                            style={[styles.editActionLink, saving && styles.editActionLinkDisabled]}
                            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                            ) : (
                                <>
                                    <Ionicons name={isEditing ? "checkmark-sharp" : "create-outline"} size={18} color={COLORS.PRIMARY} />
                                    <Text style={styles.editActionText}>{isEditing ? "Salvar Perfil" : "Editar Perfil"}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Email Section (editable) */}
                    {isEditing && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Email</Text>
                            <View style={styles.inputCard}>
                                <Ionicons name="mail-outline" size={20} color={COLORS.PRIMARY} />
                                <TextInput
                                    style={styles.emailInput}
                                    value={tempProfile.email}
                                    onChangeText={(text) => setTempProfile({ ...tempProfile, email: text })}
                                    placeholder="seu@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    )}

                    {/* Addresses Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Meus Endereços</Text>
                            {isEditing && (
                                <TouchableOpacity>
                                    <Text style={styles.addText}>+ Adicionar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {profile.addresses.map(renderAddress)}
                    </View>

                    {/* Pets Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Meus Pets</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('MyPets')}>
                                <Text style={styles.addText}>Ver todos</Text>
                            </TouchableOpacity>
                        </View>
                        {pets.length > 0 ? (
                            pets.map(renderPet)
                        ) : (
                            <View style={styles.noPetsCard}>
                                <Text style={styles.noPetsText}>Nenhum pet cadastrado</Text>
                                <TouchableOpacity
                                    style={styles.addPetButton}
                                    onPress={() => navigation.navigate('MyPets')}
                                >
                                    <Text style={styles.addPetButtonText}>Adicionar Pet</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Logout Button */}
                    {!isEditing && (
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={20} color={COLORS.PRIMARY} />
                            <Text style={styles.logoutText}>Sair da Conta</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.BG_LIGHTER,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: COLORS.PRIMARY_LIGHT,
    },
    background: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        marginBottom: 20,
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
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    photoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 4,
        borderColor: '#E8DEFF',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
        position: 'relative',
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    profilePhone: {
        fontSize: 14,
        color: COLORS.PRIMARY,
        marginTop: 4,
        fontWeight: '500',
    },
    nameInput: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        borderBottomWidth: 1,
        borderBottomColor: '#E8DEFF',
        textAlign: 'center',
        paddingVertical: 5,
        minWidth: 200,
    },
    profileStatus: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
        marginTop: 5,
        marginBottom: 10,
    },
    editActionLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: COLORS.BG_LIGHT,
        borderRadius: 20,
        minWidth: 120,
        justifyContent: 'center',
    },
    editActionLinkDisabled: {
        opacity: 0.7,
    },
    editActionText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    addText: {
        fontSize: 14,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 20,
        gap: 15,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    emailInput: {
        flex: 1,
        fontSize: 16,
        color: '#2D3436',
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    addressIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.BG_LIGHTER,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    addressInfo: {
        flex: 1,
    },
    addressLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 2,
    },
    addressDetails: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
    },
    petCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    petIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    petInfo: {
        flex: 1,
    },
    petName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    petDetails: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
    },
    noPetsCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    noPetsText: {
        fontSize: 14,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 10,
    },
    addPetButton: {
        backgroundColor: COLORS.BG_LIGHT,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
    },
    addPetButtonText: {
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 15,
        gap: 10,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
});
