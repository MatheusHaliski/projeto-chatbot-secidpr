# DECIA — Decisão Coletiva com Inteligência Artificial

Sistema que permite grupos de trabalho no Telegram discutirem um tópico livremente e receberem uma decisão coletiva gerada por IA (Claude API), com artefatos no formato adequado ao tipo de problema.

Desenvolvido para uso interno da **SEIA — Secretaria da Inovação e Inteligência Artificial do Governo do Paraná**.

---

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Telegram   │────▶│  Bot Python  │────▶│   API Fastify   │
│   Groups    │     │  (apps/bot)  │     │   (apps/api)    │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌─────────────────────────────┤
                    ▼                             ▼
             ┌─────────────┐            ┌────────────────┐
             │  Firestore  │            │  Anthropic     │
             │  (Firebase) │            │  Claude API    │
             └─────────────┘            └────────────────┘
                    ▲
                    │
             ┌──────┴──────┐
             │  Web Panel  │
             │  (apps/web) │
             └─────────────┘
```

### Stack

| Camada    | Tecnologia                                        |
|-----------|---------------------------------------------------|
| Frontend  | Next.js 14 (App Router) + TypeScript + Tailwind   |
| Backend   | Node.js + Fastify + TypeScript                    |
| Banco     | Firebase Firestore + Firebase Auth                |
| Bot       | python-telegram-bot 22.x (Python 3.12)            |
| IA        | Anthropic Claude API (claude-sonnet-4-20250514)   |
| Deploy    | Vercel (frontend) + Railway (backend + bot)       |

---

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker + Docker Compose
- Firebase CLI (`npm install -g firebase-tools`)
- Conta no [Firebase Console](https://console.firebase.google.com)
- API Key da [Anthropic](https://console.anthropic.com)
- Bot Telegram criado via [@BotFather](https://t.me/BotFather)

---

## Setup Local — Passo a Passo

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-org/decia.git
cd decia
pnpm install
```

### 2. Configurar Firebase

```bash
# Autenticar no Firebase
firebase login

# Criar projeto (ou use um existente)
firebase projects:create decia-prod

# Habilitar Firestore e Auth no console:
# https://console.firebase.google.com
# → Firestore Database → Create database (production mode)
# → Authentication → Sign-in method → Enable Google + Email/Password
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha todas as variáveis:

```env
# Firebase Admin SDK (obtenha em: Configurações do projeto → Contas de serviço → Gerar nova chave privada)
FIREBASE_PROJECT_ID=decia-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@decia-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK (obtenha em: Configurações do projeto → Seus aplicativos → Web)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=decia-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=decia-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=decia-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# Anthropic (obtenha em: https://console.anthropic.com/settings/keys)
ANTHROPIC_API_KEY=sk-ant-...

# Telegram (obtenha via @BotFather no Telegram)
TELEGRAM_BOT_TOKEN=123456789:AAF...

# API
API_BASE_URL=http://localhost:3001
JWT_SECRET=gere-uma-string-aleatoria-de-pelo-menos-32-chars
API_TOKEN_SALT=gere-outra-string-aleatoria-de-16-chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Para gerar JWT_SECRET e API_TOKEN_SALT:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 4. Fazer deploy das regras do Firestore

```bash
# Para produção
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Subir o ambiente com Docker Compose

```bash
docker-compose up --build
```

Serviços disponíveis:
- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **Firebase Emulator UI**: http://localhost:4000

### 6. Criar o primeiro admin

Após fazer login no painel web com sua conta Google:

```bash
# Via script Node.js (substitua SEU_UID_AQUI pelo UID do Firebase Auth)
node -e "
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
admin.auth().setCustomUserClaims('SEU_UID_AQUI', { role: 'admin' }).then(() => {
  console.log('Admin role set!');
  process.exit(0);
});
"
```

### 7. Criar workspace e gerar API Token

1. Acesse http://localhost:3000/dashboard
2. Crie um novo workspace com o Chat ID do seu grupo Telegram
3. Em Configurações → API Token → clique em "Regenerar token"
4. Copie o token gerado

Para obter o Chat ID do grupo:
- Adicione o bot [@userinfobot](https://t.me/userinfobot) ao grupo
- Ou use: `https://api.telegram.org/bot{TOKEN}/getUpdates`

### 8. Configurar o bot com o token

```bash
# apps/bot/.env
TELEGRAM_BOT_TOKEN=seu-bot-token
API_BASE_URL=http://localhost:3001
WORKSPACE_API_TOKEN=token-gerado-no-painel
```

### 9. Testar no Telegram

Adicione o bot ao grupo Telegram e teste:

```
/decidir Qual linguagem usar no novo projeto?
```

Cada membro do grupo pode enviar opiniões livremente. Quando houver pelo menos 2:

```
/analisar
```

---

## Estrutura de Pastas

