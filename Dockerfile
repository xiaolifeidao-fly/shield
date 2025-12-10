FROM dockerhub.test.wacai.info/xianglong/shield-cache:1.0
WORKDIR /app/program/shield
COPY . .
RUN npm install
RUN npm run build
CMD ["npm","run","start"]