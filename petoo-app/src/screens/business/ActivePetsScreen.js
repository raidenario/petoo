import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Platform,
    StatusBar,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

const ACTIVE_PETS = []; // Start empty unless fetched

export default function ActivePetsScreen({ navigation }) {
    const { businessTheme } = useTheme();
    const { selectedRole, user } = useAuth();
    const [search, setSearch] = useState('');
    const [activePets, setActivePets] = useState(ACTIVE_PETS);
    const [summary, setSummary] = useState({ total: 0, hosted: 0, grooming: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivePets = async () => {
            try {
                // Mock fetch
                await new Promise(r => setTimeout(r, 1000));
                setActivePets([]);
                setSummary({ total: 0, hosted: 0, grooming: 0 });
            } catch (error) {
                console.error("Failed to fetch active pets", error);
            } finally {
                setLoading(false);
            }
        };
        fetchActivePets();
    }, []);

    const renderPetItem = ({ item }) => (
        <TouchableOpacity
            style={styles.petCard}
            onPress={() => navigation.navigate('BusinessDiaryUpdate', { pet: item })}
        >
            <View style={styles.petInfoSection}>
                <View style={[styles.photoContainer, { backgroundColor: businessTheme + '10' }]}>
                    <Ionicons name="paw" size={30} color={businessTheme} />
                </View>
                <View style={styles.details}>
                    <View style={styles.nameRow}>
                        <Text style={styles.petName}>{item.name}</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>
                    <Text style={styles.breedText}>{item.breed} • {item.owner}</Text>
                    <View style={styles.serviceTag}>
                        <Ionicons name="time-outline" size={12} color={businessTheme} />
                        <Text style={styles.serviceText}>{item.service} desde às {item.entryTime}</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.diaryButton, { backgroundColor: businessTheme }]}
                onPress={() => navigation.navigate('BusinessDiaryUpdate', { pet: item })}
            >
                <Ionicons name="journal-outline" size={20} color="#FFF" />
                <Text style={styles.diaryButtonText}>Diário</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FDFBFF', '#F0F9F8']} style={styles.background}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={businessTheme} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pets na Loja</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={businessTheme + '80'} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar pet ou proprietário..."
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                <FlatList
                    data={activePets} // Updated to state
                    renderItem={renderPetItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryCount, { color: businessTheme }]}>{summary.total}</Text>
                                <Text style={styles.summaryLabel}>Total Hoje</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryCount, { color: businessTheme }]}>{summary.hosted}</Text>
                                <Text style={styles.summaryLabel}>Hospedados</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryCount, { color: businessTheme }]}>{summary.grooming}</Text>
                                <Text style={styles.summaryLabel}>Banho/Tosa</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        !loading && (
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="paw-outline" size={60} color="#E0E0E0" />
                                <Text style={{ color: COLORS.TEXT_MUTED, marginTop: 10 }}>Nenhum pet na loja agora.</Text>
                            </View>
                        )
                    }
                />
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
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
    searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
    summaryBox: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 4,
    },
    summaryItem: { alignItems: 'center' },
    summaryCount: { fontSize: 22, fontWeight: '900', color: COLORS.PRIMARY },
    summaryLabel: { fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', marginTop: 4, fontWeight: 'bold' },
    divider: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    petCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 20,
        marginBottom: 15,
        elevation: 6,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    petInfoSection: { flexDirection: 'row', marginBottom: 15 },
    photoContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    details: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
    petName: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: { fontSize: 10, fontWeight: 'bold', color: '#27AE60', textTransform: 'uppercase' },
    breedText: { fontSize: 14, color: COLORS.PRIMARY_LIGHT, marginBottom: 8 },
    serviceTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    serviceText: { fontSize: 12, color: COLORS.TEXT_MUTED },
    diaryButton: {
        backgroundColor: COLORS.PRIMARY,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 15,
        gap: 8,
    },
    diaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});
