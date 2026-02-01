import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    StatusBar,
    Image,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

export default function BusinessBookingDetailsScreen({ navigation, route }) {
    const { businessTheme } = useTheme();
    const { booking } = route.params;
    const { pet, owner } = booking;

    const handleAction = (action) => {
        let actionText = '';
        let confirmMsg = '';

        if (action === 'accepted') {
            actionText = 'aceito';
            confirmMsg = 'aceitar este agendamento?';
        } else if (action === 'rejected') {
            actionText = 'recusado';
            confirmMsg = 'recusar este agendamento?';
        } else {
            actionText = 'cancelado';
            confirmMsg = 'cancelar este agendamento já confirmado?';
        }

        Alert.alert(
            'Confirmar',
            `Deseja realmente ${confirmMsg}`,
            [
                { text: 'Voltar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: () => {
                        Alert.alert('Sucesso', `Agendamento ${actionText} com sucesso! ✨`);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    const InfoCard = ({ title, icon, children }) => (
        <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: businessTheme + '10' }]}>
                    <Ionicons name={icon} size={20} color={businessTheme} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardContent}>
                {children}
            </View>
        </View>
    );

    const DataRow = ({ label, value, icon }) => (
        <View style={styles.dataRow}>
            <View style={styles.labelRow}>
                {icon && <Ionicons name={icon} size={14} color={COLORS.TEXT_MUTED} style={{ marginRight: 6 }} />}
                <Text style={styles.dataLabel}>{label}</Text>
            </View>
            <Text style={styles.dataValue}>{value || 'Não informado'}</Text>
        </View>
    );

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
                    <Text style={styles.headerTitle}>Detalhes do Pedido</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Pet Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.petPhotoContainer}>
                            {pet.photo ? (
                                <Image source={{ uri: pet.photo }} style={styles.petPhoto} />
                            ) : (
                                <View style={[styles.petPhotoPlaceholder, { backgroundColor: businessTheme + '10' }]}>
                                    <Ionicons name="paw" size={40} color={businessTheme} />
                                </View>
                            )}
                            <View style={[styles.genderBadge, { backgroundColor: pet.gender === 'Macho' ? '#E3F2FD' : '#FCE4EC' }]}>
                                <MaterialCommunityIcons
                                    name={pet.gender === 'Macho' ? 'gender-male' : 'gender-female'}
                                    size={16}
                                    color={pet.gender === 'Macho' ? '#1976D2' : '#C2185B'}
                                />
                            </View>
                        </View>
                        <Text style={styles.petName}>{pet.name}</Text>
                        <Text style={styles.petBreed}>{pet.breed} • {pet.age}</Text>

                        <View style={[styles.bookingStatusBadge, booking.status === 'confirmed' && { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons
                                name={booking.status === 'confirmed' ? "checkmark-circle" : "time-outline"}
                                size={14}
                                color={booking.status === 'confirmed' ? "#27AE60" : businessTheme}
                            />
                            <Text style={[styles.statusTagText, { color: booking.status === 'confirmed' ? "#27AE60" : businessTheme }]}>
                                {booking.status === 'confirmed' ? 'Agendamento Confirmado' : 'Aguardando Aprovação'} • {booking.date} às {booking.time}
                            </Text>
                        </View>
                    </View>

                    {/* Owner Information */}
                    <InfoCard title="Informações do Dono" icon="person-outline">
                        <DataRow label="Nome" value={owner.name} icon="person" />
                        <DataRow label="Telefone" value={owner.phone} icon="call" />
                        <DataRow label="Email" value={owner.email} icon="mail" />
                        <DataRow label="Endereço" value={owner.address} icon="location" />
                        <DataRow label="Cliente Petoo desde" value={owner.clientSince} icon="calendar" />
                    </InfoCard>

                    {/* Pet Health & Details */}
                    <InfoCard title="Saúde e Cuidados" icon="heart-outline">
                        <DataRow label="Peso" value={pet.weight} icon="fitness" />
                        <DataRow label="Castrado?" value={pet.isNeutered ? 'Sim' : 'Não'} icon="medical" />
                        <View style={styles.tagSection}>
                            <Text style={styles.tagLabel}>Vacinas em dia:</Text>
                            <View style={styles.tagsContainer}>
                                {pet.vaccines.map((v, i) => (
                                    <View key={i} style={[styles.tag, { backgroundColor: '#E8F5E9' }]}>
                                        <Text style={[styles.tagText, { color: '#2E7D32' }]}>{v}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        <DataRow label="Patologias" value={pet.diseases.join(', ')} />
                        <DataRow label="Medicamentos" value={pet.medications} />
                    </InfoCard>

                    {/* Pet Behavior & Routine */}
                    <InfoCard title="Comportamento e Rotina" icon="paw-outline">
                        <View style={styles.textAreaRow}>
                            <Text style={styles.dataLabel}>Características:</Text>
                            <Text style={styles.longText}>{pet.characteristics}</Text>
                        </View>
                        <View style={styles.textAreaRow}>
                            <Text style={styles.dataLabel}>Hábitos de Passeio:</Text>
                            <Text style={styles.longText}>{pet.walkHabits}</Text>
                        </View>
                        <View style={styles.textAreaRow}>
                            <Text style={styles.dataLabel}>Alimentação:</Text>
                            <Text style={styles.longText}>{pet.feeding}</Text>
                        </View>
                    </InfoCard>

                    <View style={styles.buttonSpacer} />
                </ScrollView>

                {/* Fixed Action Footer */}
                <View style={styles.footerActions}>
                    {booking.status === 'pending' ? (
                        <>
                            <TouchableOpacity
                                style={[styles.footerBtn, styles.rejectFooterBtn]}
                                onPress={() => handleAction('rejected')}
                            >
                                <Ionicons name="close-circle" size={24} color="#EB5757" />
                                <Text style={styles.rejectFooterText}>Recusar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.footerBtn, styles.acceptFooterBtn, { backgroundColor: businessTheme }]}
                                onPress={() => handleAction('accepted')}
                            >
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                <Text style={styles.acceptFooterText}>Aceitar Pedido</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.footerBtn, styles.rejectFooterBtn]}
                                onPress={() => handleAction('cancelled')}
                            >
                                <Ionicons name="close-circle-outline" size={24} color="#EB5757" />
                                <Text style={styles.rejectFooterText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.footerBtn, styles.ownerContactBtn, { borderColor: businessTheme }]}
                                onPress={() => Alert.alert('Contato', `Iniciando chat com ${owner.name}...`)}
                            >
                                <Ionicons name="chatbubbles-outline" size={24} color={businessTheme} />
                                <Text style={[styles.ownerContactBtnText, { color: businessTheme }]}>Falar com Dono</Text>
                            </TouchableOpacity>
                        </>
                    )}
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
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
    profileHeader: { alignItems: 'center', marginVertical: 30 },
    petPhotoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        position: 'relative',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    petPhotoPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    petPhoto: { width: '100%', height: '100%', borderRadius: 50 },
    genderBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    petName: { fontSize: 26, fontWeight: 'bold', color: '#2D3436' },
    petBreed: { fontSize: 15, color: COLORS.TEXT_MUTED, marginTop: 4 },
    bookingStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 15,
        gap: 6,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    statusTagText: { fontSize: 12, fontWeight: 'bold' },
    infoCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 20,
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
    cardContent: { gap: 15 },
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    labelRow: { flexDirection: 'row', alignItems: 'center' },
    dataLabel: { fontSize: 13, color: COLORS.TEXT_MUTED, fontWeight: '500' },
    dataValue: { fontSize: 14, color: '#2D3436', fontWeight: 'bold', maxWidth: '60%', textAlign: 'right' },
    textAreaRow: { gap: 6 },
    longText: { fontSize: 14, color: '#2D3436', lineHeight: 20, backgroundColor: '#F9F9FB', padding: 12, borderRadius: 12 },
    tagSection: { gap: 10 },
    tagLabel: { fontSize: 13, color: COLORS.TEXT_MUTED, fontWeight: '500' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    tagText: { fontSize: 12, fontWeight: 'bold' },
    buttonSpacer: { height: 20 },
    footerActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        gap: 12,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    footerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 18,
        gap: 8,
    },
    rejectFooterBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EB575720' },
    rejectFooterText: { color: '#EB5757', fontWeight: 'bold', fontSize: 16 },
    acceptFooterBtn: { elevation: 5 },
    acceptFooterText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    ownerContactBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8DEFF' },
    ownerContactBtnText: { fontWeight: 'bold', fontSize: 16 },
});
