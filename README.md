# Coach 5S - Auditoria e Disciplina

Aplicativo de auditoria 5S com gamificação e feedback de IA, desenvolvido com Next.js e Firebase.

## 🚀 Como Iniciar

### 1. Configuração do Firebase
No [Firebase Console](https://console.firebase.google.com/):
- Ative **Authentication** (E-mail/Senha).
- Crie um banco **Cloud Firestore**.

### 2. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz com as chaves do seu projeto:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_chave
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
GEMINI_API_KEY=sua_chave_gemini
```

### 3. Execução Local
```bash
npm install
npm run dev
```

### 4. Deploy de Regras e Índices
```bash
npm run deploy:rules
```

## 🔐 Segurança
As regras do Firestore garantem que cada auditor só possa ver e criar suas próprias auditorias.

---
*A bagunça de hoje é o prejuízo de amanhã.*