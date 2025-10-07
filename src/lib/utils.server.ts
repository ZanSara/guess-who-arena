import { readFile } from 'fs/promises';
import { join } from 'path';

// Server-side version using filesystem
export async function getImageAsBase64Server(imagePath: string): Promise<string | null> {
  try {
    // Remove leading slash and construct path to public directory
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const fullPath = join(process.cwd(), 'public', cleanPath);

    const imageBuffer = await readFile(fullPath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading image from filesystem:', error);
    return null;
  }
}
