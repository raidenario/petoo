import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    StatusBar,
    Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
    getPendingInvites,
    approveInvite,
    rejectInvite,
    devPlatformLogin
} from '../../services/api';

export default function AdminRequestsScreen({ navigation }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const initAdmin = async () => {
        try {
            await devPlatformLogin();
            fetchRequests();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao autenticar como Admin (Dev).');
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const response = await getPendingInvites();
            setRequests(response.invites || []);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar as solicitações.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        initAdmin();
    }, []);

    const handleApprove = async (id) => {
        try {
            const response = await approveInvite(id);
            Alert.alert(
                'Aprovado!',
                `Código gerado: ${response.invite_code}\nO código foi copiado para a área de transferência.`,
                [{ text: 'OK', onPress: () => fetchRequests() }]
            );
            Clipboard.setString(response.invite_code);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível aprovar a solicitação.');
        }
    };

    const handleReject = async (id) => {
        Alert.alert(
            'Rejeitar',
            'Tem certeza que deseja rejeitar esta solicitação?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Rejeitar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await rejectInvite(id);
                            fetchRequests();
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível rejeitar a solicitação.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.cardHeader}>
                <Ionicons name="mail-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.emailText}>{item.email}</Text>
            </View>
            <Text style={styles.dateText}>Solicitado em: {new Date(item.created_at).toLocaleDateString()}</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(item.id)}
                >
                    <Text style={styles.buttonText}>Aprovar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(item.id)}
                >
                    <Text style={styles.buttonText}>Rejeitar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.title}>Solicitações Pendentes</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onRefresh={fetchRequests}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={60} color={COLORS.TEXT_MUTED} />
                            <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginLeft: 15,
    },
    listContent: {
        padding: 20,
    },
    requestCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
        marginLeft: 10,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.TEXT_MUTED,
        marginBottom: 15,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    approveButton: {
        backgroundColor: COLORS.PRIMARY,
    },
    rejectButton: {
        backgroundColor: '#FF7675',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 15,
        color: COLORS.TEXT_MUTED,
        fontSize: 16,
    },
});
