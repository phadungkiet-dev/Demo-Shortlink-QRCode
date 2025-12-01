const fs = require("fs/promises");
const path = require("path");
const { STORAGE } = require("../config/constants");

// ตรวจสอบและสร้างโฟลเดอร์ปลายทาง (เก็บใน storage/logos ตาม config)
const LOGO_DIR = path.join(__dirname, "../../", STORAGE.LOCAL_PATH);

const ensureDir = async () => {
  try {
    await fs.access(LOGO_DIR);
  } catch {
    await fs.mkdir(LOGO_DIR, { recursive: true });
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

  await ensureDir();

  // แยกนามสกุลไฟล์และข้อมูลภาพ
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

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
  const filename = `${slug}-${Date.now()}.${extension}`;
  const filePath = path.join(LOGO_DIR, filename);

  // บันทึกลง Disk (จุดนี้แหละที่อนาคตเปลี่ยนเป็น upload ขึ้น Cloud ได้)
  await fs.writeFile(filePath, imageBuffer);

  // คืนค่า URL สำหรับให้ Frontend เรียกใช้
  return `${process.env.BASE_URL}/uploads/logos/${filename}`;
};

/**
 * Delete Image (เผื่อใช้ตอนลบลิงก์ - Optional)
 */
const deleteImage = async (filename) => {
  if (!filename) return;

  // ป้องกัน Directory Traversal Attack (เช่น ส่ง filename = "../../etc/passwd")
  const safeFilename = path.basename(filename);

  try {
    const filePath = path.join(LOGO_DIR, safeFilename);
    await fs.unlink(filePath);
  } catch (err) {
    // ไฟล์อาจจะไม่มีอยู่จริง หรือลบไปแล้ว ไม่ต้อง throw error
    console.warn(`Failed to delete image: ${filename}`, err.message);
  }
};

module.exports = {
  saveImage,
  deleteImage,
};
