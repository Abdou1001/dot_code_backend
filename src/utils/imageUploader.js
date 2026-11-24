import sharp from "sharp";
import crypto from "crypto";

/**
 * Resize, optimize, and convert an uploaded image to WebP.
 *
 * @param {Buffer} fileBuffer - Original image buffer.
 * @returns {Promise<{fileName: string, buffer: Buffer}>}
 */
export const processImage = async (fileBuffer) => {
    // Generate a unique file name
    const fileName = `${crypto.randomUUID()}.webp`;

    // Resize, rotate, and compress the image
    const buffer = await sharp(fileBuffer, {
        limitInputPixels: 25_000_000,
        failOn: "error",
    })
        .rotate()
        .resize({
            width: 1200,
            withoutEnlargement: true,
        })
        .webp({
            quality: 80,
            effort: 4,
        })
        .toBuffer();

    return {
        fileName,
        buffer,
    };
};
