import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    StatusBar,
    FlatList,
    Animated,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getClientPets } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

export default function MyPetsScreen({ navigation }) {
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const fetchPets = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError(null);

        try {
            const response = await getClientPets();
            console.log('Pets response:', response);

            // Handle different response formats
            const petsData = response.pets || response.data || response || [];
            setPets(Array.isArray(petsData) ? petsData : []);
        } catch (err) {
            console.error('Error fetching pets:', err);
            setError(err.message || 'Erro ao carregar seus pets');
            // Keep existing pets on error during refresh
            if (!refreshing) setPets([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch on mount
    useEffect(() => {
        fetchPets();
    }, []);

    // Refresh when screen gets focus (e.g., after adding/editing pet)
    useFocusEffect(
        useCallback(() => {
            fetchPets(false);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchPets(false);
    };

    const formatPetAge = (birthDate) => {
        if (!birthDate) return '';
        const birth = new Date(birthDate);
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();

        if (years > 0) {
            return years === 1 ? '1 ano' : `${years} anos`;
        }
        return months <= 1 ? '1 mês' : `${months} meses`;
    };

    const renderPetItem = ({ item }) => {
        const age = item.age || formatPetAge(item.birth_date || item.birthDate);
        const breed = item.breed || item.species || 'Pet';
        const isInCare = item.status === 'Em cuidados' || item.status === 'IN_CARE';

        return (
            <View style={styles.petCardWrapper}>
                <TouchableOpacity
                    style={[
                        styles.petCard,
                        isInCare && styles.petCardWithAction
                    ]}
                    onPress={() => navigation.navigate('PetForm', { pet: item })}
                >
                    <View style={styles.petPhotoContainer}>
                        {item.photo || item.avatar_url || item.avatarUrl ? (
                            <Image
                                source={{ uri: item.photo || item.avatar_url || item.avatarUrl }}
                                style={styles.petPhoto}
                            />
                        ) : (
                            <Ionicons name="paw" size={30} color={COLORS.PRIMARY} />
                        )}
                    </View>
                    <View style={styles.petInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.petName}>{item.name}</Text>
                            {isInCare && (
                                <View style={styles.cuteStatusBadge}>
                                    <Animated.View
                                        style={{
                                            transform: [{ scale: pulseAnim }],
                                            flexDirection: 'row',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Ionicons name="heart" size={14} color="#FF6B6B" />
                                    </Animated.View>
                                    <Text style={styles.cuteStatusText}>Em cuidados</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.petBreed}>
                            {breed}{age ? ` • ${age}` : ''}
                        </Text>
                        {item.location && (
                            <View style={styles.locationContainer}>
                                <Ionicons name="business" size={12} color={COLORS.PRIMARY_LIGHT} />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {item.careType || 'Hospedagem'} no <Text style={styles.locationName}>{item.location}</Text>
                                </Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('PetForm', { pet: item })}
                    >
                        <Ionicons name="create-outline" size={22} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                </TouchableOpacity>

                {isInCare && (
                    <TouchableOpacity
                        style={styles.detailsActionContainer}
                        onPress={() => navigation.navigate('PetMonitoring', { pet: item })}
                        activeOpacity={0.9}
                    >
                        <View style={styles.detailsActionContent}>
                            <Ionicons name="journal-outline" size={18} color="#FFF" />
                            <Text style={styles.detailsActionLabel}>Ver Diário e Detalhes</Text>
                            <Ionicons name="chevron-forward" size={16} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="paw-outline" size={60} color={COLORS.PRIMARY_LIGHT} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum pet cadastrado</Text>
            <Text style={styles.emptySubtitle}>
                Adicione seus amiguinhos para agendar serviços rapidamente!
            </Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: COLORS.PRIMARY }]}
                onPress={() => navigation.navigate('PetForm')}
            >
                <Ionicons name="add" size={24} color="#FFF" />
                <Text style={styles.emptyButtonText}>Cadastrar Primeiro Pet</Text>
            </TouchableOpacity>
        </View>
    );

    const renderErrorState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="alert-circle-outline" size={60} color="#F2994A" />
            </View>
            <Text style={styles.emptyTitle}>Ops! Algo deu errado</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: COLORS.PRIMARY }]}
                onPress={() => fetchPets()}
            >
                <Ionicons name="refresh" size={24} color="#FFF" />
                <Text style={styles.emptyButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[COLORS.BG_LIGHTER, '#FFFDF9']}
                style={styles.background}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Meus Pets</Text>
                    <View style={{ width: 44 }} />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={styles.loadingText}>Carregando seus pets...</Text>
                    </View>
                ) : error && pets.length === 0 ? (
                    renderErrorState()
                ) : (
                    <FlatList
                        data={pets}
                        renderItem={renderPetItem}
                        keyExtractor={item => item.id?.toString() || Math.random().toString()}
                        contentContainerStyle={[
                            styles.listContent,
                            pets.length === 0 && styles.listContentEmpty
                        ]}
                        ListHeaderComponent={
                            pets.length > 0 ? (
                                <View style={styles.listHeader}>
                                    <Text style={styles.listSubtitle}>
                                        Gerencie seus amiguinhos para agendamentos mais rápidos.
                                    </Text>
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={renderEmptyState}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[COLORS.PRIMARY]}
                                tintColor={COLORS.PRIMARY}
                            />
                        }
                    />
                )}

                {/* Floating Add Button - only show if we have pets */}
                {pets.length > 0 && (
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: COLORS.PRIMARY }]}
                        onPress={() => navigation.navigate('PetForm')}
                    >
                        <View style={styles.fabContent}>
                            <Ionicons name="add" size={30} color="#FFFFFF" />
                            <Text style={styles.fabText}>Novo Pet</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: COLORS.PRIMARY_LIGHT,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    listContentEmpty: {
        flex: 1,
    },
    listHeader: {
        marginBottom: 25,
    },
    listSubtitle: {
        fontSize: 15,
        color: COLORS.PRIMARY_LIGHT,
        lineHeight: 22,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.PRIMARY_LIGHT,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 25,
        gap: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    petCardWrapper: {
        marginBottom: 20,
    },
    petCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 28,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    petCardWithAction: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        elevation: 4,
        shadowOffset: { width: 0, height: 4 },
    },
    petPhotoContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
        borderWidth: 2,
        borderColor: '#E8DEFF',
        overflow: 'hidden',
    },
    petPhoto: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    petInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    petName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#2D3436',
    },
    cuteStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#FFE0E0',
    },
    cuteStatusText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FF6B6B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    petBreed: {
        fontSize: 15,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: '500',
        marginBottom: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.BG_LIGHT,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: 'flex-start',
        gap: 6,
    },
    locationText: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        flexShrink: 1,
    },
    locationName: {
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    editButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.BG_LIGHTER,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    detailsActionContainer: {
        backgroundColor: COLORS.PRIMARY,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        marginTop: -2,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    detailsActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 12,
    },
    detailsActionLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    fabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 15,
        gap: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
