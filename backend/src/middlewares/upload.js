import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format (jpg, png, webp, gif only)'));
  }
};

const mediaFilter = (req, file, cb) => {
  const images = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const videos = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  if (images.includes(file.mimetype) || videos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format (jpg, png, webp, gif, mp4, webm, mov, avi allowed)'));
  }
};

export const upload = multer({
  storage,
  limits:     { fileSize: env.maxFileSize },
  fileFilter: imageFilter,
});

// Accepts both images and videos (for product media)
export const uploadMedia = multer({
  storage,
  limits:     { fileSize: 100 * 1024 * 1024 }, // 100 MB for video
  fileFilter: mediaFilter,
});
