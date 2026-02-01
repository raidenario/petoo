import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

const INITIAL_EMPLOYEES = []; // Start empty unless fetched

export default function EmployeesScreen({ navigation }) {
    const { businessTheme } = useTheme();
    const { selectedRole, user } = useAuth();
    const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                // Mock fetch - waiting for backend endpoint /enterprise/{id}/employees
                await new Promise(r => setTimeout(r, 1000));

                // For now, return empty or the owner itself?
                // Typically employees list might include the owner or just staff.
                // Let's assume empty for new company.
                setEmployees([]);
            } catch (error) {
                console.error("Failed to fetch employees", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        role: '',
        phone: '',
        hiringDate: '',
        userLevel: 'empregado',
        status: 'Cadastro Pendente'
    });

    const resetForm = () => {
        setFormData({
            name: '',
            cpf: '',
            role: '',
            phone: '',
            hiringDate: '',
            userLevel: 'empregado',
            status: 'Cadastro Pendente'
        });
        setEditingEmployee(null);
    };

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                cpf: employee.cpf || '',
                role: employee.role,
                phone: employee.phone,
                hiringDate: employee.hiringDate || '',
                userLevel: employee.userLevel || 'empregado',
                status: employee.status || 'Cadastro Completo'
            });
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const handleSaveEmployee = () => {
        const { name, role, phone, userLevel } = formData;

        if (!name || !role || !phone) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios (*)');
            return;
        }

        const now = new Date();
        const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        if (editingEmployee) {
            // Edit logic
            const updatedEmployees = employees.map(emp =>
                emp.id === editingEmployee.id ? { ...emp, ...formData } : emp
            );
            setEmployees(updatedEmployees);
            Alert.alert('Sucesso', 'Funcionário atualizado com sucesso!');
        } else {
            // Add logic
            const newEmp = {
                id: Date.now().toString(),
                ...formData,
                registrationDate: formattedDate,
                status: 'Cadastro Pendente', // Novo sempre pendente até ele acessar
                photo: null
            };
            setEmployees([newEmp, ...employees]);
            Alert.alert(
                'Funcionário Cadastrado',
                `Um SMS de convite foi enviado para ${phone} para que ${name} complete o cadastro na plataforma. ✨`
            );
        }

        setModalVisible(false);
        resetForm();
    };

    const renderEmployeeItem = ({ item }) => (
        <TouchableOpacity
            style={styles.employeeCard}
            onPress={() => handleOpenModal(item)}
        >
            <View style={styles.employeeInfo}>
                <View style={[styles.avatarCircle, { backgroundColor: businessTheme + '10' }]}>
                    <Ionicons name="person" size={24} color={businessTheme} />
                </View>
                <View style={styles.details}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={[styles.empRole, { color: businessTheme }]}>{item.role}</Text>
                    <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={12} color={COLORS.TEXT_MUTED} />
                        <Text style={styles.empContact}>{item.phone}</Text>
                    </View>
                    <View style={styles.levelBadge}>
                        <Text style={[styles.levelText, { color: businessTheme }]}>
                            {item.userLevel === 'admin' ? 'Administrador' : 'Colaborador'}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'Cadastro Completo' ? '#E8F5E9' : '#FFF3E0' }
            ]}>
                <Text style={[
                    styles.statusText,
                    { color: item.status === 'Cadastro Completo' ? '#27AE60' : '#F2994A' }
                ]}>
                    {item.status}
                </Text>
            </View>
        </TouchableOpacity>
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
                    <Text style={styles.headerTitle}>Nossa Equipe</Text>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: businessTheme }]}
                        onPress={() => handleOpenModal()}
                    >
                        <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={employees}
                    renderItem={renderEmployeeItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Text style={[styles.listSubtitle, { color: COLORS.TEXT_MUTED }]}>
                                Gerencie os profissionais que cuidam dos pets na sua empresa. Toque em um card para editar.
                            </Text>
                        </View>
                    }
                />

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#2D3436" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.photoUpload}>
                                    <TouchableOpacity style={styles.photoCircle}>
                                        <Ionicons name="camera" size={30} color={businessTheme} />
                                    </TouchableOpacity>
                                    <Text style={styles.photoLabel}>Foto do Perfil</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nome Completo *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: Carlos Alberto Silva"
                                        value={formData.name}
                                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>CPF</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="000.000.000-00"
                                        keyboardType="numeric"
                                        value={formData.cpf}
                                        onChangeText={(text) => setFormData({ ...formData, cpf: text })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Cargo / Função *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: Tosador, Veterinário..."
                                        value={formData.role}
                                        onChangeText={(text) => setFormData({ ...formData, role: text })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Telefone *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="(11) 90000-0000"
                                        keyboardType="phone-pad"
                                        value={formData.phone}
                                        onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Data de Contratação</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="DD/MM/AAAA"
                                        value={formData.hiringDate}
                                        onChangeText={(text) => setFormData({ ...formData, hiringDate: text })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nível de Acesso *</Text>
                                    <View style={styles.levelToggleRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.levelToggle,
                                                formData.userLevel === 'empregado' && { backgroundColor: businessTheme }
                                            ]}
                                            onPress={() => setFormData({ ...formData, userLevel: 'empregado' })}
                                        >
                                            <Text style={[
                                                styles.levelToggleText,
                                                formData.userLevel === 'empregado' && { color: '#FFF' }
                                            ]}>Empregado</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.levelToggle,
                                                formData.userLevel === 'admin' && { backgroundColor: businessTheme }
                                            ]}
                                            onPress={() => setFormData({ ...formData, userLevel: 'admin' })}
                                        >
                                            <Text style={[
                                                styles.levelToggleText,
                                                formData.userLevel === 'admin' && { color: '#FFF' }
                                            ]}>Admin</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: businessTheme }]}
                                    onPress={handleSaveEmployee}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {editingEmployee ? 'Salvar Alterações' : 'Cadastrar e Enviar Convite'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
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
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    listHeader: { marginBottom: 25 },
    listSubtitle: { fontSize: 13, lineHeight: 18 },
    employeeCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 18,
        borderRadius: 24,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    employeeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarCircle: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    details: { flex: 1 },
    empName: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
    empRole: { fontSize: 13, marginVertical: 2 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    empContact: { fontSize: 12, color: COLORS.TEXT_MUTED },
    levelBadge: { marginTop: 4 },
    levelText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 25,
        maxHeight: '92%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2D3436' },
    formScroll: { flexGrow: 0 },
    photoUpload: { alignItems: 'center', marginBottom: 25 },
    photoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.BG_LIGHT,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    photoLabel: { fontSize: 12, color: COLORS.TEXT_MUTED },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#2D3436', marginBottom: 8, marginLeft: 4 },
    input: {
        backgroundColor: COLORS.BG_LIGHT,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 18,
        fontSize: 15,
        color: '#2D3436',
    },
    levelToggleRow: { flexDirection: 'row', gap: 10 },
    levelToggle: {
        flex: 1,
        backgroundColor: COLORS.BG_LIGHT,
        paddingVertical: 12,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    levelToggleText: { fontSize: 14, fontWeight: 'bold', color: COLORS.TEXT_MUTED },
    saveButton: {
        paddingVertical: 18,
        borderRadius: 22,
        alignItems: 'center',
        marginTop: 15,
        elevation: 4,
        shadowColor: COLORS.PRIMARY,
    },
    saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
