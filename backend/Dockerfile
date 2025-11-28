# ใช้ Node.js เวอร์ชั่นเล็กจิ๋ว (Alpine) เพื่อประหยัดพื้นที่
FROM node:20-alpine

# ติดตั้ง OpenSSL (จำเป็นสำหรับการทำงานของ Prisma บน Linux Alpine)
RUN apk add --no-cache openssl

# กำหนดโฟลเดอร์ทำงานใน Container
WORKDIR /app

# Copy ไฟล์ Package เพื่อ Install Dependencies ก่อน (ช่วยให้ Build เร็วขึ้นในครั้งถัดไป)
COPY package*.json ./
RUN npm install

# Copy โค้ดทั้งหมดเข้า Container
COPY . .

# สร้าง Prisma Client (เพื่อให้รู้จัก Schema ของเรา)
RUN npx prisma generate

# เปิด Port 3001
EXPOSE 3001

# คำสั่งรัน Server
CMD ["npm", "run", "dev"]