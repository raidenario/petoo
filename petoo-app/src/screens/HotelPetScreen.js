import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import HotelPetLoading from '../components/HotelPetLoading';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

const HOTELS_DATA = [
    {
        id: '1',
        name: 'Pet Palace Resort',
        image: require('../../assets/hotel-1.png'),
        services: ['Hospedagem VIP', 'Recreação', 'Veterinário 24h'],
        address: 'Rua das Flores, 123 - Centro',
        rating: 4.8,
        price: 'R$ 80/dia',
        color: COLORS.PRIMARY
    },
    {
        id: '2',
        name: 'Doggy Haven',
        image: require('../../assets/hotel-2.png'),
        services: ['Suítes Climatizadas', 'Piscina Pet', 'Day Care'],
        address: 'Av. das Palmeiras, 456 - Jardim',
        rating: 4.9,
        price: 'R$ 95/dia',
        color: COLORS.PRIMARY_DARK
    },
    {
        id: '3',
        name: 'Gato & Cia Hotel',
        image: require('../../assets/hotel-3.png'),
        services: ['Espaço Cat-Friendly', 'SPA Relax', 'Câmeras 24h'],
        address: 'Al. dos Gatos, 789 - Vila Nova',
        rating: 4.7,
        price: 'R$ 75/dia',
        color: COLORS.PRIMARY
    },
    {
        id: '4',
        name: 'Estrela Pet',
        image: require('../../assets/hotel-pet-logo.png'),
        services: ['Monitoramento', 'Alimentação Natural', 'Passeios'],
        address: 'Rua São Paulo, 321 - Brooklin',
        rating: 4.6,
        price: 'R$ 65/dia',
        color: COLORS.PRIMARY_DARK
    }
];

export default function HotelPetScreen({ navigation }) {
    const [hotels, setHotels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHotels();
    }, []);

    const loadHotels = async () => {
        setIsLoading(true);
        try {
            const response = await api.getEnterprises();
            // Assumimos que a resposta é { enterprises: [...] } ou array direto
            const loadedHotels = response.enterprises || response || [];

            // Mapear para o formato da UI se necessário, ou usar direto se compatível
            // Backend retorna: id, name, slug, photo_url, address, rating
            const formattedHotels = loadedHotels.map(h => ({
                id: h.id,
                name: h.name,
                image: h.photo_url ? { uri: h.photo_url } : require('../../assets/hotel-1.png'),
                services: h.services || ['Hospedagem', 'Day Care'], // Mock se não vier na lista
                address: h.address || 'Endereço não informado',
                rating: h.rating || 5.0,
                price: 'R$ 80/dia', // Mock de preço base por enquanto
                color: COLORS.PRIMARY,
                raw: h // Manter objeto original
            }));

            setHotels(formattedHotels);
        } catch (error) {
            console.error('Erro ao carregar hoteis:', error);
            // Fallback para dados mockados em caso de erro, ou array vazio
            // setHotels(HOTELS_DATA); 
        } finally {
            setIsLoading(false);
        }
    };

    const renderHotelItem = ({ item }) => (
        <TouchableOpacity
            style={styles.hotelCard}
            activeOpacity={0.9}
            onPress={() => {
                navigation.navigate('HotelDetails', { enterprise: item.raw || item });
            }}
        >
            <View style={styles.cardImageContainer}>
                <Image source={item.image} style={styles.hotelImage} resizeMode="cover" />
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFFFFF" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.imageGradient}
                />
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.hotelName}>{item.name}</Text>
                    <Text style={styles.hotelPrice}>{item.price}</Text>
                </View>

                <View style={styles.addressContainer}>
                    <Ionicons name="location-sharp" size={14} color="#A0826D" />
                    <Text style={styles.hotelAddress} numberOfLines={1}>{item.address}</Text>
                </View>

                <View style={styles.servicesContainer}>
                    {item.services.slice(0, 3).map((service, index) => (
                        <View key={index} style={styles.serviceBadge}>
                            <Text style={styles.serviceText}>{service}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return <HotelPetLoading />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[COLORS.BG_LIGHT, COLORS.BG_LIGHTER, '#FFFFFF']}
                style={styles.gradient}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY_DARK} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Hoteis Pet</Text>
                        <TouchableOpacity style={styles.filterButton}>
                            <Ionicons name="options-outline" size={24} color={COLORS.PRIMARY_DARK} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerSubtitle}>Encontre o melhor lugar para seu pet</Text>
                </View>

                <FlatList
                    data={hotels}
                    renderItem={renderHotelItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Nenhum hotel disponível no momento.</Text>
                        </View>
                    }
                />
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F9F8',
    },
    gradient: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.PRIMARY_DARK,
        letterSpacing: 0.5,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerSubtitle: {
        fontSize: 16,
        color: COLORS.PRIMARY,
        marginTop: 5,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    hotelCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    cardImageContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    hotelImage: {
        width: '100%',
        height: '100%',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    ratingBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(161, 103, 220, 0.95)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        zIndex: 1,
    },
    ratingText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    cardContent: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    hotelName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.PRIMARY_DARK,
        flex: 1,
    },
    hotelPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    hotelAddress: {
        fontSize: 14,
        color: COLORS.TEXT_MUTED,
        marginLeft: 6,
        flex: 1,
    },
    servicesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceBadge: {
        backgroundColor: COLORS.BG_LIGHT,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    serviceText: {
        fontSize: 11,
        color: COLORS.PRIMARY,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: COLORS.PRIMARY_LIGHT,
        fontSize: 16,
    },
});
