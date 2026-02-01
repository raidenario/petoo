# 📱 Como Testar o App Petoo

## ✅ Status Atual
- ✅ Servidor rodando
- ✅ App configurado
- ✅ Pronto para testar!

## 🚀 Passo a Passo para Testar no Celular

### 1. Instale o Expo Go no seu celular

#### iPhone (iOS)
1. Abra a **App Store**
2. Procure por "**Expo Go**"
3. Instale o app

#### Android
1. Abra a **Play Store**
2. Procure por "**Expo Go**"
3. Instale o app

### 2. Conecte-se ao servidor

O servidor já está rodando! Você verá um **QR Code** no terminal.

#### iPhone
1. Abra o app **Câmera** nativo do iPhone
2. Aponte para o QR Code no terminal
3. Toque na notificação que aparecer
4. O app Expo Go abrirá automaticamente

#### Android
1. Abra o app **Expo Go**
2. Toque em "**Scan QR Code**"
3. Aponte para o QR Code no terminal
4. Aguarde o app carregar

### 3. Aguarde o carregamento

- O app levará alguns segundos para compilar
- Você verá uma barra de progresso
- Quando terminar, o app abrirá automaticamente!

## 🎯 O que você verá

### Tela Inicial
- Título "Petoo" com subtítulo
- Dois cards elegantes:
  - **Hotel Pet** (com logo)
  - **Banho & Tosa** (com logo)
- Fundo com gradiente pastel suave

### Ao clicar em "Hotel Pet"
- Tela completa do Hotel Pet
- Design pastel em tons de marrom e bege
- Cards de serviços (Suítes, Alimentação, Recreação, Veterinária)
- Botões "Fazer Reserva" e "Fale Conosco"
- Cards de informação (Horário e Localização)
- Botão de voltar no topo

### Ao clicar em "Banho & Tosa"
- Tela placeholder "Em desenvolvimento"
- Botão de voltar

## 🔧 Comandos Úteis

### Ver o QR Code novamente
Se você perdeu o QR Code, pressione:
- **`w`** no terminal para abrir no navegador
- **`r`** para recarregar o app
- **`c`** para limpar o console

### Parar o servidor
No terminal, pressione:
```
Ctrl + C
```

### Reiniciar o servidor
```bash
npx expo start
```

### Limpar cache e reiniciar
```bash
npx expo start -c
```

## ⚠️ Problemas Comuns

### "Não consigo ver o QR Code"
- Verifique se o terminal está maximizado
- Pressione `w` para abrir no navegador e ver o QR Code maior

### "O app não carrega"
1. Certifique-se de que o celular e o computador estão na **mesma rede Wi-Fi**
2. Tente limpar o cache: `npx expo start -c`
3. Reinicie o servidor: `Ctrl+C` e depois `npx expo start`

### "Erro ao escanear o QR Code"
- Verifique se instalou o **Expo Go** correto
- Tente usar a opção "Enter URL manually" no Expo Go
- Digite o endereço que aparece no terminal (ex: `exp://192.168.x.x:8081`)

### "O app está lento"
- Isso é normal na primeira vez
- Aguarde alguns minutos para o cache ser criado
- Nas próximas vezes será mais rápido

## 📱 Testando as Funcionalidades

### Navegação
1. ✅ Toque no card "Hotel Pet" → deve navegar para a tela do Hotel
2. ✅ Toque no botão de voltar (seta) → deve voltar para a tela inicial
3. ✅ Toque no card "Banho & Tosa" → deve mostrar a tela placeholder
4. ✅ Toque no botão de voltar → deve voltar para a tela inicial

### Interatividade
1. ✅ Os cards devem ter efeito visual ao tocar (opacidade)
2. ✅ Os botões devem responder ao toque
3. ✅ A tela do Hotel Pet deve ser scrollável (role para baixo)

### Design
1. ✅ Verifique se as cores estão pastéis e suaves
2. ✅ Verifique se os cards têm sombras elegantes
3. ✅ Verifique se os logos aparecem corretamente
4. ✅ Verifique se o gradiente de fundo está suave

## 🎨 Próximos Passos

Após testar, você pode:
1. Modificar cores em `src/screens/HotelPetScreen.js`
2. Adicionar novos serviços no array `services`
3. Implementar a tela de Banho & Tosa
4. Adicionar novas funcionalidades

## 💡 Dicas

- **Shake o celular** para abrir o menu de desenvolvimento
- Use **Ctrl+M** (Android) ou **Cmd+D** (iOS) para debug
- Qualquer alteração no código recarrega automaticamente (hot reload)
- Salve os arquivos e veja as mudanças em tempo real!

---

**Divirta-se testando o Petoo! 🐾✨**

Se tiver algum problema, verifique:
1. ✅ Servidor rodando
2. ✅ Mesma rede Wi-Fi
3. ✅ Expo Go instalado
4. ✅ QR Code escaneado corretamente
