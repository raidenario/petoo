import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    StatusBar,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

const { width } = Dimensions.get('window');

// Helper to format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export default function BusinessDashboardScreen({ navigation }) {
    const { businessTheme } = useTheme();
    const { selectedRole, user } = useAuth(); // Assuming selectedRole has enterprise info
    const [selectedTab, setSelectedTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        stats: [],
        chartData: [],
        recentBookings: []
    });

    const enterpriseName = selectedRole?.enterpriseName || user?.name || 'Pet Shop';

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // In a real scenario, we might have a dedicated dashboard endpoint
                // Or we fetch separate resources concurrently
                // const stats = await apiRequest(`/enterprise/${selectedRole.enterpriseId}/stats`);
                // const bookings = await apiRequest(`/enterprise/${selectedRole.enterpriseId}/bookings?limit=5`);

                // For now, simulating "Real" data fetch with slight delay to show loading state
                // This forces the "Blank if empty" logic if we returned empty arrays
                await new Promise(r => setTimeout(r, 1000));

                // MOCK DATA REPLACING HARDCODED CONSTANTS
                // This should eventually come from the backend:
                // GET /api/v1/enterprise/dashboard

                setDashboardData({
                    stats: [
                        { id: '1', label: 'Faturamento', value: 'R$ 0,00', subValue: '+0% este mês', icon: 'cash-outline', color: '#27AE60' },
                        { id: '2', label: 'Pets Ativos', value: '0', subValue: '0 hospedados hoje', icon: 'paw-outline', color: businessTheme },
                        { id: '3', label: 'Agendamentos', value: '0', subValue: '0 para amanhã', icon: 'calendar-outline', color: '#F2994A' },
                        { id: '4', label: 'Nota Média', value: '-', subValue: '0 avaliações', icon: 'star-outline', color: '#F2C94C' },
                    ],
                    recentBookings: [],
                });
                console.log('Dashboard Data Loaded:', { enterpriseName });
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const STATS = dashboardData.stats;
    const RECENT_BOOKINGS = dashboardData.recentBookings;

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.greeting}>Olá, {enterpriseName}! 👋</Text>
                <Text style={[styles.headerSubtitle, { color: businessTheme }]}>Painel Administrativo</Text>
            </View>
            <TouchableOpacity
                style={[styles.profileBadge, { shadowColor: businessTheme }]}
                onPress={() => navigation.navigate('BusinessProfile')}
            >
                <View style={[styles.profileCircle, { backgroundColor: businessTheme + '10', borderColor: businessTheme + '30' }]}>
                    <Ionicons name="business" size={24} color={businessTheme} />
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderStats = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
        >
            {STATS.map((stat) => (
                <View key={stat.id} style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                        <Ionicons name={stat.icon} size={22} color={stat.color} />
                    </View>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={[styles.statSubValue, { color: stat.color }]}>{stat.subValue}</Text>
                </View>
            ))}
        </ScrollView>
    );

    const renderChart = () => {
        const data = dashboardData.chartData || [];

        return (
            <View style={styles.chartSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Movimentação Semanal</Text>
                    <TouchableOpacity>
                        <Text style={[styles.seeMoreText, { color: businessTheme }]}>Ver Detalhes</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.chartContainer}>
                    {data.length > 0 ? (
                        data.map((item, index) => (
                            <View key={index} style={styles.chartBarWrapper}>
                                <View style={styles.barBackground}>
                                    <View style={[styles.barFill, { height: `${item.value * 100}%` }]}>
                                        <LinearGradient
                                            colors={[businessTheme, businessTheme + '99']}
                                            style={styles.barGradient}
                                        />
                                    </View>
                                </View>
                                <Text style={styles.barLabel}>{item.day}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 13 }}>Sem dados desta semana</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderRecentBookings = () => (
        <View style={styles.tableSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hoje na Loja</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ActivePets')}>
                    <Text style={[styles.seeMoreText, { color: businessTheme }]}>Ver Todos</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.columnLabel, { flex: 2 }]}>Pet / Dono</Text>
                    <Text style={[styles.columnLabel, { flex: 2 }]}>Serviço</Text>
                    <Text style={[styles.columnLabel, { flex: 1.5 }]}>Status</Text>
                </View>
                {RECENT_BOOKINGS.map((booking) => (
                    <TouchableOpacity
                        key={booking.id}
                        style={styles.tableRow}
                        onPress={() => navigation.navigate('BusinessDiaryUpdate', { pet: booking })}
                    >
                        <View style={{ flex: 2 }}>
                            <Text style={styles.petName}>{booking.pet}</Text>
                            <Text style={styles.ownerName}>{booking.owner}</Text>
                        </View>
                        <View style={{ flex: 2 }}>
                            <Text style={styles.serviceName}>{booking.service}</Text>
                            <Text style={styles.timeLabel}>{booking.time}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: booking.color + '15', flex: 1.5 }]}>
                            <Text style={[styles.statusText, { color: booking.color }]}>{booking.status}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FDFBFF', '#F0F9F8']} style={styles.background}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {renderHeader()}
                    {renderStats()}
                    {renderChart()}
                    {renderRecentBookings()}

                    {/* Administrative Menu Cards */}
                    <View style={styles.adminMenu}>
                        <TouchableOpacity
                            style={styles.menuCard}
                            onPress={() => navigation.navigate('Employees')}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: businessTheme + '10' }]}>
                                <Ionicons name="people-outline" size={30} color={businessTheme} />
                            </View>
                            <Text style={styles.menuTitle}>Funcionários</Text>
                            <Text style={styles.menuDesc}>Gerencie sua equipe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuCard}
                            onPress={() => navigation.navigate('BusinessServices')}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: businessTheme + '10' }]}>
                                <Ionicons name="cut-outline" size={30} color={businessTheme} />
                            </View>
                            <Text style={styles.menuTitle}>Meus Serviços</Text>
                            <Text style={styles.menuDesc}>Preços e duração</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Bottom Tab Simulation */}
                <View style={[styles.bottomTab, { shadowColor: businessTheme }]}>
                    <TouchableOpacity style={styles.tabItem} onPress={() => setSelectedTab('home')}>
                        <Ionicons name="home" size={24} color={selectedTab === 'home' ? businessTheme : businessTheme + '50'} />
                        <Text style={selectedTab === 'home' ? [styles.tabLabelActive, { color: businessTheme }] : [styles.tabLabel, { color: businessTheme + '50' }]}>Início</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabItem}
                        onPress={() => navigation.navigate('BusinessBookings')}
                    >
                        <View>
                            <Ionicons name="calendar" size={24} color={businessTheme + '50'} />
                            {/* <View style={[styles.tabBadge, { backgroundColor: '#EB5757' }]}>
                                <Text style={styles.tabBadgeText}>3</Text>
                            </View> */}
                        </View>
                        <Text style={[styles.tabLabel, { color: businessTheme + '50' }]}>Agenda</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ActivePets')}>
                        <Ionicons name="paw" size={24} color={businessTheme + '50'} />
                        <Text style={[styles.tabLabel, { color: businessTheme + '50' }]}>Pets</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Employees')}>
                        <Ionicons name="people" size={24} color={businessTheme + '50'} />
                        <Text style={[styles.tabLabel, { color: businessTheme + '50' }]}>Equipe</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('BusinessProfile')}>
                        <Ionicons name="business" size={24} color={businessTheme + '50'} />
                        <Text style={[styles.tabLabel, { color: businessTheme + '50' }]}>Perfil</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 25,
        marginBottom: 25,
    },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#2D3436' },
    headerSubtitle: { fontSize: 14, color: COLORS.PRIMARY_LIGHT, marginTop: 4, fontWeight: '500' },
    profileBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    profileCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    statsContainer: {
        paddingLeft: 25,
        paddingRight: 10,
        paddingBottom: 25,
        marginTop: 3,
    },
    statCard: {
        backgroundColor: '#FFF',
        width: 160,
        padding: 20,
        borderRadius: 25,
        marginRight: 15,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    statLabel: { fontSize: 13, color: COLORS.TEXT_MUTED, marginBottom: 5, fontWeight: '600' },
    statValue: { fontSize: 20, fontWeight: '900', color: '#2D3436', marginBottom: 5 },
    statSubValue: { fontSize: 11, fontWeight: 'bold' },
    chartSection: {
        marginHorizontal: 25,
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 20,
        marginBottom: 25,
        elevation: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#2D3436' },
    seeMoreText: { fontSize: 13, color: COLORS.PRIMARY, fontWeight: 'bold' },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
        paddingBottom: 20,
    },
    chartBarWrapper: { alignItems: 'center', flex: 1 },
    barBackground: {
        height: 100,
        width: 12,
        backgroundColor: '#F8F5FC',
        borderRadius: 10,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: { width: '100%', borderRadius: 10 },
    barGradient: { flex: 1 },
    barLabel: { fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 8, fontWeight: 'bold' },
    tableSection: { marginHorizontal: 25, marginBottom: 25 },
    table: { backgroundColor: '#FFF', borderRadius: 25, padding: 15, elevation: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    tableHeader: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
    columnLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.TEXT_MUTED, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
    petName: { fontSize: 15, fontWeight: 'bold', color: '#2D3436' },
    ownerName: { fontSize: 12, color: COLORS.TEXT_MUTED },
    serviceName: { fontSize: 14, color: '#2D3436', fontWeight: '500' },
    timeLabel: { fontSize: 12, color: COLORS.PRIMARY_LIGHT },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    adminMenu: {
        flexDirection: 'row',
        paddingHorizontal: 25,
        gap: 15,
        marginBottom: 20,
    },
    menuCard: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
    },
    menuIconBox: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginBottom: 5 },
    menuDesc: { fontSize: 12, color: COLORS.TEXT_MUTED, textAlign: 'center' },
    bottomTab: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        height: 70,
        elevation: 20,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 11, color: COLORS.PRIMARY_LIGHT, marginTop: 4 },
    tabLabelActive: { fontSize: 11, color: COLORS.PRIMARY, marginTop: 4, fontWeight: 'bold' },
    tabBadge: {
        position: 'absolute',
        right: -6,
        top: -3,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
});
