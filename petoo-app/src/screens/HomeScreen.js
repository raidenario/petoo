import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getEnterprises } from '../services/api';

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
    { id: '0', title: 'Todos', icon: 'grid-outline' },
    { id: 'favoritos', title: 'Favoritos', icon: 'heart' },
    { id: '1', title: 'Hoteis', icon: 'bed-outline' },
    { id: '2', title: 'Banho & Tosa', icon: 'water-outline' },
    { id: '3', title: 'Veterinário', icon: 'medical-outline' },
    { id: '4', title: 'Pet Shop', icon: 'cart-outline' },
    { id: '5', title: 'Passeio', icon: 'paw-outline' },
];

const INITIAL_ADDRESSES = [
    { id: '1', label: 'Casa', details: 'Rua das Flores, 123 - Centro' },
    { id: '2', label: 'Trabalho', details: 'Av. Paulista, 1000 - Bela Vista' },
];

const SAMPLE_IMAGES = [
    require('../../assets/hotel-1.png'),
    require('../../assets/hotel-2.png'),
    require('../../assets/hotel-3.png'),
];

const INITIAL_ESTABLISHMENTS = [
    {
        id: '1',
        name: 'Pet Palace Resort',
        type: 'Hoteis',
        image: require('../../assets/hotel-1.png'),
        gallery: [require('../../assets/hotel-interior.png'), require('../../assets/pet-playground.png'), require('../../assets/hotel-1.png')],
        rating: 4.8,
        deliveryTime: '2km',
        priceRange: '$$',
        category: 'Hoteis',
        promoted: true,
        isFavorite: false,
        isOpen: true,
        address: 'Alameda dos Pets, 500 - Jd. Primavera',
        hours: '08:00 - 18:00',
        brandColor: COLORS.PRIMARY,
    },
    {
        id: '2',
        name: 'Doggy Haven',
        type: 'Hoteis',
        image: require('../../assets/hotel-2.png'),
        gallery: [require('../../assets/cat-hotel.png'), require('../../assets/hotel-interior.png'), require('../../assets/pet-playground.png')],
        rating: 4.9,
        deliveryTime: '3.5km',
        priceRange: '$$$',
        category: 'Hoteis',
        promoted: false,
        isFavorite: true,
        isOpen: false,
        address: 'Rua Canina, 123 - Vila Madalena',
        hours: '09:00 - 17:00',
        brandColor: '#F54927',
    },
    {
        id: '3',
        name: 'Bolhas & Patas',
        type: 'Banho & Tosa',
        image: require('../../assets/banho-tosa-logo.png'),
        gallery: [require('../../assets/grooming-station.png'), require('../../assets/pet-playground.png'), require('../../assets/hotel-interior.png')],
        rating: 4.7,
        deliveryTime: '1.2km',
        priceRange: '$',
        category: 'Banho & Tosa',
        promoted: false,
        isFavorite: false,
        isOpen: true,
        address: 'Rua do Banho, 45 - Centro',
        hours: '08:30 - 19:00',
        brandColor: '#F5276C',
    },
    {
        id: '4',
        name: 'Gato & Cia',
        type: 'Hoteis',
        image: require('../../assets/hotel-3.png'),
        gallery: [require('../../assets/cat-hotel.png'), require('../../assets/hotel-interior.png')],
        rating: 4.7,
        deliveryTime: '5km',
        priceRange: '$$',
        category: 'Hoteis',
        promoted: false,
        isFavorite: false,
        isOpen: true,
        address: 'Av. dos Felinos, 88 - Morumbi',
        hours: '08:00 - 18:00',
        brandColor: '#F5B027',
    },
    {
        id: '5',
        name: 'Estrela Pet',
        type: 'Serviços',
        image: require('../../assets/hotel-pet-logo.png'),
        gallery: [require('../../assets/pet-playground.png'), require('../../assets/grooming-station.png'), require('../../assets/hotel-interior.png')],
        rating: 4.6,
        deliveryTime: '0.8km',
        priceRange: '$',
        category: 'Banho & Tosa',
        promoted: true,
        isFavorite: false,
        isOpen: false,
        address: 'Rua das Estrelas, 99 - Moema',
        hours: '09:00 - 18:00',
        brandColor: '#32EC98',
    },
];

