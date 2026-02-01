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
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { apiRequest } from '../services/api';

const COMMON_VACCINES = {
    'Cão': ['V8', 'V10', 'Raiva', 'Giárdia', 'Gripe Canina', 'Leishmaniose'],
    'Gato': ['V3', 'V4', 'V5', 'Raiva'],
    'Outros': ['Polivalente', 'Raiva']
};

const COMMON_DISEASES = [
    'Diabetes', 'Doença Periodontal', 'Osteoporose', 'Colite', 'Endócrino',
    'Câncer', 'Urinário', 'Obesidade', 'Cardíaco', 'Dermatite', 'Refluxo',
    'Insuficiência Renal', 'Gastroesofágico', 'Displasia', 'Otite',
    'Artrite Reumatóide', 'Catarata', 'Fadiga Crônica', 'Alergia', 'Bronquite'
];


export default function PetFormScreen({ navigation, route }) {
    const editPet = route.params?.pet;

    const [loading, setLoading] = useState(false);

    // Basic Info
    const [name, setName] = useState(editPet?.name || '');
    const [breed, setBreed] = useState(editPet?.breed || '');
    const [age, setAge] = useState(editPet?.age || '');
    const [weight, setWeight] = useState(editPet?.weight ? String(editPet.weight) : '');
    const [type, setType] = useState(editPet?.type === 'CAT' ? 'Gato' : 'Cão');
    const [gender, setGender] = useState(editPet?.gender || 'Macho');
    const [isNeutered, setIsNeutered] = useState(editPet?.isNeutered || false);

    const [vaccinationCard, setVaccinationCard] = useState(editPet?.vaccinationCard || null);

    // Health & Sections
    const [selectedVaccines, setSelectedVaccines] = useState(editPet?.medical_notes?.vaccines || []);
    const [otherVaccine, setOtherVaccine] = useState('');
    const [selectedDiseases, setSelectedDiseases] = useState(editPet?.medical_notes?.diseases || []);
    const [otherDisease, setOtherDisease] = useState('');
    const [medication, setMedication] = useState(editPet?.medical_notes?.medication || '');
    const [characteristics, setCharacteristics] = useState(editPet?.notes?.characteristics || '');
    const [feeding, setFeeding] = useState(editPet?.notes?.feeding || '');

    // Walks
    const [doesWalk, setDoesWalk] = useState(editPet?.notes?.doesWalk || false);
    const [walkPeriods, setWalkPeriods] = useState(editPet?.notes?.walkPeriods || []);

    const toggleSelection = (item, list, setList) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSave = async () => {
        if (!name || !breed) {
            Alert.alert('Dados incompletos', 'Por favor, preencha o nome e a raça do seu pet.');
            return;
        }

        setLoading(true);
        try {
            // Preparar dados para o backend
            const petData = {
                name,
                species: type === 'Gato' ? 'CAT' : 'DOG',
                breed,
                size: 'MEDIUM', // TODO: Adicionar campo de tamanho no form
                weight_kg: weight ? parseFloat(weight.replace(',', '.')) : null,
                notes: {
                    age,
                    gender,
                    isNeutered,
                    characteristics,
                    feeding,
                    doesWalk,
                    walkPeriods
                },
                medical_notes: {
                    vaccines: [...selectedVaccines, ...(otherVaccine ? [otherVaccine] : [])],
                    diseases: [...selectedDiseases, ...(otherDisease ? [otherDisease] : [])],
                    medication
                }
            };

            let response;
            if (editPet) {
                // Update existing pet
                response = await apiRequest(`/client/pets/${editPet.id}`, 'PUT', petData);
            } else {
                // Create new pet
                response = await apiRequest('/client/pets', 'POST', petData);
            }

            Alert.alert('Sucesso', `Pet ${editPet ? 'atualizado' : 'cadastrado'} com sucesso!`);

            // Adicionar um pequeno delay para garantir que o modal feche antes da navegação atualizar
            setTimeout(() => {
                navigation.goBack();
            }, 500);

        } catch (error) {
            console.error('Erro ao salvar pet:', error);
            Alert.alert('Erro', 'Não foi possível salvar as informações do pet. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const renderChips = (items, selectedList, setList, hasOther = false, otherValue = '', setOtherValue = () => { }) => (
        <View style={styles.chipContainer}>
            {items.map(item => (
                <TouchableOpacity
                    key={item}
                    style={[
                        styles.chip,
                        selectedList.includes(item) && styles.chipActive
                    ]}
                    onPress={() => toggleSelection(item, selectedList, setList)}
                >
                    <Text style={[
                        styles.chipText,
                        selectedList.includes(item) && styles.chipTextActive
                    ]}>{item}</Text>
                </TouchableOpacity>
            ))}
            {hasOther && (
                <TouchableOpacity
                    style={[
                        styles.chip,
                        selectedList.includes('Outro') && styles.chipActive
                    ]}
                    onPress={() => toggleSelection('Outro', selectedList, setList)}
                >
                    <Text style={[
                        styles.chipText,
                        selectedList.includes('Outro') && styles.chipTextActive
                    ]}>Outro</Text>
                </TouchableOpacity>
            )}
            {selectedList.includes('Outro') && (
                <TextInput
                    style={styles.otherInput}
                    placeholder="Especifique aqui..."
                    value={otherValue}
                    onChangeText={setOtherValue}
                />
            )}
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={[COLORS.BG_LIGHTER, '#FFFDF9']}
                style={styles.background}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{editPet ? 'Editar Pet' : 'Novo Pet'}</Text>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Ionicons name="checkmark-sharp" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Photo Picker */}
                    <TouchableOpacity style={styles.photoContainer}>
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="camera-outline" size={40} color={COLORS.PRIMARY} />
                            <Text style={styles.photoText}>Adicionar Foto</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Section 1: Basic Info */}
                        <Text style={styles.sectionTitle}>Informações Básicas</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome do Pet</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Thor, Luna, etc."
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Espécie</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, type === 'Cão' && styles.toggleBtnActive]}
                                        onPress={() => setType('Cão')}
                                    >
                                        <FontAwesome5 name="dog" size={18} color={type === 'Cão' ? COLORS.PRIMARY : COLORS.PRIMARY_LIGHT} />
                                        <Text style={[styles.toggleBtnText, type === 'Cão' && styles.toggleBtnTextActive]}>Cão</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, type === 'Gato' && styles.toggleBtnActive]}
                                        onPress={() => setType('Gato')}
                                    >
                                        <FontAwesome5 name="cat" size={18} color={type === 'Gato' ? COLORS.PRIMARY : COLORS.PRIMARY_LIGHT} />
                                        <Text style={[styles.toggleBtnText, type === 'Gato' && styles.toggleBtnTextActive]}>Gato</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 15 }]}>
                                <Text style={styles.label}>Gênero</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, gender === 'Macho' && styles.toggleBtnActive]}
                                        onPress={() => setGender('Macho')}
                                    >
                                        <MaterialCommunityIcons name="gender-male" size={22} color={gender === 'Macho' ? COLORS.PRIMARY : COLORS.PRIMARY_LIGHT} />
                                        <Text style={[styles.toggleBtnText, gender === 'Macho' && styles.toggleBtnTextActive]}>Macho</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, gender === 'Fêmea' && styles.toggleBtnActive]}
                                        onPress={() => setGender('Fêmea')}
                                    >
                                        <MaterialCommunityIcons name="gender-female" size={22} color={gender === 'Fêmea' ? COLORS.PRIMARY : COLORS.PRIMARY_LIGHT} />
                                        <Text style={[styles.toggleBtnText, gender === 'Fêmea' && styles.toggleBtnTextActive]}>Fêmea</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Idade</Text>
                                <TextInput
                                    style={styles.input}
                                    value={age}
                                    onChangeText={setAge}
                                    placeholder="Ex: 3 anos"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 15 }]}>
                                <Text style={styles.label}>Peso (kg)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={weight}
                                    onChangeText={setWeight}
                                    placeholder="Ex: 10"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Raça</Text>
                            <TextInput
                                style={styles.input}
                                value={breed}
                                onChangeText={setBreed}
                                placeholder="Golden Retriever, SRD..."
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Castrado?</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, isNeutered && styles.toggleBtnActive]}
                                    onPress={() => setIsNeutered(true)}
                                >
                                    <Text style={[styles.toggleBtnText, isNeutered && styles.toggleBtnTextActive]}>Sim</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, !isNeutered && styles.toggleBtnActive]}
                                    onPress={() => setIsNeutered(false)}
                                >
                                    <Text style={[styles.toggleBtnText, !isNeutered && styles.toggleBtnTextActive]}>Não</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Order Change Starts Here: Vaccines -> Diseases -> Medication -> Characteristics -> Walks -> Feeding */}

                        {/* Section: Vaccines */}
                        <Text style={styles.sectionTitle}>Vacinação</Text>
                        {renderChips(
                            COMMON_VACCINES[type] || COMMON_VACCINES['Outros'],
                            selectedVaccines,
                            setSelectedVaccines,
                            true,
                            otherVaccine,
                            setOtherVaccine
                        )}

                        <Text style={styles.sectionTitle}>Carteirinha de Vacinação</Text>
                        <TouchableOpacity
                            style={styles.uploadCard}
                            onPress={() => {
                                Alert.alert(
                                    "Documento",
                                    "Deseja selecionar um arquivo ou tirar uma foto da carteirinha?",
                                    [
                                        { text: "Cancelar", style: "cancel" },
                                        {
                                            text: "Selecionar",
                                            onPress: () => {
                                                setVaccinationCard("carteirinha_exemplo.pdf");
                                                Alert.alert("Sucesso", "Carteirinha anexada com sucesso!");
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            {vaccinationCard ? (
                                <View style={styles.uploadedFile}>
                                    <View style={styles.fileInfo}>
                                        <Ionicons name="document-attach" size={24} color={COLORS.PRIMARY} />
                                        <Text style={styles.uploadedFileName}>carteirinha_vacinacao_thor.pdf</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setVaccinationCard(null)}>
                                        <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <View style={styles.uploadIconCircle}>
                                        <Ionicons name="cloud-upload-outline" size={28} color={COLORS.PRIMARY} />
                                    </View>
                                    <Text style={styles.uploadText}>Importar foto ou PDF da carteirinha</Text>
                                    <Text style={styles.uploadSubtext}>JPG, PNG ou PDF até 5MB</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Section: Health */}
                        <Text style={styles.sectionTitle}>Saúde e Patologias</Text>
                        {renderChips(
                            COMMON_DISEASES,
                            selectedDiseases,
                            setSelectedDiseases,
                            true,
                            otherDisease,
                            setOtherDisease
                        )}

                        {/* Section: Medication */}
                        <Text style={styles.sectionTitle}>Medicamentos e Horários</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={[styles.input, styles.textAreaSlim]}
                                value={medication}
                                onChangeText={setMedication}
                                placeholder="Descreva os remédios e a frequência..."
                                multiline
                                numberOfLines={2}
                            />
                        </View>

                        {/* Section: Characteristics */}
                        <Text style={styles.sectionTitle}>Características</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={[styles.input, styles.textAreaSlim]}
                                value={characteristics}
                                onChangeText={setCharacteristics}
                                placeholder="O que ele gosta, medos, temperamento..."
                                multiline
                                numberOfLines={2}
                            />
                        </View>

                        {/* Section: Walk */}
                        <Text style={styles.sectionTitle}>Passeios</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>O pet passeia diariamente?</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, doesWalk && styles.toggleBtnActive]}
                                    onPress={() => setDoesWalk(true)}
                                >
                                    <Text style={[styles.toggleBtnText, doesWalk && styles.toggleBtnTextActive]}>Sim</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, !doesWalk && styles.toggleBtnActive]}
                                    onPress={() => setDoesWalk(false)}
                                >
                                    <Text style={[styles.toggleBtnText, !doesWalk && styles.toggleBtnTextActive]}>Não</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {doesWalk && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.subLabel}>Quais horários ele costuma passear?</Text>
                                {renderChips(['Manhã', 'Tarde', 'Noite'], walkPeriods, setWalkPeriods)}
                            </View>
                        )}

                        {/* Section: Alimentação */}
                        <Text style={styles.sectionTitle}>Alimentação</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={[styles.input, styles.textAreaSlim]}
                                value={feeding}
                                onChangeText={setFeeding}
                                placeholder="Tipo de ração, quantidade, frutas ou restrições..."
                                multiline
                                numberOfLines={2}
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.mainSaveButton, { backgroundColor: COLORS.PRIMARY }]}
                            onPress={handleSave}
                        >
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>Salvar Informações</Text>
                            </View>
                        </TouchableOpacity>

                        {editPet && (
                            <TouchableOpacity style={styles.deleteButton}>
                                <Ionicons name="trash-outline" size={20} color={COLORS.PRIMARY} />
                                <Text style={styles.deleteText}>Remover Pet</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        marginBottom: 30,
    },
    backButton: {
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
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    saveBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    photoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#E8DEFF',
    },
    photoText: {
        fontSize: 12,
        color: COLORS.PRIMARY,
        marginTop: 5,
        fontWeight: 'bold',
    },
    form: {
        paddingHorizontal: 25,
        gap: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
        marginTop: 20,
        marginBottom: 5,
    },
    inputGroup: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3436',
        marginBottom: 8,
        marginLeft: 4,
    },
    subLabel: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
        marginBottom: 10,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 18,
        fontSize: 16,
        color: '#2D3436',
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    otherInput: {
        width: '100%',
        backgroundColor: COLORS.BG_LIGHT,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginTop: 10,
        fontSize: 14,
        color: COLORS.PRIMARY,
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    textAreaSlim: {
        height: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.BG_LIGHT,
        borderRadius: 15,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        gap: 6,
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.PRIMARY_LIGHT,
    },
    toggleBtnTextActive: {
        color: COLORS.PRIMARY,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    chip: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8DEFF',
    },
    chipActive: {
        backgroundColor: COLORS.BG_LIGHT,
        borderColor: COLORS.PRIMARY,
    },
    chipText: {
        fontSize: 13,
        color: COLORS.PRIMARY_LIGHT,
        fontWeight: '600',
    },
    chipTextActive: {
        color: COLORS.PRIMARY,
    },
    mainSaveButton: {
        marginTop: 30,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonContent: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
        gap: 8,
    },
    deleteText: {
        color: COLORS.ERROR,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    uploadCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#E8DEFF',
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    uploadPlaceholder: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    uploadIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.BG_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploadText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.PRIMARY,
        marginBottom: 4,
    },
    uploadSubtext: {
        fontSize: 12,
        color: COLORS.TEXT_MUTED,
    },
    uploadedFile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.BG_LIGHT,
        padding: 15,
        borderRadius: 12,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    uploadedFileName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2D3436',
    },
});
