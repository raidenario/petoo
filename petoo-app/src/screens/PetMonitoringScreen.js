import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    FlatList,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const DIARY_ENTRIES = [
    {
        id: '1',
        time: '10:30',
        date: 'Hoje',
        title: 'Hora do Lanche! 🍎',
        description: 'O Thor comeu toda a maçã picada e adorou o carinho. Ele está super integrado com os outros cães.',
        type: 'Alimentação',
        image: require('../../assets/pet-playground.png'),
    },
    {
        id: '2',
        time: '14:15',
        date: 'Hoje',
        title: 'Bebendo água... 💦',
        description: 'Mantendo a hidratação em dia após correr muito no gramado!',
        type: 'Saúde',
    },
    {
        id: '3',
        time: '16:00',
        date: 'Hoje',
        title: 'Soneca da Tarde 💤',
        description: 'Depois de brincar muito, Thor tirou um cochilo no puff azul. Ele ronca um pouquinho, sabiam? 😂',
        type: 'Descanso',
        image: require('../../assets/hotel-interior.png'),
    },
];

const MOCK_MESSAGES = [
    { id: '1', text: 'Olá! Como o Thor está se comportando?', sender: 'me', time: '10:00' },
    { id: '2', text: 'Olá, João! Ele está ótimo, super brincalhão. Acabou de comer e agora está no jardim.', sender: 'store', time: '10:15' },
    { id: '3', text: 'Que bom! Ele costuma estranhar um pouco no começo.', sender: 'me', time: '10:20' },
    { id: '4', text: 'Não se preocupe, ele já fez amizade com uma Golden chamada Mel. Estão inseparáveis!', sender: 'store', time: '10:30' },
];

