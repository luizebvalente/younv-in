# Younv Clinical CRM - Versão Firebase

Sistema de CRM para clínicas médicas com integração Firebase para persistência de dados, autenticação e sincronização em tempo real.

## 🚀 Funcionalidades

### Autenticação
- Login/logout seguro
- Criação de contas
- Recuperação de senha
- Sessões persistentes

### Gestão de Dados
- **Médicos**: Cadastro completo com especialidades
- **Especialidades**: Categorização de serviços
- **Procedimentos**: Valores e durações
- **Leads**: Gestão completa do funil de vendas

### Relatórios
- Taxa de conversão
- Leads por canal
- Performance por médico
- Métricas em tempo real

## 🛠️ Tecnologias

- **Frontend**: React 18 + Vite
- **UI**: Tailwind CSS + Radix UI
- **Backend**: Firebase Firestore
- **Autenticação**: Firebase Auth
- **Ícones**: Lucide React
- **Gráficos**: Recharts

## 📦 Instalação

```bash
# Clonar repositório
git clone [url-do-repositorio]
cd younv-clinical-crm-firebase

# Instalar dependências
npm install

# Configurar Firebase (ver seção abaixo)
# Editar src/services/firebase/config.js

# Executar em desenvolvimento
npm run dev
```

## ⚙️ Configuração Firebase

### 1. Criar Projeto
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie novo projeto
3. Ative Firestore Database
4. Configure Authentication (Email/senha)

### 2. Configurar Credenciais
Edite `src/services/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "sua-app-id"
}
```

### 3. Ativar Firebase
Em `src/services/firebaseDataService.js`:

```javascript
constructor() {
  this.useFirebase = true // Alterar para true
  this.initializeData()
}
```

## 🔄 Migração de Dados

Para migrar dados do localStorage para Firebase:

```javascript
// No console do navegador
await firebaseDataService.migrateFromLocalStorage()
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── layout/          # Header, Sidebar
│   ├── pages/           # Páginas principais
│   └── ui/              # Componentes UI
├── contexts/            # React Contexts
├── hooks/               # Hooks personalizados
├── lib/                 # Utilitários
└── services/
    ├── firebase/        # Configuração Firebase
    ├── dataService.js   # Serviço original
    └── firebaseDataService.js # Novo serviço
```

## 🔐 Segurança

### Regras Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📱 Uso

### Primeiro Acesso
1. Acesse a aplicação
2. Clique em "Cadastre-se"
3. Crie sua conta
4. Faça login

### Funcionalidades Principais
- **Dashboard**: Visão geral das métricas
- **Médicos**: Gestão do corpo clínico
- **Especialidades**: Categorias de atendimento
- **Procedimentos**: Serviços oferecidos
- **Leads**: Gestão de pacientes potenciais
- **Relatórios**: Análises e métricas

## 🚀 Deploy

### Build
```bash
npm run build
```

### Plataformas Suportadas
- Vercel
- Netlify
- Firebase Hosting
- Qualquer servidor estático

## 📊 Monitoramento

### Firebase Console
- Métricas de uso
- Logs de erro
- Performance
- Usuários ativos

### Desenvolvimento
```bash
# Modo desenvolvimento
npm run dev

# Lint
npm run lint

# Preview build
npm run preview
```

## 🔧 Configurações Avançadas

### Emuladores Firebase (Desenvolvimento)
```javascript
// Em config.js
const USE_EMULATOR = true
```

### Fallback localStorage
O sistema mantém compatibilidade com localStorage como fallback automático.

## 📝 Licença

Propriedade da Younv Consultoria. Todos os direitos reservados.

## 🆘 Suporte

Para suporte técnico:
1. Consulte a documentação completa
2. Verifique logs no Firebase Console
3. Use DevTools para debug

## 🔄 Atualizações

### Versão 2.0.0 (Firebase)
- ✅ Integração Firebase completa
- ✅ Sistema de autenticação
- ✅ Sincronização em tempo real
- ✅ Backup automático
- ✅ Suporte multi-usuário

### Próximas Versões
- Notificações push
- Relatórios avançados
- Integração WhatsApp
- App mobile

