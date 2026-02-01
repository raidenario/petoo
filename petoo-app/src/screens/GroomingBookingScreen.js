import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    StatusBar,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DATES = [
    { day: '29', label: 'Qua' },
    { day: '30', label: 'Qui' },
    { day: '31', label: 'Sex' },
    { day: '01', label: 'Sáb', nextMonth: true },
    { day: '03', label: 'Seg', nextMonth: true },
    { day: '04', label: 'Ter', nextMonth: true },
];

const TIME_SLOTS = [
    '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export default function GroomingBookingScreen({ navigation, route }) {
    const { store, service } = route.params;
    const [selectedDate, setSelectedDate] = useState(DATES[0].day);
    const [selectedTime, setSelectedTime] = useState(null);

    const handleConfirm = () => {
        if (!selectedTime) {
            Alert.alert('Selecione um horário', 'Por favor, escolha um horário para o banho.');
            return;
        }
        Alert.alert(
            'Agendamento Realizado!',
            `Seu horário para ${service.title} no ${store.name} foi confirmado para o dia ${selectedDate} às ${selectedTime}.`,
            [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#FDFBFF', '#FFFDF9']}
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
                    <Text style={styles.headerTitle}>Agendar Banho</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Store / Service Summary */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryInfo}>
                            <Text style={[styles.storeName, { color: store.brandColor }]}>{store.name}</Text>
                            <Text style={styles.serviceTitle}>{service.title}</Text>
                        </View>
                        <Text style={[styles.price, { color: store.brandColor }]}>{service.price}</Text>
                    </View>

                    {/* Step 1: Select Date */}
                    <Text style={styles.sectionTitle}>Escolha o dia</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dateList}
                    >
                        {DATES.map((item) => (
                            <TouchableOpacity
                                key={item.day}
                                style={[
                                    styles.dateCard,
                                    selectedDate === item.day && { backgroundColor: store.brandColor, borderColor: store.brandColor }
                                ]}
                                onPress={() => setSelectedDate(item.day)}
                            >
                                <Text style={[styles.dayLabel, selectedDate === item.day && styles.textWhite]}>
                                    {item.label}
                                </Text>
                                <Text style={[styles.dayNumber, selectedDate === item.day && styles.textWhite]}>
                                    {item.day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Step 2: Select Time */}
                    <Text style={styles.sectionTitle}>Horários disponíveis</Text>
                    <View style={styles.timeGrid}>
                        {TIME_SLOTS.map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={[
                                    styles.timeSlot,
                                    selectedTime === time && { backgroundColor: store.brandColor, borderColor: store.brandColor }
                                ]}
                                onPress={() => setSelectedTime(time)}
                            >
                                <Text style={[
                                    styles.timeText,
                                    selectedTime === time && styles.textWhite
                                ]}>{time}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.warningBox, { backgroundColor: `${store.brandColor}10` }]}>
                        <Ionicons name="information-circle-outline" size={20} color={store.brandColor} />
                        <Text style={[styles.warningText, { color: store.brandColor }]}>
                            O serviço leva em média 1h30m. Certifique-se de chegar com 10min de antecedência.
                        </Text>
                    </View>
                </ScrollView>

                {/* Footer Button */}
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.confirmButton, { backgroundColor: store.brandColor }]} onPress={handleConfirm}>
                        <View style={styles.buttonFlat}>
                            <Text style={styles.buttonText}>Confirmar Agendamento</Text>
                        </View>
                    </TouchableOpacity>
                </View>
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    summaryInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 14,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    serviceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 15,
        marginTop: 10,
    },
    dateList: {
        gap: 12,
        paddingBottom: 5,
    },
    dateCard: {
        width: 65,
        height: 85,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    dateCardActive: {
        backgroundColor: COLORS.PRIMARY,
        borderColor: COLORS.PRIMARY,
    },
    dayLabel: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 5,
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    textWhite: {
        color: '#FFFFFF',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 30,
    },
    timeSlot: {
        width: (width - 64) / 3,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    timeSlotActive: {
        backgroundColor: COLORS.PRIMARY,
        borderColor: COLORS.PRIMARY,
    },
    timeText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.BG_LIGHT,
        padding: 15,
        borderRadius: 15,
        gap: 10,
        alignItems: 'center',
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.PRIMARY,
        lineHeight: 18,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    confirmButton: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonFlat: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
