# 🐾 Petoo - App de Gestão Pet

Um aplicativo React Native elegante e moderno para gestão de serviços pet, incluindo **Hotel Pet** e **Banho & Tosa**.

## ✨ Características

### 🏨 Hotel Pet
- Design pastel chique com tons de marrom, branco e bege
- Interface elegante com sombras suaves
- Cards de serviços interativos
- Informações sobre hospedagem, alimentação, recreação e assistência veterinária
- Botões de ação para reservas e contato

### 🛁 Banho & Tosa
- Em desenvolvimento

## 🎨 Design

O app foi desenvolvido com foco em:
- **Fofura e Chiqueza**: Design premium com tons pastéis
- **Sombras Elegantes**: Cards com sombras suaves para profundidade
- **Gradientes Suaves**: Backgrounds com gradientes harmoniosos
- **Interatividade**: Efeitos hover e transições suaves
- **Ícones Modernos**: Uso de Ionicons para uma interface limpa

## 🚀 Como Executar

### Pré-requisitos
- Node.js instalado
- Expo Go app no seu celular (disponível na App Store/Play Store)

### Instalação

1. As dependências já foram instaladas, mas se precisar reinstalar:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npx expo start
```

3. Escaneie o QR code com:
   - **iOS**: Câmera do iPhone
   - **Android**: App Expo Go

## 📱 Navegação

- **Tela Inicial**: Escolha entre Hotel Pet ou Banho & Tosa
- **Hotel Pet**: Visualize serviços, faça reservas e entre em contato
- **Banho & Tosa**: Em desenvolvimento

## 🎨 Paleta de Cores

### Hotel Pet
- Primária: `#8B6F47` (Marrom)
- Secundária: `#A0826D` (Marrom claro)
- Background: Gradiente de `#F5EBE0` → `#E3D5CA` → `#D6CCC2`
- Cards: `#FFFFFF` com sombras suaves

### Banho & Tosa
- Primária: `#5A8FA8` (Azul)
- Background: Gradiente de `#E8F4F8` → `#D4E9F0` → `#C0DEE8`

## 📂 Estrutura do Projeto

```
petoo-app/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js          # Tela inicial
│   │   ├── HotelPetScreen.js      # Tela do Hotel Pet
│   │   └── BanhoTosaScreen.js     # Tela do Banho & Tosa
│   ├── navigation/
│   │   └── AppNavigator.js        # Configuração de rotas
│   └── components/                # Componentes reutilizáveis (futuro)
├── assets/
│   ├── hotel-pet-logo.png
│   └── banho-tosa-logo.png
└── App.js                         # Arquivo principal
```

## 🔮 Próximos Passos

- [ ] Implementar tela de Banho & Tosa
- [ ] Adicionar sistema de reservas
- [ ] Criar formulários de agendamento
- [ ] Integrar com backend
- [ ] Adicionar autenticação de usuários
- [ ] Sistema de notificações
- [ ] Galeria de fotos dos pets

## 🛠️ Tecnologias

- **React Native** - Framework mobile
- **Expo** - Plataforma de desenvolvimento
- **React Navigation** - Navegação entre telas
- **Expo Linear Gradient** - Gradientes suaves
- **Ionicons** - Biblioteca de ícones

---

Desenvolvido com 💙 e 🐾 para pets felizes!
