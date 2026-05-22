FROM dockerhub.test.wacai.info/xianglong/shield-cache:1.0
WORKDIR /app/program/shield
COPY . .
RUN npm install
RUN npx playwright install --with-deps chromium
RUN npm run build
CMD ["npm","run","start"]
