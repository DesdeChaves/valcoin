const multer = require('multer');

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Apenas ficheiros de imagem são permitidos!'), false);
    }
};

const csvFileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
        cb(null, true);
    } else {
        cb(new Error('Apenas ficheiros CSV são permitidos!'), false);
    }
};

const imageUpload = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB limit for images
    }
});

const csvUpload = multer({
    storage: storage,
    fileFilter: csvFileFilter,
});

module.exports = {
    imageUpload,
    csvUpload
};
