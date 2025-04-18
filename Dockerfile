# Use a imagem base do Node.js 18 com Alpine
FROM node:23-alpine

# Defina o diretório de trabalho no contêiner
WORKDIR /app

# Copie o package.json e o package-lock.json (se existir)
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante do código da aplicação
COPY . .

# Compile o projeto TypeScript para JavaScript (assumindo que você esteja usando TypeScript)
RUN npm run build

# Exponha a porta que sua aplicação irá rodar (ajuste se necessário)
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["npm", "run", "start:prod"]
