# Plano de Migração para Firebase

## Visão Geral da Migração

A migração do localStorage para Firebase Firestore proporcionará:
- **Persistência real**: Dados armazenados na nuvem
- **Sincronização**: Acesso multi-dispositivo e multi-usuário
- **Escalabilidade**: Suporte a grandes volumes de dados
- **Segurança**: Autenticação e regras de acesso
- **Backup automático**: Dados seguros na nuvem Google

## Tecnologias Firebase Utilizadas

### 1. Firebase Firestore
- **Propósito**: Banco de dados NoSQL em tempo real
- **Vantagens**: Sincronização automática, queries poderosas, offline support
- **Estrutura**: Coleções e documentos (similar ao MongoDB)

### 2. Firebase Authentication
- **Propósito**: Sistema de autenticação
- **Métodos**: Email/senha, Google, etc.
- **Benefícios**: Controle de acesso seguro

### 3. Firebase Hosting (opcional)
- **Propósito**: Hospedagem da aplicação
- **Vantagens**: CDN global, SSL automático, integração com outros serviços

## Estrutura do Banco de Dados Firestore

### Coleções Principais

#### 1. `especialidades`
```javascript
// Documento: especialidades/{especialidadeId}
{
  nome: string,
  descricao: string,
  ativo: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 2. `medicos`
```javascript
// Documento: medicos/{medicoId}
{
  nome: string,
  crm: string,
  email: string,
  telefone: string,
  especialidadeId: string, // Referência para especialidades
  ativo: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 3. `procedimentos`
```javascript
// Documento: procedimentos/{procedimentoId}
{
  nome: string,
  valor: number,
  duracao: number,
  categoria: string,
  especialidadeId: string, // Referência para especialidades
  ativo: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 4. `leads`
```javascript
// Documento: leads/{leadId}
{
  dataRegistroContato: timestamp,
  nomePaciente: string,
  telefone: string,
  dataNascimento: string,
  email: string,
  canalContato: string,
  solicitacaoPaciente: string,
  medicoAgendadoId: string, // Referência para medicos
  especialidadeId: string, // Referência para especialidades
  procedimentoAgendadoId: string, // Referência para procedimentos
  agendado: boolean,
  motivoNaoAgendamento: string,
  outrosProfissionaisAgendados: boolean,
  quaisProfissionais: string,
  pagouReserva: boolean,
  tipoVisita: string,
  valorOrcado: number,
  orcamentoFechado: string,
  followUps: [
    {
      numero: number,
      texto: string,
      data: timestamp
    }
  ],
  observacaoGeral: string,
  perfilComportamentalDisc: string,
  status: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Índices Necessários
```javascript
// Para otimizar queries frequentes
especialidades: ['ativo']
medicos: ['ativo', 'especialidadeId']
procedimentos: ['ativo', 'especialidadeId']
leads: ['status', 'dataRegistroContato', 'medicoAgendadoId', 'canalContato']
```

## Regras de Segurança Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita apenas para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas podem ser adicionadas posteriormente
    // Por exemplo, diferentes níveis de acesso por tipo de usuário
  }
}
```

## Estratégia de Migração

### Fase 1: Configuração do Firebase
1. Criar projeto no Firebase Console
2. Configurar Firestore Database
3. Configurar Authentication
4. Instalar dependências no projeto React

### Fase 2: Implementação do Serviço Firebase
1. Criar configuração do Firebase
2. Implementar novo serviço de dados
3. Manter compatibilidade com interface atual

### Fase 3: Migração Gradual
1. Implementar autenticação básica
2. Migrar uma entidade por vez (começar com especialidades)
3. Testar cada migração antes de prosseguir
4. Manter fallback para localStorage durante transição

### Fase 4: Funcionalidades Avançadas
1. Implementar sincronização em tempo real
2. Adicionar suporte offline
3. Implementar cache inteligente
4. Otimizar queries e performance

## Dependências a Adicionar

```json
{
  "dependencies": {
    "firebase": "^10.7.1",
    "@firebase/firestore": "^4.4.0",
    "@firebase/auth": "^1.5.1"
  }
}
```

## Estrutura de Arquivos Proposta

```
src/
├── services/
│   ├── firebase/
│   │   ├── config.js          // Configuração do Firebase
│   │   ├── auth.js             // Serviços de autenticação
│   │   ├── firestore.js        // Serviços do Firestore
│   │   └── index.js            // Exports centralizados
│   ├── dataService.js          // Serviço atual (manter temporariamente)
│   └── firebaseDataService.js  // Novo serviço Firebase
├── hooks/
│   ├── useAuth.js              // Hook para autenticação
│   ├── useFirestore.js         // Hook para Firestore
│   └── useRealtime.js          // Hook para dados em tempo real
├── contexts/
│   └── AuthContext.js          // Context para autenticação
└── utils/
    ├── dataTransform.js        // Transformação de dados
    └── migration.js            // Utilitários de migração
```

## Benefícios da Migração

### 1. Persistência Real
- Dados salvos permanentemente na nuvem
- Sem risco de perda por limpeza de cache
- Backup automático

### 2. Colaboração
- Múltiplos usuários podem acessar simultaneamente
- Sincronização em tempo real
- Controle de acesso por usuário

### 3. Performance
- Queries otimizadas
- Cache inteligente
- Suporte offline

### 4. Escalabilidade
- Suporte a milhões de documentos
- Performance consistente com crescimento
- Infraestrutura gerenciada pelo Google

### 5. Segurança
- Autenticação robusta
- Regras de segurança granulares
- Criptografia automática

## Cronograma Estimado

- **Semana 1**: Configuração Firebase + Implementação básica
- **Semana 2**: Migração de entidades + Testes
- **Semana 3**: Autenticação + Funcionalidades avançadas
- **Semana 4**: Testes finais + Deploy

## Considerações Importantes

### 1. Custos
- Firebase tem plano gratuito generoso
- Custos baseados em uso (reads/writes/storage)
- Para uma clínica pequena/média, provavelmente ficará no plano gratuito

### 2. Offline Support
- Firestore oferece suporte offline nativo
- Dados ficam disponíveis mesmo sem internet
- Sincronização automática quando conectar

### 3. Migração de Dados Existentes
- Criar script para migrar dados do localStorage
- Permitir export/import de dados
- Manter backup dos dados atuais

### 4. Treinamento
- Interface permanece igual
- Usuários não precisam aprender nada novo
- Apenas ganham funcionalidades extras

