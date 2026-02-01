# 📱 Petoo App

App mobile do Petoo desenvolvido em **React Native** com **Expo**.

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- [Expo Go](https://expo.dev/client) no seu dispositivo

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npx expo start
```

### Conectar ao Backend

1. Certifique-se que o backend está rodando (`docker compose up -d` na raiz)
2. Atualize o IP em `src/services/api.js`:

```javascript
const BASE_URL = 'http://SEU_IP:3000/api/v1';
```

> 💡 Use o IP da sua máquina na rede local (ex: `192.168.1.100`)

## 📂 Estrutura

```
src/
├── components/     # Componentes reutilizáveis
├── constants/      # Cores e constantes
├── context/        # Auth & Theme contexts
├── navigation/     # React Navigation config
├── screens/        # Telas do app
│   ├── auth/       # Login, Registro, OTP
│   └── *.js        # Home, Profile, etc
└── services/       # API client
```

## 🎨 Telas Principais

| Tela | Descrição |
|------|-----------|
| **AuthSelect** | Seleção de tipo de acesso |
| **Login** | Login via OTP (SMS) |
| **Home** | Tela principal com serviços |
| **HotelPet** | Listagem de hotéis |
| **HotelPetBooking** | Reserva de hospedagem |
| **MyPets** | Gestão de pets |
| **Profile** | Perfil do usuário |

## 🛠️ Scripts

```bash
npm start        # Inicia Expo
npm run android  # Build Android
npm run ios      # Build iOS
npm run web      # Inicia versão web
```

## 📦 Dependências Principais

- `expo` - Plataforma de desenvolvimento
- `react-navigation` - Navegação
- `expo-linear-gradient` - Gradientes
- `@expo/vector-icons` - Ícones
- `@react-native-async-storage` - Storage local

---

Veja o [README principal](../README.md) para mais informações sobre o projeto completo.
