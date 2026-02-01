import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ProfileCard = ({ profile, onPress, loading }) => {
    const getIcon = (type) => {
        if (type === 'CLIENT') return 'person';
        return 'business';
    };

    const getColor = (type) => {
        if (type === 'CLIENT') return '#9B5DE5'; // Purple
        return '#F15BB5'; // Pink
    };

    const getTitle = (profile) => {
        if (profile.type === 'CLIENT') {
            return profile.name || 'Cliente';
        }
        return profile.enterpriseName;
    };

    const getSubtitle = (profile) => {
        if (profile.type === 'CLIENT') {
            return 'Buscar serviços para meu pet';
        }
        return 'Gerenciar meu negócio';
    };

    const color = getColor(profile.type);

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={onPress}
            disabled={loading}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={getIcon(profile.type)} size={32} color={color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.cardTitle, { color: color }]}>{getTitle(profile)}</Text>
                <Text style={styles.cardSubtitle}>{getSubtitle(profile)}</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="small" color={color} />
            ) : (
                <Ionicons name="chevron-forward" size={24} color={COLORS.TEXT_MUTED} />
            )}
        </TouchableOpacity>
    );
};

export default function RoleSelectionScreen({ navigation, route }) {
    const { phone, profiles } = route.params || {};
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);

    const handleSelectProfile = async (profile) => {
        setLoading(true);
        setSelectedProfile(profile.type);

        try {
            const selectResponse = await apiRequest('/auth/select-profile', 'POST', {
                phone: phone,
                profile_type: profile.type,
                enterprise_id: profile.enterpriseId
            });

            await login(selectResponse);

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
        } catch (error) {
            console.error('Profile selection error:', error);
            Alert.alert('Erro', 'Não foi possível selecionar o perfil. Tente novamente.');
            setLoading(false);
            setSelectedProfile(null);
        }
    };

    return (
        <LinearGradient
            colors={['#FDFBFF', '#F8F5FC', '#E8DEFF']}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.header}>
                    <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
                    <Text style={styles.subtitle}>Escolha como deseja acessar:</Text>
                </View>

                <View style={styles.cardsContainer}>
                    {profiles && profiles.map((profile, index) => (
                        <ProfileCard
                            key={index}
                            profile={profile}
                            onPress={() => handleSelectProfile(profile)}
                            loading={loading && selectedProfile === profile.type}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => navigation.navigate('AuthSelect')}
                    disabled={loading}
                >
                    <Text style={styles.logoutText}>Sair e usar outra conta</Text>
                </TouchableOpacity>

            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 25,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.TEXT_MUTED,
        marginTop: 5,
    },
    cardsContainer: {
        gap: 20,
        marginBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 24,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: COLORS.TEXT_MUTED,
        lineHeight: 18,
    },
    logoutButton: {
        alignSelf: 'center',
        padding: 15,
        marginTop: 'auto',
    },
    logoutText: {
        color: COLORS.TEXT_MUTED,
        fontSize: 14,
        fontWeight: '600',
    },
});
