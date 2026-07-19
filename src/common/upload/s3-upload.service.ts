import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BusinessException } from '@/common/exceptions/business.exception';
import sharp from 'sharp';
import * as path from 'path';

@Injectable()
export class S3UploadService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly bucketRegion: string;
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('BUCKET_NAME');
    this.bucketRegion = this.configService.getOrThrow<string>('BUCKET_REGION');
    this.uploadDir = this.configService.getOrThrow<string>('UPLOAD_DIR');
    this.s3Client = new S3Client({
      region: this.bucketRegion,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('ACCESS_SECRET'),
      },
    });
  }

  async uploadFile(userId: string, file: Express.Multer.File, folder: string) {
    let buffer = file.buffer;
    let mimetype = file.mimetype;
    let originalname = file.originalname;

    if (file.mimetype.startsWith('image/')) {
      try {
        buffer = await sharp(file.buffer)
          .webp({ quality: 80 })
          .toBuffer();
        mimetype = 'image/webp';
        
        const ext = path.extname(file.originalname);
        const nameWithoutExt = ext ? file.originalname.slice(0, -ext.length) : file.originalname;
        originalname = `${nameWithoutExt}.webp`;

        // Update the file object properties in-place for callers
        file.buffer = buffer;
        file.mimetype = mimetype;
        file.originalname = originalname;
        file.size = buffer.length;
      } catch (error) {
        // Fallback to original file if compression fails
      }
    }

    const sanitizedName = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${this.uploadDir}/${folder}/${userId}/${Date.now()}-${sanitizedName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return `https://${this.bucketName}.s3.${this.bucketRegion}.amazonaws.com/${key}`;
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new BusinessException('Invalid file type');
    }

    return this.uploadFile(userId, file, 'profiles');
  }

  async deleteFile(fileUrl: string) {
    if (!fileUrl) return;
    try {
      const url = new URL(fileUrl);
      const key = decodeURIComponent(url.pathname.substring(1));
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      // Ignore if parsing URL fails or deletion fails
    }
  }
}
