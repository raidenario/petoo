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
    Alert,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getClientPets, createAppointment } from '../services/api';

const { width } = Dimensions.get('window');

// Gera datas dinâmicas para os próximos 14 dias
const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dates.push({
            day,
            label: weekDays[d.getDay()],
            fullDate: `${d.getFullYear()}-${month}-${day}`, // YYYY-MM-DD
            displayDate: `${day}/${month}`
        });
    }
    return dates;
};

const DATES = generateDates();

export default function HotelPetBookingScreen({ navigation, route }) {
    const { store, service } = route.params;
    const [checkIn, setCheckIn] = useState(null);
    const [checkOut, setCheckOut] = useState(null);
    const [pets, setPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [petsLoading, setPetsLoading] = useState(true);

    useEffect(() => {
        loadPets();
    }, []);

    const loadPets = async () => {
        try {
            const response = await getClientPets();
            // Response can be an array directly or wrapped in an object
            const petList = Array.isArray(response) ? response : (response.pets || []);
            setPets(petList);
            if (petList.length > 0) {
                setSelectedPetId(petList[0].id);
            }
        } catch (error) {
            console.error('Error loading pets:', error);
            Alert.alert('Erro', 'Não foi possível carregar seus pets.');
        } finally {
            setPetsLoading(false);
        }
    };

    const handleDateSelect = (fullDate) => {
        if (!checkIn || (checkIn && checkOut)) {
            setCheckIn(fullDate);
            setCheckOut(null);
        } else {
            // Comparar datas string (YYYY-MM-DD funciona)
            if (fullDate > checkIn) {
                setCheckOut(fullDate);
            } else {
                setCheckIn(fullDate);
                setCheckOut(null);
            }
        }
    };

    const isSelected = (fullDate) => fullDate === checkIn || fullDate === checkOut;
    const isInRange = (fullDate) => {
        if (!checkIn || !checkOut) return false;
        return fullDate > checkIn && fullDate < checkOut;
    };

    const handleConfirm = async () => {
        if (!checkIn || !checkOut) {
            Alert.alert('Selecione as datas', 'Por favor, escolha o período de hospedagem (Check-in e Check-out).');
            return;
        }

        if (!selectedPetId) {
            Alert.alert('Selecione um pet', 'Por favor, selecione qual pet será hospedado.');
            return;
        }

        setLoading(true);
        try {
            // Validar que todos os dados necessários estão presentes
            if (!store?.id || !service?.id || !selectedPetId) {
                Alert.alert('Erro', 'Dados incompletos para realizar a reserva.');
                setLoading(false);
                return;
            }

            // Assumindo horário padrão para check-in (14h) e check-out (12h)
            const startDateTime = `${checkIn}T14:00:00Z`;
            const endDateTime = `${checkOut}T12:00:00Z`;

            // Criar objeto com chaves kebab-case corretamente formatadas
            // Remover qualquer valor undefined/null antes de enviar
            const appointmentData = {};
            if (store.id) appointmentData['enterprise-id'] = store.id;
            if (service.id) appointmentData['service-id'] = service.id;
            if (selectedPetId) appointmentData['pet-id'] = selectedPetId;
            if (startDateTime) appointmentData['start-time'] = startDateTime;
            if (endDateTime) appointmentData['end-time'] = endDateTime;
            if (service.name) appointmentData.notes = `Reserva de Hotel - ${service.name}`;

            console.log('Creating appointment with data:', JSON.stringify(appointmentData, null, 2));
            
            await createAppointment(appointmentData);

            Alert.alert(
                'Reserva Solicitada!',
                `Sua estadia no ${store.name} (${service.name}) foi solicitada com sucesso! Aguarde a confirmação.`,
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
            );

        } catch (error) {
            console.error('Error creating booking:', error);
            Alert.alert('Erro', 'Não foi possível realizar a reserva. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const selectedPet = pets.find(p => p.id === selectedPetId);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[COLORS.BG_LIGHTER, '#FFFDF9']}
                style={styles.background}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reserva de Hotel</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryInfo}>
                            <Text style={[styles.storeName, { color: COLORS.PRIMARY }]}>{store.name}</Text>
                            <Text style={styles.serviceTitle}>{service.name}</Text>
                        </View>
                        <Text style={[styles.price, { color: COLORS.PRIMARY }]}>
                            {service.price_cents ? `R$ ${(service.price_cents / 100).toFixed(2)}` : 'R$ --'}
                            <Text style={styles.perNight}> /noite</Text>
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Selecione o período</Text>
                    <View style={styles.calendarContainer}>
                        <View style={styles.calendarGrid}>
                            {DATES.map((item) => (
                                <TouchableOpacity
                                    key={item.fullDate}
                                    style={[
                                        styles.dateBox,
                                        isSelected(item.fullDate) && { backgroundColor: COLORS.PRIMARY },
                                        isInRange(item.fullDate) && { backgroundColor: `${COLORS.PRIMARY}15` }
                                    ]}
                                    onPress={() => handleDateSelect(item.fullDate)}
                                >
                                    <Text style={[
                                        styles.dateLabel,
                                        isSelected(item.fullDate) && styles.textWhite
                                    ]}>{item.label}</Text>
                                    <Text style={[
                                        styles.dateNumber,
                                        isSelected(item.fullDate) && styles.textWhite,
                                        isInRange(item.fullDate) && { color: COLORS.PRIMARY }
                                    ]}>{item.day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.rangeInfo}>
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Check-in</Text>
                            <Text style={styles.infoValue}>{checkIn ? checkIn.split('-').reverse().join('/') : '---'}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.PRIMARY} style={{ opacity: 0.3 }} />
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Check-out</Text>
                            <Text style={styles.infoValue}>{checkOut ? checkOut.split('-').reverse().join('/') : '---'}</Text>
                        </View>
                    </View>

                    <View style={styles.petSelectSection}>
                        <Text style={styles.sectionTitle}>Para qual pet?</Text>
                        {petsLoading ? (
                            <ActivityIndicator color={COLORS.PRIMARY} />
                        ) : pets.length === 0 ? (
                            <Text style={styles.infoLabel}>Você não possui pets cadastrados.</Text>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                {pets.map(pet => (
                                    <TouchableOpacity
                                        key={pet.id}
                                        style={[
                                            styles.petChip,
                                            selectedPetId === pet.id && styles.petChipActive
                                        ]}
                                        onPress={() => setSelectedPetId(pet.id)}
                                    >
                                        <Ionicons
                                            name="paw"
                                            size={18}
                                            color={selectedPetId === pet.id ? COLORS.PRIMARY : '#ccc'}
                                        />
                                        <Text style={[
                                            styles.petName,
                                            selectedPetId === pet.id && { color: COLORS.PRIMARY }
                                        ]}>
                                            {pet.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            { backgroundColor: COLORS.PRIMARY },
                            loading && { opacity: 0.7 }
                        ]}
                        onPress={handleConfirm}
                        disabled={loading}
                    >
                        <View style={styles.buttonFlat}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>Confirmar Reserva</Text>
                            )}
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        shadowColor: COLORS.PRIMARY,
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
    perNight: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: 'normal',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 20,
    },
    calendarContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        padding: 15,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dateBox: {
        width: (width - 40 - 30 - 30) / 4,
        height: 70,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.BG_LIGHTER,
    },
    dateBoxSelected: {
        backgroundColor: COLORS.PRIMARY,
    },
    dateBoxRange: {
        backgroundColor: COLORS.BG_LIGHT,
    },
    dateLabel: {
        fontSize: 11,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 2,
    },
    dateNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    textWhite: {
        color: '#FFFFFF',
    },
    textRange: {
        color: COLORS.PRIMARY,
    },
    rangeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    infoCol: {
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 5,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    petSelectSection: {
        marginBottom: 30,
    },
    petChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E8DEFF',
        marginRight: 10,
    },
    petChipActive: {
        backgroundColor: COLORS.BG_LIGHT,
        borderColor: COLORS.PRIMARY,
    },
    petName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.TEXT_MUTED,
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
