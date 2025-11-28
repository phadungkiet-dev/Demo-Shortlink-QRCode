# --- Build (ใช้ Node.js สร้างไฟล์ Dist) ---
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy dependencies และ install
COPY package*.json ./
RUN npm install

# Copy source code และสั่ง Build
COPY . .
RUN npm run build

# --- Serve (ใช้ Nginx เสิร์ฟไฟล์) ---
FROM nginx:stable-alpine as production-stage

# Copy ไฟล์ที่ Build เสร็จแล้วจาก Stage 1 มาใส่ Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy ไฟล์ Config Nginx (เดี๋ยวเราจะสร้างไฟล์นี้กัน)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]