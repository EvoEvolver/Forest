// import express, { Request, Response } from 'express';
// import multer from 'multer';
// import { uploadBufferToMinio, IMAGE_BUCKET } from '../services/minioService';
//
// const router = express.Router();
//
// // Configure multer for memory storage
// const storage = multer.memoryStorage();
//
// // File filter for images only
// const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   const allowedMimes = [
//     'image/jpeg',
//     'image/jpg',
//     'image/png',
//     'image/gif',
//     'image/webp',
//     'image/svg+xml'
//   ];
//
//   if (allowedMimes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only images are allowed.'));
//   }
// };
//
// // Configure multer with file size limit (10MB)
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB
//   },
//   fileFilter: fileFilter,
// });
//
// /**
//  * POST /api/images/upload
//  * Upload a single image file
//  */
// router.post('/upload', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
//   console.log('=== IMAGE UPLOAD REQUEST RECEIVED ===');
//   console.log('Request headers:', req.headers);
//   console.log('Request method:', req.method);
//   console.log('Request URL:', req.originalUrl);
//
//   try {
//     if (!req.file) {
//       console.log('❌ No image file provided in request');
//       res.status(400).json({
//         success: false,
//         error: 'No image file provided'
//       });
//       return;
//     }
//
//     const { buffer, originalname, mimetype } = req.file;
//     console.log('📁 File received:');
//     console.log('  - Original name:', originalname);
//     console.log('  - MIME type:', mimetype);
//     console.log('  - Size:', buffer.length, 'bytes');
//
//     console.log('🚀 Starting MinIO upload...');
//
//     // Upload to MinIO
//     const result = await uploadBufferToMinio(
//       buffer,
//       IMAGE_BUCKET,
//       originalname,
//       mimetype
//     );
//
//     console.log('📤 MinIO upload result:', result);
//
//     if (result.success) {
//       console.log('✅ Upload successful!');
//       console.log('  - Public URL:', result.publicUrl);
//       console.log('  - Object name:', result.objectName);
//
//       const responseData = {
//         success: true,
//         url: result.publicUrl,
//         objectName: result.objectName,
//         originalName: originalname,
//         size: buffer.length,
//         mimeType: mimetype
//       };
//
//       console.log('📤 Sending success response:', responseData);
//       res.json(responseData);
//     } else {
//       console.log('❌ MinIO upload failed');
//       res.status(500).json({
//         success: false,
//         error: 'Failed to upload image'
//       });
//     }
//   } catch (error: any) {
//     console.error('❌ Image upload error:', error);
//     console.error('Error stack:', error.stack);
//
//     // Handle multer errors
//     if (error instanceof multer.MulterError) {
//       console.log('🚨 Multer error detected:', error.code);
//       if (error.code === 'LIMIT_FILE_SIZE') {
//         res.status(400).json({
//           success: false,
//           error: 'File too large. Maximum size is 10MB.'
//         });
//         return;
//       }
//     }
//
//     console.log('📤 Sending error response');
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Internal server error'
//     });
//   }
// });
//
// /**
//  * POST /api/images/upload-multiple
//  * Upload multiple image files (for future use)
//  */
// router.post('/upload-multiple', upload.array('images', 10), async (req: Request, res: Response): Promise<void> => {
//   try {
//     const files = req.files as Express.Multer.File[];
//
//     if (!files || files.length === 0) {
//       res.status(400).json({
//         success: false,
//         error: 'No image files provided'
//       });
//       return;
//     }
//
//     const uploadPromises = files.map(file =>
//       uploadBufferToMinio(file.buffer, IMAGE_BUCKET, file.originalname, file.mimetype)
//     );
//
//     const results = await Promise.all(uploadPromises);
//     const successfulUploads = results.filter(result => result.success);
//
//     if (successfulUploads.length === 0) {
//       res.status(500).json({
//         success: false,
//         error: 'All uploads failed'
//       });
//       return;
//     }
//
//     res.json({
//       success: true,
//       uploads: successfulUploads.map((result, index) => ({
//         url: result.publicUrl,
//         objectName: result.objectName,
//         originalName: files[index].originalname,
//         size: files[index].buffer.length,
//         mimeType: files[index].mimetype
//       })),
//       totalUploaded: successfulUploads.length,
//       totalFiles: files.length
//     });
//   } catch (error: any) {
//     console.error('Multiple image upload error:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Internal server error'
//     });
//   }
// });
//
// /**
//  * GET /api/images/health
//  * Health check endpoint for image service
//  */
// router.get('/health', (req: Request, res: Response): void => {
//   console.log('🏥 Health check endpoint accessed');
//   res.json({
//     success: true,
//     service: 'Image Upload Service',
//     timestamp: new Date().toISOString(),
//     bucket: IMAGE_BUCKET,
//     endpoint: process.env.MINIO_ENDPOINT,
//     publicHost: process.env.MINIO_PUBLIC_HOST
//   });
// });
//
// /**
//  * POST /api/images/test-upload
//  * Test upload endpoint with more debugging
//  */
// router.post('/test-upload', (req: Request, res: Response): void => {
//   console.log('🧪 Test upload endpoint accessed');
//   console.log('Request body:', req.body);
//   console.log('Request headers:', req.headers);
//   console.log('Content-Type:', req.headers['content-type']);
//
//   res.json({
//     success: true,
//     message: 'Test endpoint working',
//     receivedHeaders: req.headers,
//     bodyKeys: Object.keys(req.body),
//   });
// });
//
// export { router as imageRoutes };