import { config } from 'dotenv';
import { Client } from 'minio';
import { basename, resolve } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

// Load .env variables
config();

// Validate required environment variables
const requiredEnvVars = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_PUBLIC_HOST'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required MinIO environment variables:', missingVars.join(', '));
  console.error('Please ensure the following variables are set in your .env file:');
  console.error('MINIO_ENDPOINT=https://your-minio-server.com');
  console.error('MINIO_ACCESS_KEY=your_access_key_here');
  console.error('MINIO_SECRET_KEY=your_secret_key_here');
  console.error('MINIO_PUBLIC_HOST=https://storage.your-domain.com');
  throw new Error('Missing required MinIO environment variables');
}

// Decompose the URL into protocol, endpoint and port
const url = process.env.MINIO_ENDPOINT!;
const urlParts = new URL(url);
const protocol = urlParts.protocol.replace(':', '');
const endpoint = urlParts.hostname;
const port = urlParts.port ? parseInt(urlParts.port) : (protocol === 'https' ? 443 : 80);

// MinIO client setup
export const minioClient = new Client({
  endPoint: endpoint,
  port: port,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  useSSL: protocol === 'https',
});

// Default bucket for images
export const IMAGE_BUCKET = 'images';

/**
 * Upload a file from local filesystem to MinIO
 */
export async function uploadFileToMinio(
  filePath: string,
  bucketName: string,
  objectName?: string
): Promise<boolean> {
  try {
    const resolvedPath = resolve(filePath);
    const finalObjectName = objectName ?? basename(resolvedPath);

    if (!existsSync(resolvedPath)) {
      console.error(`Error: File ${resolvedPath} does not exist`);
      return false;
    }

    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
    }

    await minioClient.fPutObject(bucketName, finalObjectName, resolvedPath, {});
    console.log(`Successfully uploaded ${resolvedPath} to ${bucketName}/${finalObjectName}`);
    return true;
  } catch (err) {
    console.error(`Error uploading file: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Upload a buffer (e.g., from multer) to MinIO
 */
export async function uploadBufferToMinio(
  buffer: Buffer,
  bucketName: string,
  originalName: string,
  mimeType: string
): Promise<{ success: boolean; objectName?: string; publicUrl?: string }> {
  console.log('🔧 MinIO uploadBufferToMinio called with:');
  console.log('  - Buffer size:', buffer.length);
  console.log('  - Bucket name:', bucketName);
  console.log('  - Original name:', originalName);
  console.log('  - MIME type:', mimeType);
  
  try {
    console.log('🔍 Checking if bucket exists:', bucketName);
    
    // Ensure bucket exists
    const exists = await minioClient.bucketExists(bucketName);
    console.log('  - Bucket exists:', exists);
    
    if (!exists) {
      console.log('📦 Creating bucket:', bucketName);
      await minioClient.makeBucket(bucketName);
      console.log('✅ Bucket created successfully');
    }

    // Generate unique object name
    const fileExtension = originalName.split('.').pop();
    const objectName = `${randomUUID()}.${fileExtension}`;
    console.log('🏷️ Generated object name:', objectName);

    console.log('⬆️ Starting MinIO putObject...');
    
    // Upload buffer to MinIO
    await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    
    console.log('✅ MinIO putObject completed successfully');

    // Generate public URL
    const publicUrl = `${process.env.MINIO_PUBLIC_HOST}/${bucketName}/${objectName}`;
    console.log('🔗 Generated public URL:', publicUrl);

    console.log(`✅ Successfully uploaded buffer to ${bucketName}/${objectName}`);
    return { success: true, objectName, publicUrl };
  } catch (err) {
    console.error(`❌ Error uploading buffer: ${(err as Error).message}`);
    console.error('Error details:', err);
    return { success: false };
  }
}

/**
 * Delete an object from MinIO
 */
export async function deleteFromMinio(
  bucketName: string,
  objectName: string
): Promise<boolean> {
  try {
    await minioClient.removeObject(bucketName, objectName);
    console.log(`Successfully deleted ${bucketName}/${objectName}`);
    return true;
  } catch (err) {
    console.error(`Error deleting object: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Initialize MinIO service - ensure default bucket exists
 */
export async function initializeMinioService(): Promise<void> {
  console.log('🚀 Initializing MinIO service...');
  console.log('MinIO configuration:');
  console.log('  - Endpoint:', endpoint);
  console.log('  - Port:', port);
  console.log('  - Use SSL:', protocol === 'https');
  console.log('  - Access Key:', process.env.MINIO_ACCESS_KEY ? '***' : 'NOT SET');
  console.log('  - Secret Key:', process.env.MINIO_SECRET_KEY ? '***' : 'NOT SET');
  console.log('  - Public Host:', process.env.MINIO_PUBLIC_HOST);
  console.log('  - Default bucket:', IMAGE_BUCKET);
  
  try {
    console.log('🔍 Checking if default bucket exists:', IMAGE_BUCKET);
    const exists = await minioClient.bucketExists(IMAGE_BUCKET);
    console.log('  - Default bucket exists:', exists);
    
    if (!exists) {
      console.log('📦 Creating default bucket:', IMAGE_BUCKET);
      await minioClient.makeBucket(IMAGE_BUCKET);
      console.log(`✅ Created default image bucket: ${IMAGE_BUCKET}`);
    } else {
      console.log(`✅ Default image bucket already exists: ${IMAGE_BUCKET}`);
    }
    
    // Set bucket policy for public read access
    console.log('🔐 Setting bucket policy for public read access...');
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${IMAGE_BUCKET}/*`]
        }
      ]
    };
    
    await minioClient.setBucketPolicy(IMAGE_BUCKET, JSON.stringify(policy));
    console.log('✅ Bucket policy set successfully - public read access enabled');
    
    console.log('✅ MinIO service initialized successfully');
  } catch (err) {
    console.error(`❌ Error initializing MinIO service: ${(err as Error).message}`);
    console.error('Error details:', err);
  }
}