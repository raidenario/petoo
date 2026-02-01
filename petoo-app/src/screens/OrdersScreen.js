import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getClientAppointments } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

export default function OrdersScreen({ navigation }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchAppointments = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError(null);

        try {
            const response = await getClientAppointments();
            console.log('Appointments response:', response);

            // Handle different response formats
            const data = response.appointments || response.data || response || [];
            setAppointments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError(err.message || 'Erro ao carregar seus pedidos');
            if (!refreshing) setAppointments([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAppointments(false);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAppointments(false);
    };

    const getStatusLabel = (status) => {
        const statusMap = {
            'ongoing': 'Em andamento',
            'IN_PROGRESS': 'Em andamento',
            'ACTIVE': 'Em andamento',
            'upcoming': 'Agendado',
            'SCHEDULED': 'Agendado',
            'PENDING': 'Pendente',
            'completed': 'Realizado',
            'COMPLETED': 'Realizado',
            'DONE': 'Realizado',
            'cancelled': 'Cancelado',
            'CANCELLED': 'Cancelado',
        };
        return statusMap[status] || status || 'Pendente';
    };

    const getStatusColor = (status) => {
        const upperStatus = status?.toUpperCase() || '';
        if (['IN_PROGRESS', 'ACTIVE', 'ONGOING'].includes(upperStatus)) return '#27AE60';
        if (['SCHEDULED', 'PENDING', 'UPCOMING'].includes(upperStatus)) return COLORS.PRIMARY;
        if (['COMPLETED', 'DONE'].includes(upperStatus)) return COLORS.TEXT_MUTED;
        if (['CANCELLED'].includes(upperStatus)) return '#EB5757';
        return COLORS.TEXT_MUTED;
    };

    const isOngoing = (status) => {
        const upperStatus = status?.toUpperCase() || '';
        return ['IN_PROGRESS', 'ACTIVE', 'ONGOING'].includes(upperStatus);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('pt-BR', options).replace(',', ' às');
    };

    const upcomingOrders = appointments.filter(o =>
        ['upcoming', 'ongoing', 'SCHEDULED', 'PENDING', 'IN_PROGRESS', 'ACTIVE'].includes(o.status?.toUpperCase() || o.status)
    );
    const pastOrders = appointments.filter(o =>
        ['completed', 'COMPLETED', 'DONE', 'CANCELLED'].includes(o.status?.toUpperCase() || o.status)
    );

    const renderOrderItem = ({ item }) => {
        const statusLabel = getStatusLabel(item.status);
        const statusColor = getStatusColor(item.status);
        const ongoing = isOngoing(item.status);

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => ongoing ? navigation.navigate('PetMonitoring', {
                    pet: {
                        name: item.pet_name || item.petName || 'Pet',
                        location: item.enterprise_name || item.enterpriseName || item.store_name
                    }
                }) : null}
                activeOpacity={0.7}
            >
                <View style={styles.orderHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    <Text style={styles.orderPrice}>
                        {item.price || item.total_price ? `R$ ${(item.price || item.total_price).toFixed(2).replace('.', ',')}` : '-'}
                    </Text>
                </View>

                <View style={styles.orderBody}>
                    <View style={[styles.storeIconContainer, { backgroundColor: COLORS.PRIMARY + '20' }]}>
                        <Ionicons name="business" size={24} color={COLORS.PRIMARY} />
                    </View>
                    <View style={styles.orderInfo}>
                        <Text style={styles.storeName}>
                            {item.enterprise_name || item.enterpriseName || item.store_name || 'Estabelecimento'}
                        </Text>
                        <Text style={styles.serviceName}>
                            {item.service_name || item.serviceName || item.service || 'Serviço'} •
                            <Text style={styles.petNameTag}> {item.pet_name || item.petName || 'Pet'}</Text>
                        </Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.PRIMARY_LIGHT} />
                            <Text style={styles.dateText}>
                                {formatDate(item.scheduled_date || item.scheduledDate || item.date)}
                            </Text>
                        </View>
                    </View>
                </View>

                {ongoing && (
                    <View style={styles.ongoingAction}>
                        <Text style={styles.ongoingText}>Acompanhar em tempo real</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={60} color={COLORS.PRIMARY_LIGHT} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
            <Text style={styles.emptySubtitle}>
                Seus agendamentos e pedidos aparecerão aqui!
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={[COLORS.BG_LIGHTER, '#FFFDF9']} style={styles.background}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Meus Pedidos</Text>
                    <View style={{ width: 44 }} />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={styles.loadingText}>Carregando pedidos...</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[COLORS.PRIMARY]}
                                tintColor={COLORS.PRIMARY}
                            />
                        }
                    >
                        {appointments.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            <>
                                {upcomingOrders.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Próximos</Text>
                                        {upcomingOrders.map(item => (
                                            <View key={item.id}>{renderOrderItem({ item })}</View>
                                        ))}
                                    </View>
                                )}

                                {pastOrders.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Anteriores</Text>
                                        {pastOrders.map(item => (
                                            <View key={item.id} style={{ opacity: 0.8 }}>{renderOrderItem({ item })}</View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}

                        <View style={styles.footerInfo}>
                            <Ionicons name="information-circle-outline" size={20} color={COLORS.PRIMARY_LIGHT} />
                            <Text style={styles.footerText}>Precisa de ajuda com algum pedido? Entre em contato com o suporte.</Text>
                        </View>
                    </ScrollView>
                )}

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
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 15,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
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
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.PRIMARY_LIGHT,
        textAlign: 'center',
    },
    orderCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 20,
        marginBottom: 15,
        elevation: 6,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    orderPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: '#2D3436',
    },
    orderBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    orderInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 2,
    },
    serviceName: {
        fontSize: 14,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 6,
    },
    petNameTag: {
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 13,
        color: COLORS.TEXT_MUTED,
        fontWeight: '500',
    },
    ongoingAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.BG_LIGHT,
        padding: 12,
        borderRadius: 15,
        marginTop: 15,
    },
    ongoingText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 20,
        gap: 10,
        marginBottom: 40,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.TEXT_MUTED,
        flexShrink: 1,
        textAlign: 'center',
        lineHeight: 18,
    },
});
