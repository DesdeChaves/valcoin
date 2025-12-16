const multer = require('multer');
const path = require('path');

// Define o local de armazenamento para os uploads
const storage = multer.memoryStorage();

// Filtro para aceitar apenas ficheiros de imagem
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas ficheiros de imagem são permitidos!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 500 // Limite de 500KB por ficheiro
  }
});

module.exports = upload;