export default function HomeScreen({ navigation }) {
    const [selectedCategory, setSelectedCategory] = useState('0');
    const [searchQuery, setSearchQuery] = useState('');
    const [establishments, setEstablishments] = useState(INITIAL_ESTABLISHMENTS);
    const [filteredData, setFilteredData] = useState(INITIAL_ESTABLISHMENTS);

    // Address State
    const [isAddressModalVisible, setAddressModalVisible] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(INITIAL_ADDRESSES[0]);

    // Notifications State
    const [isNotificationsModalVisible, setNotificationsModalVisible] = useState(false);
    const [notifications, setNotifications] = useState([
        {
            id: '1',
            title: 'Boas-vindas ao Petoo! 🐾',
            message: 'Complete seu cadastro clicando em "Perfil" para aproveitar todas as funcionalidades do app.',
            time: 'Agora',
            icon: 'gift-outline',
            color: COLORS.PRIMARY,
        }
    ]);

    // Toggle Favorite
    const toggleFavorite = (id) => {
        setEstablishments(prev => prev.map(item =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        ));
    };

    // Fetch enterprises from API
    useEffect(() => {
        const fetchEnterprises = async () => {
            try {
                const response = await getEnterprises();
                const apiEnterprises = response.enterprises || response.data || response || [];

                if (Array.isArray(apiEnterprises) && apiEnterprises.length > 0) {
                    // Map API data to UI format
                    const mappedEnterprises = apiEnterprises.map((e, index) => ({
                        id: e.id?.toString() || index.toString(),
                        name: e.name,
                        type: e.category || e.type || 'Hoteis',
                        image: SAMPLE_IMAGES[index % SAMPLE_IMAGES.length],
                        gallery: [SAMPLE_IMAGES[0], SAMPLE_IMAGES[1]],
                        rating: e.rating || 4.5,
                        deliveryTime: e.distance || '2km',
                        priceRange: e.price_range || '$$',
                        category: e.category || 'Hoteis',
                        promoted: e.is_featured || false,
                        isFavorite: false,
                        isOpen: e.is_open !== false,
                        address: e.address || 'Endereço não informado',
                        hours: e.hours || '08:00 - 18:00',
                        brandColor: COLORS.PRIMARY,
                        slug: e.slug,
                    }));
                    setEstablishments(mappedEnterprises);
                }
            } catch (error) {
                console.log('Using mock data, API fetch failed:', error.message);
                // Keep mock data as fallback
            }
        };

        fetchEnterprises();
    }, []);

    // Filter logic
    useEffect(() => {
        const category = CATEGORIES.find(c => c.id === selectedCategory);
        const newData = establishments.filter(item => {
            const matchesCategory =
                selectedCategory === '0' ||
                (selectedCategory === 'favoritos' && item.isFavorite) ||
                item.category === category?.title;

            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
        setFilteredData(newData);
    }, [selectedCategory, searchQuery, establishments]);

    const renderHeader = () => (
        <View>
            {/* Address & Notification */}
            <View style={styles.topBar}>
                <Image
                    source={require('../../assets/petoo-logo.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    style={styles.addressContainer}
                    onPress={() => setAddressModalVisible(true)}
                >
                    <Text style={styles.addressLabel}>Entregar em</Text>
                    <View style={styles.addressRow}>
                        <Text style={styles.addressText} numberOfLines={1}>{selectedAddress.label} • {selectedAddress.details}</Text>
                        <Ionicons name="chevron-down" size={16} color={COLORS.PRIMARY} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.notificationBtn}
                    onPress={() => setNotificationsModalVisible(true)}
                >
                    <View>
                        <Ionicons name="notifications-outline" size={24} color={COLORS.PRIMARY} />
                        {notifications.length > 0 && <View style={styles.notifBadge} />}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color={COLORS.PRIMARY_LIGHT} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por hotel, banho..."
                        placeholderTextColor={COLORS.TEXT_MUTED}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={styles.categoryItem}
                        onPress={() => setSelectedCategory(cat.id)}
                    >
                        <View style={[
                            styles.categoryIcon,
                            selectedCategory === cat.id && styles.categoryIconActive
                        ]}>
                            <Ionicons
                                name={cat.icon}
                                size={28}
                                color={selectedCategory === cat.id ? '#FFFFFF' : COLORS.PRIMARY}
                            />
                        </View>
                        <Text style={[
                            styles.categoryText,
                            selectedCategory === cat.id && styles.categoryTextActive
                        ]}>{cat.title}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    {selectedCategory === 'favoritos' ? 'Meus Favoritos' : 'Lojas próximas'}
                </Text>
            </View>
        </View>
    );

    const renderEstablishment = ({ item }) => (
        <TouchableOpacity
            style={[styles.storeCard, !item.isOpen && styles.storeCardClosed]}
            onPress={() => {
                navigation.navigate('StoreDetails', { store: item });
            }}
        >
            <View style={styles.imageWrapper}>
                <Image
                    source={item.image}
                    style={[styles.storeImage, !item.isOpen && styles.grayscaleImage]}
                />
                {!item.isOpen && (
                    <View style={styles.closedOverlay}>
                        <Text style={styles.closedOverlayText}>FECHADO</Text>
                    </View>
                )}
            </View>

            <View style={styles.storeInfo}>
                <View style={styles.storeHeader}>
                    <Text style={[styles.storeName, !item.isOpen && styles.textMuted]}>{item.name}</Text>
                    {item.promoted && item.isOpen && (
                        <View style={styles.promotedBadge}>
                            <Text style={styles.promotedText}>Destaque</Text>
                        </View>
                    )}
                </View>

                <View style={styles.storeRatingRow}>
                    <Ionicons name="star" size={14} color={item.isOpen ? "#FFD700" : "#BDC3C7"} />
                    <Text style={[styles.ratingText, !item.isOpen && styles.textMuted]}>{item.rating}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={[styles.storeType, !item.isOpen && styles.textMuted]}>{item.type}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={[styles.storeDistance, !item.isOpen && styles.textMuted]}>{item.deliveryTime}</Text>
                </View>

                <View style={styles.statusRow}>
                    <Text style={[styles.storePrice, !item.isOpen && styles.textMuted]}>{item.priceRange}</Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={() => toggleFavorite(item.id)}
                style={styles.favoriteButton}
            >
                <Ionicons
                    name={item.isFavorite ? "heart" : "heart-outline"}
                    size={24}
                    color={item.isOpen ? COLORS.PRIMARY : "#BDC3C7"}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#FFFDF9', COLORS.BG_LIGHTER]}
                style={styles.background}
            >
                <FlatList
                    data={filteredData}
                    renderItem={renderEstablishment}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="heart-outline" size={60} color="#E8DEFF" />
                            <Text style={styles.emptyText}>Nenhum local encontrado</Text>
                        </View>
                    }
                />
            </LinearGradient>

            {/* Bottom Tab Simulation */}
            {!isAddressModalVisible && !isNotificationsModalVisible && (
                <View style={styles.bottomTab}>
                    <TouchableOpacity style={styles.tabItem}>
                        <Ionicons name="home" size={24} color={COLORS.PRIMARY} />
                        <Text style={styles.tabLabelActive}>Início</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.tabItem}
                        onPress={() => navigation.navigate('Orders')}
                    >
                        <Ionicons name="receipt-outline" size={24} color={COLORS.PRIMARY_LIGHT} />
                        <Text style={styles.tabLabel}>Pedidos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.tabItem}
                        onPress={() => navigation.navigate('MyPets')}
                    >
                        <Ionicons name="paw-outline" size={24} color={COLORS.PRIMARY_LIGHT} />
                        <Text style={styles.tabLabel}>Meus Pets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.tabItem}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Ionicons name="person-outline" size={24} color={COLORS.PRIMARY_LIGHT} />
                        <Text style={styles.tabLabel}>Perfil</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={isAddressModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAddressModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setAddressModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.addressModalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Onde você está?</Text>
                                    <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#2D3436" />
                                    </TouchableOpacity>
                                </View>

                                {INITIAL_ADDRESSES.map((addr) => (
                                    <TouchableOpacity
                                        key={addr.id}
                                        style={styles.modalAddressItem}
                                        onPress={() => {
                                            setSelectedAddress(addr);
                                            setAddressModalVisible(false);
                                        }}
                                    >
                                        <View style={[
                                            styles.addressIconCircle,
                                            selectedAddress.id === addr.id && styles.addressIconCircleActive
                                        ]}>
                                            <Ionicons
                                                name={addr.label === 'Casa' ? "home" : "business"}
                                                size={20}
                                                color={selectedAddress.id === addr.id ? "#FFFFFF" : COLORS.PRIMARY}
                                            />
                                        </View>
                                        <View style={styles.modalAddressInfo}>
                                            <Text style={styles.modalAddressLabel}>{addr.label}</Text>
                                            <Text style={styles.modalAddressDetails} numberOfLines={1}>{addr.details}</Text>
                                        </View>
                                        {selectedAddress.id === addr.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                                        )}
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    style={styles.addAddressBtn}
                                    onPress={() => {
                                        setAddressModalVisible(false);
                                        navigation.navigate('Profile', { edit: true });
                                    }}
                                >
                                    <Ionicons name="add-circle-outline" size={24} color={COLORS.PRIMARY} />
                                    <Text style={styles.addAddressText}>Cadastrar novo endereço</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Notifications Modal */}
            <Modal
                visible={isNotificationsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setNotificationsModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setNotificationsModalVisible(false)}
                >
                    <TouchableWithoutFeedback>
                        <View style={styles.notificationsModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Notificações</Text>
                                <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#2D3436" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <TouchableOpacity key={notif.id} style={styles.notifItem}>
                                            <View style={[styles.notifIcon, { backgroundColor: notif.color + '20' }]}>
                                                <Ionicons name={notif.icon} size={22} color={notif.color} />
                                            </View>
                                            <View style={styles.notifBody}>
                                                <View style={styles.notifHeader}>
                                                    <Text style={styles.notifTitle}>{notif.title}</Text>
                                                    <Text style={styles.notifTime}>{notif.time}</Text>
                                                </View>
                                                <Text style={styles.notifMessage}>{notif.message}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyNotifContainer}>
                                        <Ionicons name="notifications-off-outline" size={50} color={COLORS.BG_LIGHT} />
                                        <Text style={styles.emptyNotifText}>Você não tem novas notificações</Text>
                                    </View>
                                )}
                            </ScrollView>

                            {notifications.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearNotifBtn}
                                    onPress={() => setNotifications([])}
                                >
                                    <Text style={styles.clearNotifText}>Limpar tudo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFDF9',
    },
    background: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 100,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        marginBottom: 20,
    },
    headerLogo: {
        width: 100,
        height: 40,
        marginRight: 10,
    },
    addressContainer: {
        flex: 1,
        marginRight: 25,
    },
    addressLabel: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    addressText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2D3436',
        maxWidth: width * 0.4,
    },
    notificationBtn: {
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
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.BG_LIGHT,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#2D3436',
    },
    categoryList: {
        paddingHorizontal: 20,
        paddingBottom: 25,
        gap: 20,
    },
    categoryItem: {
        alignItems: 'center',
        gap: 8,
    },
    categoryIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryIconActive: {
        backgroundColor: COLORS.PRIMARY,
    },
    categoryText: {
        fontSize: 13,
        color: '#2D3436',
        fontWeight: '500',
    },
    categoryTextActive: {
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    storeCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 15,
        borderRadius: 20,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
    },
    storeCardClosed: {
        backgroundColor: '#F9F9FB',
        shadowOpacity: 0.03,
    },
    imageWrapper: {
        position: 'relative',
        width: 80,
        height: 80,
    },
    storeImage: {
        width: 80,
        height: 80,
        borderRadius: 15,
        backgroundColor: COLORS.BG_LIGHTER,
    },
    grayscaleImage: {
        opacity: 0.5,
    },
    closedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closedOverlayText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    textMuted: {
        color: '#BDC3C7',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusOpen: {
        color: '#27AE60',
        backgroundColor: '#EBFAF2',
    },
    statusClosed: {
        color: '#E74C3C',
        backgroundColor: '#FDEDEC',
    },
    storeInfo: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    storeName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    promotedBadge: {
        backgroundColor: COLORS.BG_LIGHT,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    promotedText: {
        fontSize: 10,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    storeRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 13,
        color: '#FFD700',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    separator: {
        fontSize: 13,
        color: COLORS.TEXT_MUTED,
        marginHorizontal: 5,
    },
    storeType: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
    },
    storeDistance: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
    },
    storePrice: {
        fontSize: 13,
        color: COLORS.PRIMARY,
        fontWeight: '600',
    },
    favoriteButton: {
        alignSelf: 'center',
        padding: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: 10,
        color: COLORS.TEXT_MUTED,
        fontSize: 16,
    },
    bottomTab: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.BG_LIGHT,
        paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    },
    tabItem: {
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 11,
        color: COLORS.PRIMARY_LIGHT,
        marginTop: 4,
    },
    tabLabelActive: {
        fontSize: 11,
        color: COLORS.PRIMARY,
        marginTop: 4,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    addressModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        paddingBottom: Platform.OS === 'ios' ? 60 : 30,
        width: '100%',
        maxHeight: height * 0.8,
        // Ensure no bottom margin or offset
        marginBottom: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    modalAddressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BG_LIGHT,
    },
    addressIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.BG_LIGHTER,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    addressIconCircleActive: {
        backgroundColor: COLORS.PRIMARY,
    },
    modalAddressInfo: {
        flex: 1,
    },
    modalAddressLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 2,
    },
    modalAddressDetails: {
        fontSize: 14,
        color: COLORS.PRIMARY_LIGHT,
    },
    addAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 20,
        paddingVertical: 15,
        backgroundColor: COLORS.BG_LIGHTER,
        borderRadius: 20,
    },
    addAddressText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    // Notifications styles
    notificationsModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        paddingBottom: Platform.OS === 'ios' ? 60 : 30,
        width: '100%',
        maxHeight: height * 0.7,
        marginTop: 'auto',
    },
    notifBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6B6B',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    notifItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 15,
    },
    notifIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifBody: {
        flex: 1,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    notifTime: {
        fontSize: 11,
        color: COLORS.TEXT_MUTED,
    },
    notifMessage: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
        lineHeight: 18,
    },
    emptyNotifContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyNotifText: {
        fontSize: 14,
        color: COLORS.TEXT_MUTED,
        textAlign: 'center',
    },
    clearNotifBtn: {
        marginTop: 20,
        paddingVertical: 10,
        alignItems: 'center',
    },
    clearNotifText: {
        fontSize: 14,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
});
