import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    FlatList,
    Animated,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 350;
const OVERLAP = 80;
const STICKY_THRESHOLD = 70;

export default function StoreDetailsScreen({ navigation, route }) {
    const { store } = route.params;
    console.log(store);
    console.log('STORE DETAILS ->', store.name, store.brandColor);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;
    const galleryRef = useRef(null);

    const [cardHeight, setCardHeight] = useState(180);
    const [servicesHeight, setServicesHeight] = useState(0);

    const SERVICES = [
        { id: '1', title: 'Hospedagem Comum', price: 'R$ 80,00', description: 'Pernoite em ambiente controlado e seguro.' },
        { id: '2', title: 'Hospedagem VIP', price: 'R$ 120,00', description: 'Quarto individual com câmera 24h.' },
        { id: '3', title: 'Day Care', price: 'R$ 50,00', description: 'Diversão e socialização durante o dia.' },
        { id: '4', title: 'Day Care', price: 'R$ 50,00', description: 'Diversão e socialização durante o dia.' },
    ];

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, STICKY_THRESHOLD],
        outputRange: [0, -STICKY_THRESHOLD],
        extrapolate: 'clamp',
    });

    const headerScale = scrollY.interpolate({
        inputRange: [-150, 0],
        outputRange: [1.5, 1],
        extrapolate: 'clamp',
    });

    const nextImage = () => {
        if (currentImageIndex < store.gallery.length - 1) {
            const nextIdx = currentImageIndex + 1;
            setCurrentImageIndex(nextIdx);
            galleryRef.current?.scrollToIndex({ index: nextIdx, animated: true });
        }
    };

    const prevImage = () => {
        if (currentImageIndex > 0) {
            const prevIdx = currentImageIndex - 1;
            setCurrentImageIndex(prevIdx);
            galleryRef.current?.scrollToIndex({ index: prevIdx, animated: true });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: `${store.brandColor}05` }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* 1. CAMADA DE FUNDO: FOTOS (APENAS VISUAL) */}
            <Animated.View
                style={[
                    styles.galleryFixedContainer,
                    { transform: [{ translateY: headerTranslateY }, { scale: headerScale }] }
                ]}
                pointerEvents="none"
            >
                <FlatList
                    ref={galleryRef}
                    data={store.gallery}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={{ width, height: HEADER_HEIGHT }}>
                            <Image source={item} style={styles.headerImage} resizeMode="cover" />
                            <View style={styles.imageOverlay} />
                        </View>
                    )}
                    keyExtractor={(_, index) => index.toString()}
                />
            </Animated.View>

            {/* 2. CAMADA DE INTERAÇÃO DA GALERIA (SETAS E BADGE) - ACIMA DO SCROLL */}
            <Animated.View
                style={[
                    styles.galleryFixedContainer,
                    { transform: [{ translateY: headerTranslateY }] },
                    { zIndex: 15 }
                ]}
                pointerEvents="box-none"
            >
                {store.gallery.length > 1 && (
                    <View style={styles.galleryControls}>
                        <TouchableOpacity onPress={prevImage} style={styles.navBtn}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                        <TouchableOpacity onPress={nextImage} style={styles.navBtn}><Ionicons name="chevron-forward" size={24} color="#FFF" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.photoBadge}><Text style={styles.photoCountText}>{currentImageIndex + 1}/{store.gallery.length}</Text></View>
            </Animated.View>

            {/* 3. CAMADA DE SCROLL: CONTÉM A FOLHA BRANCA E O CLIQUE NA FOTO */}
            <Animated.View
                style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                pointerEvents="box-none"
            >
                {/* O espaçador agora contém o Touchable do Modal para permitir scroll + click */}
                <View style={{ height: HEADER_HEIGHT + 20 }} pointerEvents="box-none">
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setModalVisible(true)}
                        style={StyleSheet.absoluteFill}
                    />
                </View>

                <View style={styles.mainSheet} pointerEvents="auto">
                    <Text style={styles.servicesTitle}>Serviços Disponíveis</Text>
                    <ScrollView
                        style={styles.servicesSection}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                        onLayout={(e) => setServicesHeight(e.nativeEvent.layout.height)}
                    >
                        {SERVICES.map(service => (
                            <TouchableOpacity
                                key={service.id}
                                style={[styles.serviceCard, { backgroundColor: `${store.brandColor}0D`, borderColor: `${store.brandColor}15` }]}
                                onPress={() => {
                                    const screen = store.category === 'Hoteis' ? 'HotelPetBooking' : 'GroomingBooking';
                                    navigation.navigate(screen, { store, service });
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.serviceName}>{service.title}</Text>
                                    <Text style={[styles.serviceDesc, { color: `${store.brandColor}99` }]}>{service.description}</Text>
                                    <Text style={[styles.servicePrice, { color: store.brandColor }]}>{service.price}</Text>
                                </View>
                                <View style={[styles.addButton, { backgroundColor: `${store.brandColor}15` }]}><Ionicons name="add" size={24} color={store.brandColor} /></View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={{ height: 150 }} />
                </View>
            </Animated.View>

            {/* 4. CAMADA DE INFO: CARD DA LOJA (Z-INDEX ALTO) */}
            <Animated.View
                style={[
                    styles.cardFixedWrapper,
                    { transform: [{ translateY: headerTranslateY }] }
                ]}
                pointerEvents="box-none"
                onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
            >
                <View style={styles.shopInfoCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                        <View style={[styles.ratingBadge, { backgroundColor: `${store.brandColor}15` }]}>
                            <Ionicons name="star" size={16} color="#F1C40F" /><Text style={[styles.ratingText, { color: store.brandColor }]}>{store.rating}</Text>
                        </View>
                    </View>
                    <Text style={[styles.addressText, { color: `${store.brandColor}BF` }]} numberOfLines={1}>{store.address}</Text>
                    <View style={styles.tagsRow}>
                        <View style={styles.infoTag}><Ionicons name="time-outline" size={16} color={store.brandColor} /><Text style={styles.tagLabel}>{store.hours}</Text></View>
                        <View style={styles.infoTag}><Ionicons name="location-outline" size={16} color={store.brandColor} /><Text style={styles.tagLabel}>{store.deliveryTime}</Text></View>
                    </View>
                </View>
            </Animated.View>

            {/* 5. CAMADA DE UI: BOTÕES DE TOPO */}
            <View style={styles.topBarUI} pointerEvents="box-none">
                <View style={styles.topButtonsContainer}>
                    <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2D3436" /></TouchableOpacity>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity style={styles.circleBtn}><Ionicons name="share-social-outline" size={22} color="#2D3436" /></TouchableOpacity>
                        <TouchableOpacity style={[styles.circleBtn, { marginLeft: 10 }]}><Ionicons name={store.isFavorite ? "heart" : "heart-outline"} size={22} color={store.isFavorite ? store.brandColor : "#2D3436"} /></TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* BOTÃO FLUTUANTE */}
            <TouchableOpacity style={[styles.floatingActionBtn, { backgroundColor: store.brandColor }]}>
                <Ionicons name="calendar-outline" size={24} color="#FFF" /><Text style={styles.btnLabel}>Agendar Agora</Text>
            </TouchableOpacity>

            {/* MODAL GALLERY */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
                    <FlatList
                        data={store.gallery}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={currentImageIndex}
                        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                        renderItem={({ item }) => (
                            <View style={styles.modalImageContainer}><Image source={item} style={styles.fullScreenImage} resizeMode="contain" /></View>
                        )}
                        keyExtractor={(_, index) => index.toString()}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // LAYER 1: GALLERY
    galleryFixedContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 0 },
    headerImage: { width, height: HEADER_HEIGHT },
    imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
    galleryControls: { position: 'absolute', top: HEADER_HEIGHT / 2 - 22, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: -50 },
    navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    photoBadge: { position: 'absolute', top: 170, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    photoCountText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    // LAYER 3: INFO CARD (TOP)
    cardFixedWrapper: { position: 'absolute', top: HEADER_HEIGHT - OVERLAP, left: 20, right: 20, zIndex: 20, marginTop: -70 },
    shopInfoCard: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 20, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    storeName: { fontSize: 24, fontWeight: '900', color: '#2D3436', flex: 1 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    ratingText: { fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
    addressText: { fontSize: 14, marginBottom: 20 },
    tagsRow: { flexDirection: 'row', gap: 15 },
    infoTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tagLabel: { fontSize: 13, color: '#2D3436', fontWeight: '700' },

    // LAYER 2: SERVICES SHEET (MIDDLE)
    mainSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 20, marginTop: -110, paddingTop: 100, zIndex: 10, minHeight: height },
    servicesSection: { maxHeight: height - 530 },
    servicesTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginBottom: 20 },
    serviceCard: { flexDirection: 'row', borderRadius: 20, padding: 18, marginBottom: 15, alignItems: 'center', borderWidth: 1 },
    serviceName: { fontSize: 17, fontWeight: 'bold', color: '#2D3436', marginBottom: 4 },
    serviceDesc: { fontSize: 13, marginBottom: 10, lineHeight: 18 },
    servicePrice: { fontSize: 18, fontWeight: '900' },
    addButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    // UI & OTHERS
    topBarUI: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
    topButtonsContainer: { marginTop: Platform.OS === 'ios' ? 50 : 30, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
    circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    floatingActionBtn: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 60, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 8, zIndex: 31 },
    btnLabel: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    modalContent: { flex: 1, backgroundColor: '#000' },
    modalCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20 },
    modalImageContainer: { width, height, justifyContent: 'center' },
    fullScreenImage: { width, height: height * 0.8 },
});
