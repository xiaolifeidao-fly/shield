FROM dockerhub.test.wacai.info/xianglong/shield-cache:1.0


ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone



WORKDIR /app/program/shield
COPY . .
RUN npm install
RUN npm run build
CMD ["npm","run","start"]
