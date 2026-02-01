import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES = [
    { id: '1', label: 'Alimentação', icon: 'restaurant-outline', color: '#E65100', bg: '#FFF3E0' },
    { id: '2', label: 'Banho', icon: 'water-outline', color: '#01579B', bg: '#E1F5FE' },
    { id: '3', label: 'Brincadeira', icon: 'football-outline', color: '#7B1FA2', bg: '#F3E5F5' },
    { id: '4', label: 'Saúde', icon: 'medical-outline', color: '#B71C1C', bg: '#FFEBEE' },
    { id: '5', label: 'Soneca', icon: 'bed-outline', color: '#33691E', bg: '#DCEDC8' },
];

export default function BusinessDiaryUpdateScreen({ navigation, route }) {
    const { businessTheme } = useTheme();
    const { pet } = route.params;
    const [activeTab, setActiveTab] = useState('update'); // 'update' or 'chat'
    const [selectedCat, setSelectedCat] = useState('3');
    const [updateText, setUpdateText] = useState('');
    const [message, setMessage] = useState('');

    const handlePostUpdate = () => {
        if (!updateText) return;
        // Mock post logic
        setUpdateText('');
        setActiveTab('update');
        alert('Diário atualizado com sucesso! ✨');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FDFBFF', '#F0F9F8']} style={styles.background}>

                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color={businessTheme} />
                    </TouchableOpacity>
                    <View style={styles.petMiniProfile}>
                        <View style={[styles.petIconBox, { backgroundColor: businessTheme + '10', borderColor: businessTheme + '30' }]}>
                            <Ionicons name="paw" size={20} color={businessTheme} />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>Cuidando de {pet.name}</Text>
                            <Text style={styles.ownerSubtitle}>Responsável: {pet.owner || 'João Silva'}</Text>
                        </View>
                    </View>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'update' && { backgroundColor: businessTheme }]}
                        onPress={() => setActiveTab('update')}
                    >
                        <Ionicons name="add-circle" size={20} color={activeTab === 'update' ? '#FFF' : businessTheme + '80'} />
                        <Text style={[styles.tabText, activeTab === 'update' ? styles.activeTabText : { color: businessTheme + '80' }]}>Nova Atualização</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'chat' && { backgroundColor: businessTheme }]}
                        onPress={() => setActiveTab('chat')}
                    >
                        <Ionicons name="chatbubbles" size={20} color={activeTab === 'chat' ? '#FFF' : businessTheme + '80'} />
                        <Text style={[styles.tabText, activeTab === 'chat' ? styles.activeTabText : { color: businessTheme + '80' }]}>Falar com Dono</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'update' ? (
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionLabel}>O que o {pet.name} está fazendo?</Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.catScroll}
                            contentContainerStyle={{ gap: 12 }}
                        >
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.catItem,
                                        { backgroundColor: cat.bg },
                                        selectedCat === cat.id && { borderWidth: 2, borderColor: cat.color }
                                    ]}
                                    onPress={() => setSelectedCat(cat.id)}
                                >
                                    <Ionicons name={cat.icon} size={24} color={cat.color} />
                                    <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.inputCard}>
                            <TextInput
                                style={styles.textInput}
                                placeholder={`Escreva aqui como está sendo o dia do ${pet.name}...`}
                                multiline
                                numberOfLines={6}
                                value={updateText}
                                onChangeText={setUpdateText}
                                textAlignVertical="top"
                            />
                            <View style={styles.inputFooter}>
                                <TouchableOpacity style={styles.mediaBtn}>
                                    <Ionicons name="camera" size={20} color={COLORS.PRIMARY} />
                                    <Text style={styles.mediaText}>Anexar Foto</Text>
                                </TouchableOpacity>
                                <Text style={styles.charCount}>{updateText.length}/200</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.postButton, !updateText && styles.postButtonDisabled, { shadowColor: businessTheme }]}
                            onPress={handlePostUpdate}
                            disabled={!updateText}
                        >
                            <LinearGradient
                                colors={[businessTheme, businessTheme + 'CC']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.postGradient}
                            >
                                <Text style={styles.postButtonText}>Publicar no Diário</Text>
                                <Ionicons name="sparkles" size={18} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <View style={styles.chatContainer}>
                        <ScrollView style={styles.chatList} contentContainerStyle={{ padding: 20 }}>
                            <View style={styles.chatBubbleStore}>
                                <Text style={styles.chatTextStore}>Olá! O {pet.name} está ótimo, super brincalhão. Acabou de comer e agora está no jardim.</Text>
                                <Text style={styles.chatTime}>10:15</Text>
                            </View>
                            <View style={styles.chatBubbleUser}>
                                <Text style={styles.chatTextUser}>Que bom! Ele costuma estranhar um pouco no começo.</Text>
                                <Text style={styles.chatTimeUser}>10:20</Text>
                            </View>
                        </ScrollView>

                        <View style={styles.chatInputRow}>
                            <TextInput
                                style={styles.chatInput}
                                placeholder="Responda ao proprietário..."
                                value={message}
                                onChangeText={setMessage}
                            />
                            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: businessTheme }]}>
                                <Ionicons name="send" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFF',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    petMiniProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    petIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
    ownerSubtitle: { fontSize: 12, color: COLORS.PRIMARY_LIGHT },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        margin: 20,
        borderRadius: 20,
        padding: 5,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 15,
        gap: 8,
    },
    activeTab: { backgroundColor: COLORS.PRIMARY },
    tabText: { fontSize: 13, fontWeight: 'bold', color: COLORS.PRIMARY_LIGHT },
    activeTabText: { color: '#FFF' },
    content: { flex: 1, paddingHorizontal: 20 },
    sectionLabel: { fontSize: 18, fontWeight: 'bold', color: '#2D3436', marginBottom: 15 },
    catScroll: { marginBottom: 20, maxHeight: 100 },
    catItem: {
        width: 100,
        height: 90,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    catLabel: { fontSize: 11, fontWeight: 'bold' },
    inputCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        marginBottom: 25,
    },
    textInput: { fontSize: 16, color: '#2D3436', minHeight: 120 },
    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 15,
        marginTop: 10,
    },
    mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.BG_LIGHT, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
    mediaText: { fontSize: 12, color: COLORS.PRIMARY, fontWeight: 'bold' },
    charCount: { fontSize: 12, color: COLORS.TEXT_MUTED },
    postButton: { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: COLORS.PRIMARY, shadowOpacity: 0.3, shadowRadius: 10 },
    postGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
    postButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    postButtonDisabled: { opacity: 0.6 },
    chatContainer: { flex: 1 },
    chatList: { flex: 1 },
    chatBubbleStore: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 20,
        borderBottomLeftRadius: 5,
        maxWidth: '85%',
        marginBottom: 15,
        elevation: 2,
    },
    chatTextStore: { fontSize: 14, color: '#2D3436', lineHeight: 20 },
    chatTime: { fontSize: 10, color: COLORS.TEXT_MUTED, marginTop: 5, alignSelf: 'flex-end' },
    chatBubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.PRIMARY,
        padding: 15,
        borderRadius: 20,
        borderBottomRightRadius: 5,
        maxWidth: '85%',
        marginBottom: 15,
    },
    chatTextUser: { fontSize: 14, color: '#FFF', lineHeight: 20 },
    chatTimeUser: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 5, alignSelf: 'flex-end' },
    chatInputRow: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#FFF',
        gap: 10,
        alignItems: 'center',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        elevation: 20,
    },
    chatInput: { flex: 1, backgroundColor: COLORS.BG_LIGHT, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.PRIMARY, justifyContent: 'center', alignItems: 'center' },
});
