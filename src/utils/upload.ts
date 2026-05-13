import multer from 'multer';

// Use memory storage to allow processing (encryption) before upload
const storage = multer.memoryStorage();

// Create multer instance
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
