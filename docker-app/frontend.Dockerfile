# --- Stage 1: Build Stage ---
FROM node:20-alpine as build-stage

WORKDIR /app

# รับค่า Argument
ARG VITE_API_TARGET
ARG VITE_SHORT_LINK_PREFIX

# ตั้งค่า Environment Variable ให้ Vite เอาไปใช้
ENV VITE_API_TARGET=$VITE_API_TARGET
ENV VITE_SHORT_LINK_PREFIX=$VITE_SHORT_LINK_PREFIX

# COPY ใช้ path ปกติ เพราะ context คือ ../frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Production Stage ---
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

# หมายเหตุ: เราลบคำสั่ง COPY nginx.conf ออก 
# เพราะเราจะ Mount ไฟล์จาก docker-app เข้าไปแทนใน docker-compose

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]