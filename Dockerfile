FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
COPY server ./server
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8080
CMD ["npm", "start"]
