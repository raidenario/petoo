import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

export default function HotelDetailsScreen({ navigation, route }) {
    const { enterprise } = route.params;
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            const response = await api.getEnterpriseServices(enterprise.id);
            // Assumindo que response.services é a lista
            setServices(response.services || []);
        } catch (error) {
            console.error('Error loading services:', error);
            Alert.alert('Erro', 'Não foi possível carregar os serviços.');
        } finally {
            setLoading(false);
        }
    };

    const handleBookService = (service) => {
        navigation.navigate('HotelPetBooking', {
            store: enterprise,
            service: service
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header Image */}
            <View style={styles.imageHeader}>
                <Image
                    source={enterprise.photo_url ? { uri: enterprise.photo_url } : require('../../assets/hotel-1.png')}
                    style={styles.coverImage}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {/* Navigation Header */}
                <View style={styles.headerNav}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Title Info */}
                <View style={styles.titleContainer}>
                    <Text style={styles.hotelName}>{enterprise.name}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>4.8 (120 avaliações)</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Info Cards */}
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Ionicons name="location-sharp" size={20} color={COLORS.PRIMARY} />
                        <Text style={styles.addressText}>{enterprise.address || 'Endereço não informado'}</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Aberto Agora</Text>
                        </View>
                        <Text style={styles.hoursText}>08:00 - 18:00</Text>
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sobre</Text>
                    <Text style={styles.description}>
                        {enterprise.description || 'Oferecemos o melhor cuidado para seu pet com uma estrutura completa e equipe especializada.'}
                    </Text>
                </View>

                {/* Services Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Serviços Disponíveis</Text>

                    {loading ? (
                        <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 20 }} />
                    ) : services.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhum serviço disponível.</Text>
                    ) : (
                        services.map((service, index) => (
                            <View key={index} style={styles.serviceCard}>
                                <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName}>{service.name}</Text>
                                    <Text style={styles.serviceDesc}>{service.description}</Text>
                                    <Text style={styles.servicePrice}>
                                        R$ {service.price_cents ? (service.price_cents / 100).toFixed(2) : '0.00'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.bookButton}
                                    onPress={() => handleBookService(service)}
                                >
                                    <Text style={styles.bookButtonText}>Reservar</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    imageHeader: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    headerNav: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    hotelName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    ratingText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
    },
    infoSection: {
        paddingTop: 25,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    addressText: {
        fontSize: 16,
        color: '#4A4A4A',
        flex: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
    },
    statusText: {
        color: '#2E7D32',
        fontWeight: 'bold',
        fontSize: 12,
    },
    hoursText: {
        color: '#757575',
        fontSize: 14,
    },
    section: {
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 15,
    },
    description: {
        fontSize: 15,
        color: '#636e72',
        lineHeight: 22,
    },
    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E8DEFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    serviceInfo: {
        flex: 1,
        marginRight: 15,
    },
    serviceName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 4,
    },
    serviceDesc: {
        fontSize: 13,
        color: '#636e72',
        marginBottom: 6,
    },
    servicePrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    bookButton: {
        backgroundColor: COLORS.PRIMARY,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
    },
    bookButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyText: {
        color: '#636e72',
        textAlign: 'center',
        marginTop: 10,
    },
});
