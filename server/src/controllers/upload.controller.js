import path from 'path';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export const uploadMiddleware = upload.single('file');

export function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const mediaMimeType = req.file.mimetype;
  const mediaSize = req.file.size;

  let type = 'FILE';
  if (mediaMimeType.startsWith('image/')) type = 'IMAGE';
  else if (mediaMimeType.startsWith('video/')) type = 'VIDEO';
  else if (mediaMimeType.startsWith('audio/')) {
    type = req.body?.isVoiceNote === 'true' ? 'VOICE_NOTE' : 'AUDIO';
  }

  res.json({
    url: fileUrl,
    type,
    mimeType: mediaMimeType,
    size: mediaSize,
  });
}
