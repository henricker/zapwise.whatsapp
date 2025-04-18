# 🤖 Zapwise WhatsApp Gateway

Este repositório é o **núcleo de integração com o WhatsApp** no ecossistema Zapwise. Ele é responsável por conectar **múltiplas contas de WhatsApp Business** dos clientes ao sistema, garantindo que todas as mensagens enviadas e recebidas sejam capturadas em tempo real e notificadas via webhook para o backend do Zapwise.

> Sem ele, não há Zapwise. Este serviço dá vida ao produto, pois é pelo WhatsApp que tudo acontece.

---

## 📌 O que ele faz

- Mantém **múltiplas sessões ativas** simultaneamente (uma por cliente)
- Permite que o `zapwise.app` se conecte via **WebSocket** para iniciar uma sessão
- Gera o **QR Code em tempo real** para o cliente parear com o WhatsApp
- Após pareamento, escuta todas as mensagens enviadas/recebidas
- Envia **webhooks HTTP** para o sistema do Zapwise com os dados das mensagens

---

## 🔄 Fluxo de funcionamento

1. O `zapwise.app` inicia uma conexão via **WebSocket**
2. A API responde com um QR Code para pareamento
3. Após leitura do QR Code pelo cliente, emitimos um evento de sucesso (`connected`)
4. O `zapwise.app` informa o **webhook de destino** (onde deseja receber as mensagens)
5. A partir desse momento:
   - A sessão fica ativa
   - Todas as mensagens são escutadas
   - Webhooks são disparados via HTTP

---

## 📤 Exemplo de Webhook disparado

```json
{
  "event": "new_message",
  "data": {
    "phone": "+5511999999999",
    "my_phone": "+5511988888888",
    "message": {
      "id": "ABCDEF123456",
      "type": "text",
      "value": "Oi, ainda tem disponível?",
      "timestamp": 1713000000
    },
    "contact": {
      "photo": "https://avatar.url",
      "name": "João da Silva"
    },
    "from_me": false
  }
}
```

---

## ⚙️ Tecnologias utilizadas

- Node.js
- TypeScript
- [Baileys (WhiskeySockets)](https://github.com/WhiskeySockets/Baileys)
- WebSocket (via `ws`)
- Axios (HTTP client)
- Dotenv
- PM2 (ou Docker) para manter o processo vivo

---

## 📂 Estrutura básica do projeto

```
zapwise-whatsapp/
├── src/
│   ├── ws/                 # Gerenciamento de conexões WebSocket
│   ├── sessions/           # Controle de sessões WhatsApp ativas
│   ├── handlers/           # Tratadores de mensagens recebidas
│   └── utils/              # Utilitários gerais
├── .env
└── index.ts                # Entry point do servidor
```

---

## 🧪 Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Configure o `.env`:

```env
PORT=3001
SESSION_PATH=./sessions
```

3. Inicie o servidor:

```bash
npm run dev
```

4. No frontend (`zapwise.app`), conecte-se via WebSocket:

```ts
const socket = new WebSocket('ws://localhost:3001');
```

5. Escute o evento de QR code → exiba para o usuário parear

6. Após pareamento, envie o webhook de destino:

```json
{
  "type": "register_webhook",
  "webhook": "https://zapwise.app/api/webhook"
}
```

---

## 🔐 Segurança

- O webhook é registrado por sessão e validado por origem
- Recomenda-se que o backend Zapwise valide a autenticidade do `my_phone`
- A comunicação entre zapwise.app ↔ zapwise.whatsapp é protegida por canal WebSocket isolado

---

## 🛠️ Deploy sugerido

- Ambiente: **Magalu Cloud** (1vCPU, 1GB RAM)
- Gerenciador: **PM2** (`pm2 start index.ts --name zapwise-wa`)
- Persistência de sessões: sistema de arquivos local (`SESSION_PATH`) ou Redis (futuro)

---

## 🧩 Integração com o Zapwise

Este serviço trabalha em conjunto com:

- `zapwise.app`: inicia sessões via WebSocket, recebe webhooks, exibe mensagens
- `zapwise-worker`: analisa conversas com IA após recepção

---

## 📦 Futuro

- Suporte a reconexão automática em caso de erro de sessão
- Migração para sessão persistida em Redis
- Autenticação via JWT no handshake do WebSocket
- Suporte a múltiplos webhooks por cliente (ex: para logs + produção)

---

Feito com ☕ por Henrique • Zapwise