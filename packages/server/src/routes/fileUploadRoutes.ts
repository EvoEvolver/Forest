import express, {Request, Response} from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import {uploadBufferToMinio} from '../services/minioService';
import {AuthenticatedRequest, authenticateToken} from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for documents only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'application/pdf',
        'text/markdown',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const allowedExtensions = ['.pdf', '.md', '.txt', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Markdown, TXT, DOC, DOCX files are allowed.'));
    }
};

// Configure multer with file size limit (50MB for documents)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: fileFilter,
});

/**
 * POST /api/files/upload
 * Upload a document file to MinIO and return public URL
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('=== DOCUMENT UPLOAD REQUEST RECEIVED ===');
    console.log('User:', req.user?.email);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.originalUrl);

    try {
        if (!req.file) {
            console.log('❌ No document file provided in request');
            res.status(400).json({
                success: false,
                error: 'No document file provided'
            });
            return;
        }

        const {buffer, originalname, mimetype} = req.file;
        console.log('📁 File received:');
        console.log('  - Original name:', originalname);
        console.log('  - MIME type:', mimetype);
        console.log('  - Size:', buffer.length, 'bytes');

        // Calculate SHA-256 hash of the file
        console.log('🔍 Calculating file hash...');
        const hash = crypto.createHash('sha256');
        hash.update(buffer);
        const fileExtension = path.extname(originalname);
        const fileHash = hash.digest('hex');
        const objectName = fileHash + fileExtension;
        console.log('  - Generated object name:', objectName);

        // Determine bucket based on file type
        const isPdf = mimetype === 'application/pdf' || fileExtension.toLowerCase() === '.pdf';
        const bucketName = isPdf ? "pdf" : "documents";
        console.log('  - Target bucket:', bucketName);

        console.log('🚀 Starting MinIO upload...');

        // Upload to MinIO
        const result = await uploadBufferToMinio(
            buffer,
            bucketName,
            objectName, // Use hash as object name
            mimetype
        );

        console.log('📤 MinIO upload result:', result);

        if (result.success) {
            console.log('✅ Upload successful!');
            console.log('  - Public URL:', result.publicUrl);
            console.log('  - Object name:', result.objectName);

            const responseData = {
                success: true,
                fileUrl: result.publicUrl,
                objectName: result.objectName,
                originalName: originalname,
                size: buffer.length,
                mimeType: mimetype,
                bucket: bucketName,
                hash: fileHash
            };

            console.log('📤 Sending success response:', responseData);
            res.json(responseData);
        } else {
            console.log('❌ MinIO upload failed');
            res.status(500).json({
                success: false,
                error: 'Failed to upload document'
            });
        }
    } catch (error: any) {
        console.error('❌ Document upload error:', error);
        console.error('Error stack:', error.stack);

        // Handle multer errors
        if (error instanceof multer.MulterError) {
            console.log('🚨 Multer error detected:', error.code);
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({
                    success: false,
                    error: 'File too large. Maximum size is 50MB.'
                });
                return;
            }
        }

        console.log('📤 Sending error response');
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * GET /api/files/health
 * Health check endpoint for file upload service
 */
router.get('/health', (req: Request, res: Response): void => {
    console.log('🏥 File upload service health check');
    res.json({
        success: true,
        service: 'Document Upload Service',
        timestamp: new Date().toISOString(),
        supportedTypes: ['PDF', 'Markdown', 'TXT', 'DOC', 'DOCX'],
        maxFileSize: '50MB',
        endpoint: process.env.MINIO_ENDPOINT,
        publicHost: process.env.MINIO_PUBLIC_HOST
    });
});

export {router as fileUploadRoutes};