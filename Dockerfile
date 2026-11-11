# Multi-stage Dockerfile para o SIGCOI
# Permite rodar a aplicação em servidores universitários locais (On-Premise) ou em nuvem Docker

FROM node:22-alpine AS builder

WORKDIR /app

# Instalação das dependências
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps

# Cópia do código fonte e build da aplicação Vite
COPY . .
RUN npm run build

# Estágio de Produção / Execução
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm install -g tsx

# Copia os artefatos compilados e arquivos necessários para execução
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