```
decia/
├── apps/
│   ├── web/                 # Next.js 14 — painel admin + landing page
│   │   ├── app/             # App Router (public + dashboard)
│   │   ├── components/      # UI components (landing, sessions, dashboard)
│   │   ├── hooks/           # useAuth, useSessions, useWorkspace
│   │   └── lib/             # Firebase client, API client, Auth helpers
│   ├── api/                 # Fastify — backend REST + webhook
│   │   └── src/
│   │       ├── config/      # Firebase Admin + env validation (Zod)
│   │       ├── plugins/     # CORS, Helmet, JWT, Rate Limit
│   │       ├── routes/      # auth, workspaces, sessions, bot-webhook, admin
│   │       ├── services/    # Claude, Decision, Token, Audit, Artifact
│   │       └── middleware/  # requireAuth, requireToken, requireRole
│   └── bot/                 # Python — bot Telegram
│       └── src/
│           ├── handlers/    # commands.py, messages.py, errors.py
│           ├── services/    # api_client.py, session_cache.py
│           └── utils/       # messages.py (templates), validators.py
├── packages/
│   ├── shared-types/        # Tipos TypeScript compartilhados
│   └── firebase-config/     # Config Firebase cliente compartilhada
├── .env.example
├── docker-compose.yml
├── firebase.json
├── firestore.rules
└── turbo.json
```

---

## Fluxo de Autenticação

```
┌──────────┐     Firebase ID Token     ┌──────────┐     JWT interno     ┌──────────┐
│  Web App │ ─────────────────────────▶│   API    │ ──────────────────▶│  Cookie  │
│ (Google) │ ◀─────────────────────────│ /auth/   │                    │ httpOnly │
└──────────┘     JWT (1h) + Refresh    └──────────┘                    └──────────┘

┌──────────┐     Bearer {API Token}    ┌──────────┐
│  Bot Py  │ ─────────────────────────▶│   API    │
│ Telegram │ ◀─────────────────────────│ /webhook │
└──────────┘     JSON response         └──────────┘
```

### 3 Níveis de Autenticação

| Nível | Usado por | Mecanismo | Expira |
|-------|-----------|-----------|--------|
| Firebase Auth | Usuários web | Google OAuth / Email-Senha | — |
| JWT interno | Painel web ↔ API | HS256 com JWT_SECRET | 1h (refresh 7d) |
| API Token | Bot ↔ API | SHA-256 HMAC com salt | Manual (revogável) |

---

## Proxy Corporativo

Se sua rede usa proxy HTTPS:

```env
# .env do bot
HTTPS_PROXY=http://proxy.empresa.gov.br:8080
HTTP_PROXY=http://proxy.empresa.gov.br:8080
```

```bash
# Para o Docker
docker-compose run --env HTTPS_PROXY=http://proxy:8080 bot
```

---

## Deploy em Produção

### Frontend — Vercel

```bash
# Instale a CLI Vercel
npm i -g vercel

# Deploy
cd apps/web
vercel --prod

# Configure as variáveis de ambiente no dashboard Vercel:
# https://vercel.com/seu-org/decia-web/settings/environment-variables
```

### Backend + Bot — Railway

1. Crie um novo projeto em https://railway.app
2. Adicione dois serviços: `api` e `bot`
3. Configure as variáveis de ambiente no dashboard Railway
4. Conecte o repositório GitHub — Railway detecta o Dockerfile automaticamente

Variáveis obrigatórias no Railway para o serviço `api`:
```
NODE_ENV=production
PORT=3001
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
ANTHROPIC_API_KEY=...
JWT_SECRET=...
API_TOKEN_SALT=...
CORS_ORIGINS=https://sua-app.vercel.app
```

---

## Troubleshooting

### Bot não responde aos comandos
1. Verifique se `TELEGRAM_BOT_TOKEN` está correto
2. Confirme que o bot foi adicionado ao grupo
3. Verifique os logs: `docker-compose logs bot`

### "Token inválido ou workspace não autorizado"
1. Regenere o token em Configurações → API Token
2. Atualize `WORKSPACE_API_TOKEN` no `.env` do bot
3. Reinicie o bot: `docker-compose restart bot`

### Erro de autenticação Firebase
1. Verifique se `FIREBASE_PRIVATE_KEY` contém `\n` literal (não quebras de linha reais)
2. No `.env`, use aspas duplas: `FIREBASE_PRIVATE_KEY="-----BEGIN..."`

### Claude API timeout
1. O timeout padrão é 35s com 2 tentativas
2. Verifique sua cota em https://console.anthropic.com
3. Considere reduzir o número máximo de opiniões por sessão

---

## Testes

```bash
# API (Jest)
cd apps/api
pnpm test

# Bot (pytest)
cd apps/bot
pip install -r requirements.txt
pytest

# Type checking completo (monorepo)
pnpm type-check
```

---

## Licença

Uso interno — SEIA / Governo do Estado do Paraná.
