# Recompra Farma

Sistema de gestão de recompra para farmácia com lembretes automáticos via WhatsApp.
Single-tenant. Stack: NestJS + Postgres + Prisma + Redis + Evolution API + React/Vite.

## Status

| Etapa | Escopo                                                   | Status |
| ----- | -------------------------------------------------------- | ------ |
| 1     | Scaffold monorepo + docker-compose + schema/migrations   | ✅      |
| 2     | Core backend: auth, cliente, compra, cálculo, templates  | ⬜      |
| 3     | Scheduler + envio via Evolution (sessão/QR)              | ⬜      |
| 4     | Frontend: dashboard, tabelas, tema claro/escuro          | ⬜      |
| 5     | Relatórios + export Excel/PDF                            | ⬜      |
| 6     | PWA, notificações, polish                                | ⬜      |

## Estrutura

```
recompra-farma/
├── docker-compose.yml        # stack completa
├── .env.example              # variáveis (copie p/ .env)
├── apps/
│   ├── backend/              # NestJS + Prisma
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   └── frontend/             # React + Vite + Tailwind (skeleton; UI na Etapa 4)
├── scripts/
│   ├── init.sh               # sobe tudo + seed
│   ├── backup.sh             # dump dos 2 bancos + volume do whats
│   ├── restore.sh
│   └── postgres-init/        # cria o banco da Evolution
└── docs/CALCULO.md           # regra de cálculo do término
```

## Como rodar (produção / VPS)

```bash
cp .env.example .env      # ajuste senhas, JWT_SECRET, EVOLUTION_API_KEY
./scripts/init.sh
```

Aponte o Cloudflare Tunnel para o serviço `frontend` (porta `FRONTEND_PORT`, default 8090).
O nginx do frontend já faz proxy de `/api` para o backend.

## Desenvolvimento local (backend)

```bash
cd apps/backend
npm install
cp .env.example .env       # DATABASE_URL apontando p/ seu postgres local
npx prisma migrate dev     # cria as migrations + aplica
npm run db:seed            # admin + templates padrão
npm run start:dev
```

API em `http://localhost:3000/api` · Swagger em `/api/docs` · health em `/api/health`.

## Arquitetura de dados

Ver `apps/backend/prisma/schema.prisma`. Resumo:

- **User** — atendentes/admin (auth)
- **Customer** — cliente (telefone único, normalizado E.164)
- **Purchase** — compra/tratamento (calcula `estimatedEndDate`)
- **ReminderConfig** — 1:1 com a compra; regras por cadastro (antecedência, último dia, horário)
- **ScheduledReminder** — lembrete materializado que o scheduler varre
- **MessageTemplate** — templates editáveis com variáveis `{{...}}`
- **MessageLog** — histórico de mensagens (enviadas/falhas/pendentes)
- **WhatsappSession** — estado da conexão Evolution
- **AuditLog** — histórico de alterações

## Infra

- Postgres compartilhado com 2 bancos: `recompra_farma` e `evolution`
- Redis compartilhado: app no db 0, Evolution no db 1
- Evolution API dedicada (instância própria deste projeto), exposta só no localhost p/ o QR