export default function PetMonitoringScreen({ navigation, route }) {
    const { pet } = route.params;
    const [activeTab, setActiveTab] = useState('diary'); // 'diary' or 'chat'
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const scrollRef = useRef();

    const handleSendMessage = () => {
        if (!message.trim()) return;
        const newMessage = {
            id: Date.now().toString(),
            text: message,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([...messages, newMessage]);
        setMessage('');
    };

    const renderDiaryItem = (item) => (
        <View key={item.id} style={styles.diaryCard}>
            <View style={styles.diaryHeader}>
                <View style={styles.diaryTimeBox}>
                    <Text style={styles.diaryTime}>{item.time}</Text>
                    <Text style={styles.diaryDate}>{item.date}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'Alimentação' ? '#FFF3E0' : item.type === 'Saúde' ? '#E1F5FE' : '#F3E5F5' }]}>
                    <Text style={[styles.typeText, { color: item.type === 'Alimentação' ? '#E65100' : item.type === 'Saúde' ? '#01579B' : '#7B1FA2' }]}>{item.type}</Text>
                </View>
            </View>

            <View style={styles.diaryContent}>
                <Text style={styles.diaryTitle}>{item.title}</Text>
                <Text style={styles.diaryDesc}>{item.description}</Text>
                {item.image && (
                    <Image source={item.image} style={styles.diaryImage} resizeMode="cover" />
                )}
            </View>

            <View style={styles.diaryFooter}>
                <Ionicons name="heart" size={20} color="#FF6B6B" />
                <Text style={styles.caregiverText}>Postado por Tio Rafa</Text>
            </View>

            {/* Scalloped edge effect decoration */}
            <View style={styles.notebookSpirals}>
                {[1, 2, 3, 4, 5, 6].map(i => <View key={i} style={styles.spiral} />)}
            </View>
        </View>
    );

    const renderChatMessage = (item) => (
        <View key={item.id} style={[styles.messageWrapper, item.sender === 'me' ? styles.myMessageWrapper : styles.storeMessageWrapper]}>
            <View style={[styles.messageCard, item.sender === 'me' ? styles.myMessage : styles.storeMessage]}>
                <Text style={[styles.messageText, item.sender === 'me' ? styles.myMessageText : styles.storeMessageText]}>{item.text}</Text>
                <Text style={styles.messageTime}>{item.time}</Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FDFBFF', '#F0F9F8']} style={styles.background}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Acompanhando {pet.name}</Text>
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={12} color={COLORS.PRIMARY_LIGHT} />
                            <Text style={styles.locationText}>{pet.location}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.petSmallCircle}>
                        <Ionicons name="paw" size={20} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'diary' && styles.activeTab]}
                        onPress={() => setActiveTab('diary')}
                    >
                        <Ionicons name="journal" size={20} color={activeTab === 'diary' ? '#FFF' : COLORS.PRIMARY_LIGHT} />
                        <Text style={[styles.tabText, activeTab === 'diary' && styles.activeTabText]}>Diário do Pet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
                        onPress={() => setActiveTab('chat')}
                    >
                        <View>
                            <Ionicons name="chatbubbles" size={20} color={activeTab === 'chat' ? '#FFF' : COLORS.PRIMARY_LIGHT} />
                            <View style={styles.notifDot} />
                        </View>
                        <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Conversar</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'diary' ? (
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        <View style={styles.diaryIntro}>
                            <Text style={styles.introTitle}>Diário de Aventuras 📖</Text>
                            <Text style={styles.introSubtitle}>Veja tudo o que o {pet.name} está aprontando hoje!</Text>
                        </View>
                        {DIARY_ENTRIES.map(renderDiaryItem)}
                    </ScrollView>
                ) : (
                    <View style={styles.chatContainer}>
                        <ScrollView
                            style={styles.chatMessages}
                            contentContainerStyle={{ padding: 20 }}
                            ref={scrollRef}
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {messages.map(renderChatMessage)}
                        </ScrollView>

                        <View style={styles.inputContainer}>
                            <TouchableOpacity style={styles.attachBtn}>
                                <Ionicons name="add" size={24} color={COLORS.PRIMARY} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Tire uma dúvida ou mande um oi..."
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
                                onPress={handleSendMessage}
                                disabled={!message.trim()}
                            >
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
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 10,
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    locationText: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        marginLeft: 4,
    },
    petSmallCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E8DEFF',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        margin: 20,
        borderRadius: 20,
        padding: 5,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
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
    activeTab: {
        backgroundColor: COLORS.PRIMARY,
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.PRIMARY_LIGHT,
    },
    activeTabText: {
        color: '#FFF',
    },
    notifDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF6B6B',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    diaryIntro: {
        marginBottom: 20,
    },
    introTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        textAlign: 'center',
        marginBottom: 5,
        fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
    },
    introSubtitle: {
        fontSize: 14,
        color: COLORS.TEXT_MUTED,
        textAlign: 'center',
    },
    diaryCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 20,
        marginBottom: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        position: 'relative',
        borderLeftWidth: 10,
        borderLeftColor: '#E8DEFF',
    },
    notebookSpirals: {
        position: 'absolute',
        top: 20,
        left: -12,
        bottom: 20,
        justifyContent: 'space-around',
    },
    spiral: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: COLORS.BG_LIGHT,
        borderWidth: 2,
        borderColor: '#B2A9C7',
    },
    diaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    diaryTimeBox: {
        backgroundColor: '#F8F5FC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
    },
    diaryTime: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    diaryDate: {
        fontSize: 10,
        color: COLORS.PRIMARY_LIGHT,
        textTransform: 'uppercase',
    },
    typeBadge: {
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 12,
    },
    typeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    diaryContent: {
        marginBottom: 15,
    },
    diaryTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#2D3436',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
    },
    diaryDesc: {
        fontSize: 15,
        color: '#2D3436',
        lineHeight: 22,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    diaryImage: {
        width: '100%',
        height: 200,
        borderRadius: 20,
        marginTop: 15,
    },
    diaryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 15,
        gap: 8,
    },
    caregiverText: {
        fontSize: 12,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: 'bold',
    },
    chatContainer: {
        flex: 1,
    },
    chatMessages: {
        flex: 1,
    },
    messageWrapper: {
        width: '100%',
        marginBottom: 15,
    },
    myMessageWrapper: {
        alignItems: 'flex-end',
    },
    storeMessageWrapper: {
        alignItems: 'flex-start',
    },
    messageCard: {
        maxWidth: '80%',
        padding: 15,
        borderRadius: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    myMessage: {
        backgroundColor: COLORS.PRIMARY,
        borderBottomRightRadius: 5,
    },
    storeMessage: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 5,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFF',
    },
    storeMessageText: {
        color: '#2D3436',
    },
    messageTime: {
        fontSize: 10,
        color: 'rgba(0,0,0,0.3)',
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        backgroundColor: '#FFF',
        alignItems: 'flex-end',
        gap: 10,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.BG_LIGHT,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 15,
        color: '#2D3436',
    },
    attachBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#B2A9C7',
    },
});
