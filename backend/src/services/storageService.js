const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { STORAGE } = require("../config/constants");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Abstract Strategy (แม่แบบ)
// -------------------------------------------------------------------
class StorageStrategy {
  async save(slug, base64String) {
    throw new Error("Method 'save' must be implemented.");
  }
  async delete(fileUrl) {
    throw new Error("Method 'delete' must be implemented.");
  }
}

// -------------------------------------------------------------------
// Local Storage Implementation (เก็บลงเครื่อง)
// -------------------------------------------------------------------
class LocalStorageStrategy extends StorageStrategy {
  constructor() {
    super();
    this.baseDir = path.join(__dirname, "../../", STORAGE.LOCAL_PATH);
  }

  async _ensureDir(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async save(slug, base64String) {
    if (!base64String || !base64String.startsWith("data:image")) return null;

    const slugDir = path.join(this.baseDir, slug);
    await this._ensureDir(slugDir);

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const mimeType = matches[1];
    const data = matches[2];

    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      logger.warn(`Blocked non-image upload: ${mimeType}`);
      return null;
    }

    const extension = mimeType.split("/")[1].replace("+xml", "");
    const imageBuffer = Buffer.from(data, "base64");
    const filename = `${Date.now()}.${extension}`;
    const filePath = path.join(slugDir, filename);

    await fs.writeFile(filePath, imageBuffer);

    // Return URL
    return `${process.env.BASE_URL}/uploads/logos/${slug}/${filename}`;
  }

  async delete(fileUrl) {
    if (!fileUrl) return;

    // Extract relative path from URL
    // URL: http://localhost:3001/uploads/logos/slug/file.png
    // Path: slug/file.png
    const relativePath = fileUrl.split("/uploads/logos/")[1];
    if (!relativePath) return;

    // Path Traversal Protection
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(this.baseDir, safePath);

    if (!filePath.startsWith(this.baseDir)) {
      logger.warn(`Path traversal blocked: ${relativePath}`);
      return;
    }

    try {
      await fs.unlink(filePath);
      // Cleanup Empty Dir
      const dirPath = path.dirname(filePath);
      const files = await fs.readdir(dirPath);
      if (files.length === 0) await fs.rmdir(dirPath);
    } catch (err) {
      logger.warn(`Failed to delete local file: ${relativePath}`, err.message);
    }
  }
}

// -------------------------------------------------------------------
// Supabase Storage Implementation
// -------------------------------------------------------------------
class SupabaseStorageStrategy extends StorageStrategy {
  constructor() {
    super();
    // อ่าน Config จาก .env
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY; // ใช้ Service Role Key (ดีสุดสำหรับ Backend)
    this.bucket = process.env.SUPABASE_BUCKET || "logos";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing in .env");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async save(slug, base64String) {
    if (!base64String || !base64String.startsWith("data:image")) return null;

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const mimeType = matches[1];
    const data = matches[2];
    const extension = mimeType.split("/")[1].replace("+xml", "");
    const buffer = Buffer.from(data, "base64");

    // File Path in Bucket: slug/timestamp.ext
    const filename = `${slug}/${Date.now()}.${extension}`;

    // Upload to Supabase
    const { data: uploadData, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      logger.error("Supabase Upload Error:", error);
      throw new Error("Failed to upload image to Cloud.");
    }

    // Get Public URL
    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  }

  async delete(fileUrl) {
    if (!fileUrl) return;

    try {
      // Extract path from URL
      // URL: https://<project>.supabase.co/storage/v1/object/public/<bucket>/slug/file.png
      // We need: slug/file.png
      const urlParts = fileUrl.split(`${this.bucket}/`);
      if (urlParts.length < 2) return; // Not a supabase url for this bucket

      const filePath = urlParts[1]; // slug/file.png

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([filePath]);

      if (error) {
        logger.warn("Supabase Delete Error:", error);
      }
    } catch (err) {
      logger.warn("Failed to delete cloud file:", err);
    }
  }
}

// -------------------------------------------------------------------
// Cloud Storage Implementation (Placeholder for S3/R2)
// -------------------------------------------------------------------
class CloudStorageStrategy extends StorageStrategy {
  async save(slug, base64String) {
    // TODO: Implement S3/Cloudinary upload logic here
    // 1. Convert base64 to Buffer
    // 2. Upload to S3 Bucket
    // 3. Return Public URL (CDN)
    throw new Error("Cloud storage is not configured yet.");
  }

  async delete(relativePath) {
    // TODO: Implement S3 delete logic
  }
}

// -------------------------------------------------------------------
// Factory & Export
// -------------------------------------------------------------------
const getStorageStrategy = () => {
  // อ่านค่าจาก .env ว่าจะใช้อะไร (Default: LOCAL)
  const provider = process.env.STORAGE_PROVIDER || "LOCAL";

  if (provider === "SUPABASE") {
    return new SupabaseStorageStrategy();
  }
  return new LocalStorageStrategy();
};

module.exports = {
  saveImage: (slug, data) => getStorageStrategy().save(slug, data),
  deleteImage: (path) => getStorageStrategy().delete(path),
};

/**
 * Helper: ตรวจสอบและสร้างโฟลเดอร์ถ้ายังไม่มี
 --/
// กำหนด Path ปลายทาง (อ้างอิงจาก Constants)
const LOGO_DIR = path.join(__dirname, "../../", STORAGE.LOCAL_PATH);

const ensureDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * @function saveImage
 * @description เก็บรูปภาพ
 --/
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

  const extension = mimeType.split("/")[1].replace("+xml", ""); // svg+xml -> svg
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
 * @function deleteImage
 * @description ลบรูปภาพ
 --/
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

    // ลบโฟลเดอร์ Slug ทิ้งด้วยถ้ามันว่างเปล่าแล้ว (Empty Directory Cleanup)
    const dirPath = path.dirname(filePath);
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      await fs.rmdir(dirPath);
    }
  } catch (err) {
    // ไฟล์อาจจะไม่มีอยู่จริง หรือลบไปแล้ว ไม่ต้อง throw error
    console.warn(`Failed to delete image: ${relativePath}`, err.message);
  }
};

module.exports = {
  saveImage,
  deleteImage,
};
*/
