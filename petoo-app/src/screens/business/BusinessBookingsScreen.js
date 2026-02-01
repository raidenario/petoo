import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Platform,
    StatusBar,
    Alert,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

// const INITIAL_DATA = [];

export default function BusinessBookingsScreen({ navigation }) {
    const { businessTheme } = useTheme();
    const { selectedRole, user } = useAuth();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'confirmed', 'calendar'
    const [bookings, setBookings] = useState([]); // Start empty
    const [loading, setLoading] = useState(true);

    // Calendar implementation states
    const [currentDate, setCurrentDate] = useState(new Date()); // Current date
    const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                // Mock fetch
                await new Promise(r => setTimeout(r, 1000));
                setBookings([]);
            } catch (error) {
                console.error("Failed to fetch bookings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const handleAction = (id, action) => {
        const actionText = action === 'accepted' ? 'aceito' : 'recusado';
        Alert.alert(
            'Confirmar',
            `Deseja realmente ${action === 'accepted' ? 'aceitar' : 'recusar'} este agendamento?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: () => {
                        if (action === 'accepted') {
                            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
                        } else {
                            setBookings(prev => prev.filter(b => b.id !== id));
                        }
                        Alert.alert('Sucesso', `Agendamento ${actionText} com sucesso! ✨`);
                    }
                }
            ]
        );
    };

    const renderBookingItem = ({ item }) => (
        <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => navigation.navigate('BusinessBookingDetails', { booking: item })}
        >
            <View style={styles.cardTop}>
                <View style={[styles.petCircle, { backgroundColor: businessTheme + '10' }]}>
                    <Ionicons name="paw" size={24} color={businessTheme} />
                </View>
                <View style={styles.petTextInfo}>
                    <Text style={styles.petNameText}>{item.pet.name}</Text>
                    <Text style={styles.petBreedText}>{item.pet.breed}</Text>
                </View>
                <View style={styles.dateTimeBox}>
                    <Text style={[styles.bookingDateText, { color: businessTheme }]}>{item.date.split('-').reverse().join('/')}</Text>
                    <Text style={styles.bookingTimeText}>{item.time}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.ownerInfoRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.TEXT_MUTED} />
                <Text style={styles.ownerNameText}>{item.owner.name}</Text>
                <View style={[styles.serviceTag, { backgroundColor: businessTheme + '10' }]}>
                    <Text style={[styles.serviceTagText, { color: businessTheme }]}>{item.service}</Text>
                </View>
            </View>

            {item.status === 'pending' ? (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.smallActionBtn, styles.rejectBtn]}
                        onPress={() => handleAction(item.id, 'rejected')}
                    >
                        <Ionicons name="close" size={18} color="#EB5757" />
                        <Text style={styles.rejectBtnText}>Recusar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: businessTheme }]}
                        onPress={() => handleAction(item.id, 'accepted')}
                    >
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Aceitar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.confirmedRow}>
                    <View style={styles.confirmedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                        <Text style={styles.confirmedBadgeText}>Agendado</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.diaryBtn, { borderColor: businessTheme }]}
                        onPress={() => Alert.alert('Contato', `Iniciando chat com ${item.owner.name}...`)}
                    >
                        <Text style={[styles.diaryBtnText, { color: businessTheme }]}>Falar com Dono</Text>
                        <Ionicons name="chatbubbles-outline" size={14} color={businessTheme} />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    // Custom Calendar logic
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Pad empty days
        for (let i = 0; i < firstDay; i++) days.push(null);
        // Add actual days
        for (let i = 1; i <= lastDate; i++) days.push(i);

        return days;
    }, [currentDate]);

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        setCurrentDate(newDate);
    };

    const isDateBooked = (day) => {
        if (!day) return false;
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return bookings.some(b => b.date === dateStr);
    };

    const hasPendingOnDate = (day) => {
        if (!day) return false;
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return bookings.some(b => b.date === dateStr && b.status === 'pending');
    };

    const renderCalendar = () => {
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

        return (
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => changeMonth(-1)}>
                        <Ionicons name="chevron-back" size={24} color={businessTheme} />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthTitle}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)}>
                        <Ionicons name="chevron-forward" size={24} color={businessTheme} />
                    </TouchableOpacity>
                </View>

                <View style={styles.dayNamesRow}>
                    {dayNames.map(d => <Text key={d} style={styles.dayNameLabel}>{d}</Text>)}
                </View>

                <View style={styles.daysGrid}>
                    {calendarDays.map((day, idx) => {
                        const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                        const isSelected = selectedDateStr === dateStr;
                        const booked = isDateBooked(day);
                        const pending = hasPendingOnDate(day);

                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.dayCell, isSelected && { backgroundColor: businessTheme, borderRadius: 12 }]}
                                disabled={!day}
                                onPress={() => day && setSelectedDateStr(dateStr)}
                            >
                                {day && (
                                    <>
                                        <Text style={[styles.dayText, isSelected && { color: '#FFF', fontWeight: 'bold' }]}>{day}</Text>
                                        <View style={styles.markersContainer}>
                                            {booked && !pending && <View style={[styles.marker, { backgroundColor: isSelected ? '#FFF' : '#27AE60' }]} />}
                                            {pending && <View style={[styles.marker, { backgroundColor: isSelected ? '#FFF' : '#EB5757' }]} />}
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Day Bookings List */}
                <View style={styles.dateResultsHeader}>
                    <Text style={styles.dateResultsTitle}>
                        {selectedDateStr.split('-').reverse().join('/')}
                    </Text>
                </View>

                <ScrollView style={styles.dayBookingsScroll} showsVerticalScrollIndicator={false}>
                    {bookings.filter(b => b.date === selectedDateStr).length > 0 ? (
                        bookings.filter(b => b.date === selectedDateStr).map(b => (
                            <TouchableOpacity
                                key={b.id}
                                style={styles.miniBookingCard}
                                onPress={() => navigation.navigate('BusinessBookingDetails', { booking: b })}
                            >
                                <View style={[styles.miniStatus, { backgroundColor: b.status === 'confirmed' ? '#27AE60' : '#EB5757' }]} />
                                <View style={styles.miniInfo}>
                                    <Text style={styles.miniPetName}>{b.pet.name} <Text style={styles.miniTime}>• {b.time}</Text></Text>
                                    <Text style={styles.miniService}>{b.service} - {b.owner.name}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_MUTED} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noBookingsText}>Nenhum agendamento para este dia.</Text>
                    )}
                </ScrollView>
            </View>
        );
    };

    const filteredBookings = bookings.filter(b => b.status === activeTab);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FDFBFF', '#F0F9F8']} style={styles.background}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.backButton, { shadowColor: businessTheme }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={businessTheme} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Agenda e Pedidos</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && { borderBottomColor: businessTheme, borderBottomWidth: 3 }]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && { color: businessTheme, fontWeight: 'bold' }]}>Solicitações</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'confirmed' && { borderBottomColor: businessTheme, borderBottomWidth: 3 }]}
                        onPress={() => setActiveTab('confirmed')}
                    >
                        <Text style={[styles.tabText, activeTab === 'confirmed' && { color: businessTheme, fontWeight: 'bold' }]}>Agendados</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'calendar' && { borderBottomColor: businessTheme, borderBottomWidth: 3 }]}
                        onPress={() => setActiveTab('calendar')}
                    >
                        <Text style={[styles.tabText, activeTab === 'calendar' && { color: businessTheme, fontWeight: 'bold' }]}>Calendário</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'calendar' ? renderCalendar() : (
                    <FlatList
                        data={filteredBookings}
                        renderItem={renderBookingItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                <Ionicons name="calendar-outline" size={80} color={businessTheme + '30'} />
                                <Text style={styles.emptyTitle}>Nada por aqui!</Text>
                                <Text style={styles.emptyDesc}>Não existem agendamentos {activeTab === 'pending' ? 'pendentes' : 'confirmados'} no momento.</Text>
                            </View>
                        }
                    />
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
        paddingBottom: 15,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 2,
        overflow: 'hidden'
    },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
    tabText: { fontSize: 13, color: COLORS.TEXT_MUTED },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    bookingCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 18,
        marginBottom: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    petCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    petTextInfo: { flex: 1 },
    petNameText: { fontSize: 17, fontWeight: 'bold', color: '#2D3436' },
    petBreedText: { fontSize: 13, color: COLORS.TEXT_MUTED },
    dateTimeBox: { alignItems: 'flex-end' },
    bookingDateText: { fontSize: 14, fontWeight: 'bold' },
    bookingTimeText: { fontSize: 12, color: COLORS.TEXT_MUTED },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
    ownerInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ownerNameText: { fontSize: 14, color: '#2D3436', flex: 1 },
    serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    serviceTagText: { fontSize: 11, fontWeight: 'bold' },
    actionButtons: { flexDirection: 'row', gap: 10, marginTop: 15 },
    smallActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    rejectBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EB575730' },
    rejectBtnText: { color: '#EB5757', fontWeight: 'bold', fontSize: 13 },
    acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    confirmedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, gap: 10 },
    confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, flex: 1 },
    confirmedBadgeText: { fontSize: 12, color: '#27AE60', fontWeight: 'bold' },
    diaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
    diaryBtnText: { fontSize: 12, fontWeight: 'bold' },
    emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginTop: 20 },
    emptyDesc: { fontSize: 14, color: COLORS.TEXT_MUTED, textAlign: 'center', marginTop: 8, lineHeight: 20 },

    // Calendar styles
    calendarContainer: { flex: 1, paddingHorizontal: 20 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF', padding: 15, borderRadius: 20, elevation: 2 },
    calendarMonthTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    dayNamesRow: { flexDirection: 'row', marginBottom: 10 },
    dayNameLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: COLORS.TEXT_MUTED },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF', borderRadius: 20, padding: 10, elevation: 3 },
    dayCell: { width: '14.28%', height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    dayText: { fontSize: 15, color: '#2D3436' },
    markersContainer: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 5 },
    marker: { width: 4, height: 4, borderRadius: 2 },
    dateResultsHeader: { marginTop: 20, marginBottom: 15, paddingLeft: 5 },
    dateResultsTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    dayBookingsScroll: { flex: 1 },
    miniBookingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 10, elevation: 2 },
    miniStatus: { width: 4, height: 30, borderRadius: 2, marginRight: 15 },
    miniInfo: { flex: 1 },
    miniPetName: { fontSize: 15, fontWeight: 'bold', color: '#2D3436' },
    miniTime: { color: COLORS.TEXT_MUTED, fontWeight: 'normal' },
    miniService: { fontSize: 12, color: COLORS.TEXT_MUTED, marginTop: 2 },
    noBookingsText: { textAlign: 'center', color: COLORS.TEXT_MUTED, marginTop: 20, fontStyle: 'italic' },
});
