import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BusinessException } from '@/common/exceptions/business.exception';

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
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${this.uploadDir}/${folder}/${userId}/${Date.now()}-${sanitizedName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${this.bucketName}.s3.${this.bucketRegion}.amazonaws.com/${key}`;
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BusinessException('Invalid file type');
    }

    return this.uploadFile(userId, file, 'profiles');
  }
}
