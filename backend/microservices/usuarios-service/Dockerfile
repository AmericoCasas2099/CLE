FROM node:22-bookworm-slim

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código y certificado RDS
COPY src ./src
COPY certificates ./certificates

# Configuración
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Ejecutar sin privilegios de root
USER node

CMD ["node", "src/server.js"]