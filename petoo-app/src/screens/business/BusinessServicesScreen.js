import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    ScrollView,
    Platform,
    StatusBar,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const INITIAL_SERVICES = [
    { id: '1', name: 'Banho & Tosa Completo', price: '85,00', duration: '60 min', category: 'Estética', professional: 'Ricardo Silva' },
    { id: '2', name: 'Hospedagem Diária', price: '120,00', duration: 'Diária', category: 'Hotel', professional: 'Todos' },
    { id: '3', name: 'Corte de Unhas', price: '25,00', duration: '15 min', category: 'Cuidados', professional: 'Ana Paula' },
];

export default function BusinessServicesScreen({ navigation }) {
    const { businessTheme } = useTheme();
    const [services, setServices] = useState(INITIAL_SERVICES);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingService, setEditingService] = useState(null);

    // Form States
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('');
    const [category, setCategory] = useState('');
    const [professional, setProfessional] = useState('');

    const openModal = (service = null) => {
        if (service) {
            setEditingService(service);
            setName(service.name);
            setPrice(service.price);
            setDuration(service.duration);
            setCategory(service.category);
            setProfessional(service.professional);
        } else {
            setEditingService(null);
            setName('');
            setPrice('');
            setDuration('');
            setCategory('');
            setProfessional('');
        }
        setModalVisible(true);
    };

    const handleSave = () => {
        if (!name || !price || !duration) {
            Alert.alert('Erro', 'Por favor, preencha nome, preço e duração.');
            return;
        }

        if (editingService) {
            setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, name, price, duration, category, professional } : s));
        } else {
            const newService = {
                id: Math.random().toString(),
                name, price, duration, category, professional
            };
            setServices(prev => [...prev, newService]);
        }
        setModalVisible(false);
        Alert.alert('Sucesso', 'Serviço salvo com sucesso! ✨');
    };

    const handleDelete = (id) => {
        Alert.alert('Excluir', 'Deseja realmente excluir este serviço?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                onPress: () => setServices(prev => prev.filter(s => s.id !== id)),
                style: 'destructive'
            }
        ]);
    };

    const renderServiceItem = ({ item }) => (
        <TouchableOpacity style={styles.serviceCard} onPress={() => openModal(item)}>
            <View style={styles.cardInfo}>
                <View style={[styles.categoryIcon, { backgroundColor: businessTheme + '10' }]}>
                    <MaterialCommunityIcons
                        name={item.category.includes('Estética') ? 'content-cut' : item.category.includes('Hotel') ? 'home-heart' : 'paw'}
                        size={24}
                        color={businessTheme}
                    />
                </View>
                <View style={styles.textDetails}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.professionalText}>Profissional: <Text style={{ fontWeight: 'bold' }}>{item.professional}</Text></Text>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={COLORS.TEXT_MUTED} />
                            <Text style={styles.metaText}>{item.duration}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="cash-outline" size={14} color={COLORS.TEXT_MUTED} />
                            <Text style={styles.metaText}>R$ {item.price}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
                </TouchableOpacity>
            </View>
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
                    <Text style={styles.headerTitle}>Meus Serviços</Text>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: businessTheme }]}
                        onPress={() => openModal()}
                    >
                        <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={services}
                    renderItem={renderServiceItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <Text style={styles.listSubtitle}>Gerencie os serviços que sua empresa oferece para os clientes no app.</Text>
                    }
                />

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#2D3436" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nome do Serviço</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: Banho de Ofurô"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Preço (R$)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0,00"
                                            keyboardType="numeric"
                                            value={price}
                                            onChangeText={setPrice}
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 15 }]}>
                                        <Text style={styles.label}>Duração</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ex: 45 min"
                                            value={duration}
                                            onChangeText={setDuration}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Categoria</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: Estética, Saúde, Hotel..."
                                        value={category}
                                        onChangeText={setCategory}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Profissional Responsável</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nome do funcionário ou 'Todos'"
                                        value={professional}
                                        onChangeText={setProfessional}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: businessTheme }]}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.saveBtnText}>Salvar Serviço</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
    addButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    listContent: { padding: 20 },
    listSubtitle: { fontSize: 13, color: COLORS.TEXT_MUTED, marginBottom: 25 },
    serviceCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardInfo: { flexDirection: 'row', alignItems: 'center' },
    categoryIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    textDetails: { flex: 1 },
    serviceName: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
    professionalText: { fontSize: 13, color: COLORS.TEXT_MUTED, marginTop: 4 },
    metaRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, color: COLORS.TEXT_MUTED, fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    form: { flex: 1 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#2D3436', marginBottom: 8 },
    input: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 15, padding: 15, fontSize: 15 },
    row: { flexDirection: 'row' },
    saveBtn: { paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 10, marginBottom: 20 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
