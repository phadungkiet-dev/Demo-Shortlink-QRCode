const fs = require("fs/promises");
const path = require("path");
const { STORAGE } = require("../config/constants");

// ตรวจสอบและสร้างโฟลเดอร์ปลายทาง (เก็บใน storage/logos ตาม config)
const LOGO_DIR = path.join(__dirname, "../../", STORAGE.LOCAL_PATH);

const ensureDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Save Base64 Image to Storage
 * @param {string} slug - ชื่อ slug ของลิงก์ (ใช้ตั้งชื่อไฟล์)
 * @param {string} base64String - ข้อมูลรูปภาพแบบ Base64
 * @returns {Promise<string|null>} - URL path ของรูปภาพที่เข้าถึงได้
 */
const saveImage = async (slug, base64String) => {
  if (!base64String || !base64String.startsWith("data:image")) return null;

  const slugDir = path.join(LOGO_DIR, slug);
  await ensureDir(slugDir);

  // แยกนามสกุลไฟล์และข้อมูลภาพ
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const mimeType = matches[1];
  const data = matches[2];

  // Security Check: อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/svg+xml",
  ];

  if (!allowedMimeTypes.includes(mimeType)) {
    console.warn(`Blocked attempt to upload non-image mime type: ${mimeType}`);
    return null;
  }

  const extension = mimeType.split("/")[1].replace("+xml", "");
  const imageBuffer = Buffer.from(data, "base64");

  // ตั้งชื่อไฟล์: slug-timestamp.ext (ป้องกัน Cache และชื่อซ้ำ)
  const filename = `${Date.now()}.${extension}`;
  const filePath = path.join(slugDir, filename);

  // บันทึกลง Disk (จุดนี้แหละที่อนาคตเปลี่ยนเป็น upload ขึ้น Cloud ได้)
  await fs.writeFile(filePath, imageBuffer);

  // คืนค่า URL สำหรับให้ Frontend เรียกใช้
  return `${process.env.BASE_URL}/uploads/logos/${slug}/${filename}`;
};

/**
 * Delete Image (เผื่อใช้ตอนลบลิงก์ - Optional)
 */
const deleteImage = async (relativePath) => {
  if (!relativePath) return;

  // Security: ห้ามมี ".." เพื่อป้องกันการลบไฟล์นอกโฟลเดอร์
  if (relativePath.includes("..")) {
    console.warn(`Invalid path for deletion: ${relativePath}`);
    return;
  }

  try {
    const filePath = path.join(LOGO_DIR, relativePath);

    // ลบไฟล์
    await fs.unlink(filePath);

    // [Optional] ลองลบโฟลเดอร์ Slug ทิ้งด้วยถ้ามันว่างเปล่าแล้ว (Cleanup)
    const dirPath = path.dirname(filePath);
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
        await fs.rmdir(dirPath);
    }
  } catch (err) {
    // ไฟล์อาจจะไม่มีอยู่จริง หรือลบไปแล้ว ไม่ต้อง throw error
    console.warn(`Failed to delete image: ${filename}`, err.message);
  }
};

module.exports = {
  saveImage,
  deleteImage,
};
