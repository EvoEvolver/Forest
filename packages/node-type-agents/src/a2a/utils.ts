// Image processing utilities for A2A responses
export interface A2AImageFile {
    bytes?: string;
    url?: string;
    mimeType: string;
    name: string;
}

export interface A2AImagePart {
    kind: string;
    file?: A2AImageFile;
}

export interface A2AArtifact {
    artifactId?: string;
    description?: string;
    name?: string;
    parts?: A2AImagePart[];
}

// Upload image from base64 bytes to image bed (adapted from image-upload.tsx)
export async function uploadImageFromBase64(base64Bytes: string, mimeType: string, fileName: string): Promise<string> {
    console.log(`🖼️ [A2A Image] Starting image upload: ${fileName}, type: ${mimeType}`);
    
    try {
        // Convert base64 to blob
        const binaryString = atob(base64Bytes);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        
        console.log(`🖼️ [A2A Image] Converted base64 to blob: ${blob.size} bytes`);
        
        // Create file from blob
        const file = new File([blob], fileName, { type: mimeType });
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type: ${file.type}`);
        }
        
        if (file.size > 10 * 1024 * 1024) {
            throw new Error(`File too large: ${file.size} bytes (max 10MB)`);
        }
        
        // Prepare upload
        const formData = new FormData();
        formData.append('image', file);
        
        // Get upload URL - use the same endpoint as image-upload.tsx
        const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
        const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;
        const uploadUrl = `${httpUrl}/api/images/upload`;
        
        console.log(`🖼️ [A2A Image] Uploading to: ${uploadUrl}`);
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`🖼️ [A2A Image] Upload result:`, result);
        
        if (result.success && result.url) {
            console.log(`✅ [A2A Image] Successfully uploaded: ${result.url}`);
            return result.url;
        } else {
            throw new Error(result.error || 'Upload failed - no URL returned');
        }
        
    } catch (error: any) {
        console.error(`❌ [A2A Image] Upload failed:`, error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
}

// Preprocess A2A response to convert image bytes to URLs  
export async function preprocessA2AResponse(response: any): Promise<any> {
    console.log(`🔍 [A2A Preprocessor] Processing response for images...`);
    
    if (!response || typeof response !== 'object') {
        console.log(`🔍 [A2A Preprocessor] No response object to process`);
        return response;
    }
    
    // Check if response has artifacts with image files
    let artifacts: A2AArtifact[] = [];
    
    // Handle different response structures
    if (response.artifacts) {
        artifacts = response.artifacts;
    } else if (response.result && response.result.artifacts) {
        artifacts = response.result.artifacts;
    } else if (Array.isArray(response) && response.length > 0 && response[0].artifacts) {
        artifacts = response[0].artifacts;
    }
    
    if (!artifacts || artifacts.length === 0) {
        console.log(`🔍 [A2A Preprocessor] No artifacts found in response`);
        return response;
    }
    
    console.log(`🔍 [A2A Preprocessor] Found ${artifacts.length} artifacts to check`);
    
    let imageProcessingCount = 0;
    
    // Process each artifact
    for (const artifact of artifacts) {
        if (!artifact.parts || !Array.isArray(artifact.parts)) {
            continue;
        }
        
        console.log(`🔍 [A2A Preprocessor] Checking artifact with ${artifact.parts.length} parts`);
        
        // Process each part in the artifact
        for (const part of artifact.parts) {
            if (part.kind === 'file' && part.file) {
                const file = part.file;
                
                // Check if it's an image file with base64 bytes
                if (file.mimeType && 
                    file.mimeType.startsWith('image/') && 
                    file.bytes && 
                    !file.url) {
                    
                    console.log(`🔍 [A2A Preprocessor] Found image file to process: ${file.name}, type: ${file.mimeType}`);
                    imageProcessingCount++;
                    
                    try {
                        // Upload the image and get URL
                        const uploadedUrl = await uploadImageFromBase64(
                            file.bytes, 
                            file.mimeType, 
                            file.name || `image_${Date.now()}.${file.mimeType.split('/')[1]}`
                        );
                        
                        // Replace bytes with URL
                        delete file.bytes;
                        file.url = uploadedUrl;
                        
                        console.log(`✅ [A2A Preprocessor] Successfully converted image to URL: ${uploadedUrl}`);
                        
                    } catch (error: any) {
                        console.error(`❌ [A2A Preprocessor] Failed to process image ${file.name}:`, error);
                        // Keep the original bytes if upload fails
                        // You could also choose to remove the image or add an error field
                    }
                }
            }
        }
    }
    
    if (imageProcessingCount > 0) {
        console.log(`🔍 [A2A Preprocessor] Processed ${imageProcessingCount} images in response`);
    } else {
        console.log(`🔍 [A2A Preprocessor] No images found to process`);
    }
    
    return response;
}