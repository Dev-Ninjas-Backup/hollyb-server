import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { S3UploadService } from '@/common/upload/s3-upload.service';
import { ResponseHelper } from '@/common/utils/response.helper';
import {
  BusinessException,
  ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { DocumentType, ReviewStatus, UserRole } from '@prisma';

@Injectable()
export class ProfileDocumentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3UploadService: S3UploadService,
  ) {}

  async getMyDocuments(userId: string) {
    await this.ensureUser(userId);
    const documents = await this.prismaService.client.document.findMany({
      where: { user_id: userId },
      orderBy: { uploaded_at: 'desc' },
    });

    return ResponseHelper.success(
      documents.map((doc) => this.mapDocument(doc)),
      'Documents fetched successfully',
    );
  }

  async getDocumentCompletionScore(userId: string) {
    await this.ensureUser(userId);
    const documents = await this.prismaService.client.document.findMany({
      where: { user_id: userId },
    });

    const documentTypes = documents.map((doc) => doc.type);

    let filledFields = 0;
    
    if (documentTypes.includes(DocumentType.profile_photo)) filledFields++;
    
    if (
      documentTypes.includes(DocumentType.trade_license_front) ||
      documentTypes.includes(DocumentType.trade_license_back) ||
      documentTypes.includes(DocumentType.trade_license)
    ) filledFields++;

    if (
      documentTypes.includes(DocumentType.nid_front) ||
      documentTypes.includes(DocumentType.nid_back)
    ) filledFields++;

    if (
      documentTypes.includes(DocumentType.driving_license_front) ||
      documentTypes.includes(DocumentType.driving_license_back)
    ) filledFields++;

    if (
      documentTypes.includes(DocumentType.passport_front) ||
      documentTypes.includes(DocumentType.passport_back)
    ) filledFields++;

    if (documentTypes.includes(DocumentType.utility_bill)) filledFields++;

    const score = filledFields === 6 ? 100 : Number((filledFields * 16.67).toFixed(2));

    return ResponseHelper.success(
      { score, filledFields, totalFields: 6 },
      'Document completion score fetched successfully',
    );
  }

  async deleteDocument(userId: string, documentIds: string) {
    await this.ensureUser(userId);
    const ids = documentIds.split(',').map((id) => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      throw new BusinessException('No document IDs provided');
    }

    const documents = await this.prismaService.client.document.findMany({
      where: { id: { in: ids } },
    });

    if (documents.length === 0) {
      throw new ResourceNotFoundException('Documents', documentIds);
    }

    const unauthorized = documents.some((doc) => doc.user_id !== userId);
    if (unauthorized) {
      throw new BusinessException('Unauthorized to delete one or more documents');
    }

    for (const doc of documents) {
      await this.s3UploadService.deleteFile(doc.file_url);
    }

    await this.prismaService.client.document.deleteMany({
      where: { id: { in: ids } },
    });

    return ResponseHelper.success(null, 'Documents deleted successfully');
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.ensureUser(userId);
    this.ensureImageFile(file);
    const fileUrl = await this.s3UploadService.uploadFile(
      userId,
      file,
      `documents/${DocumentType.profile_photo}`,
    );
    const document = await this.saveDocument(
      userId,
      DocumentType.profile_photo,
      fileUrl,
    );
    await this.updateProfilePhoto(user.id, user.role, fileUrl);
    return ResponseHelper.created(
      this.mapDocument(document),
      'Profile photo uploaded successfully',
    );
  }

  async uploadTradeLicense(
    userId: string,
    front: Express.Multer.File,
    back: Express.Multer.File,
  ) {
    await this.ensureUser(userId);
    this.ensureDocumentFile(front);
    this.ensureDocumentFile(back);

    const frontUrl = await this.s3UploadService.uploadFile(
      userId,
      front,
      `documents/${DocumentType.trade_license_front}`,
    );
    const backUrl = await this.s3UploadService.uploadFile(
      userId,
      back,
      `documents/${DocumentType.trade_license_back}`,
    );

    const frontDoc = await this.saveDocument(
      userId,
      DocumentType.trade_license_front,
      frontUrl,
    );
    const backDoc = await this.saveDocument(
      userId,
      DocumentType.trade_license_back,
      backUrl,
    );

    return ResponseHelper.created(
      { front: this.mapDocument(frontDoc), back: this.mapDocument(backDoc) },
      'Trade license uploaded successfully',
    );
  }

  async uploadNid(
    userId: string,
    front: Express.Multer.File,
    back: Express.Multer.File,
  ) {
    await this.ensureUser(userId);
    this.ensureDocumentFile(front);
    this.ensureDocumentFile(back);

    const frontUrl = await this.s3UploadService.uploadFile(
      userId,
      front,
      `documents/${DocumentType.nid_front}`,
    );
    const backUrl = await this.s3UploadService.uploadFile(
      userId,
      back,
      `documents/${DocumentType.nid_back}`,
    );

    const frontDoc = await this.saveDocument(
      userId,
      DocumentType.nid_front,
      frontUrl,
    );
    const backDoc = await this.saveDocument(
      userId,
      DocumentType.nid_back,
      backUrl,
    );

    return ResponseHelper.created(
      { front: this.mapDocument(frontDoc), back: this.mapDocument(backDoc) },
      'NID uploaded successfully',
    );
  }

  async uploadDrivingLicense(
    userId: string,
    front: Express.Multer.File,
    back: Express.Multer.File,
  ) {
    await this.ensureUser(userId);
    this.ensureDocumentFile(front);
    this.ensureDocumentFile(back);

    const frontUrl = await this.s3UploadService.uploadFile(
      userId,
      front,
      `documents/${DocumentType.driving_license_front}`,
    );
    const backUrl = await this.s3UploadService.uploadFile(
      userId,
      back,
      `documents/${DocumentType.driving_license_back}`,
    );

    const frontDoc = await this.saveDocument(
      userId,
      DocumentType.driving_license_front,
      frontUrl,
    );
    const backDoc = await this.saveDocument(
      userId,
      DocumentType.driving_license_back,
      backUrl,
    );

    return ResponseHelper.created(
      { front: this.mapDocument(frontDoc), back: this.mapDocument(backDoc) },
      'Driving license uploaded successfully',
    );
  }

  async uploadPassport(
    userId: string,
    front: Express.Multer.File,
    back: Express.Multer.File,
  ) {
    await this.ensureUser(userId);
    this.ensureDocumentFile(front);
    this.ensureDocumentFile(back);

    const frontUrl = await this.s3UploadService.uploadFile(
      userId,
      front,
      `documents/${DocumentType.passport_front}`,
    );
    const backUrl = await this.s3UploadService.uploadFile(
      userId,
      back,
      `documents/${DocumentType.passport_back}`,
    );

    const frontDoc = await this.saveDocument(
      userId,
      DocumentType.passport_front,
      frontUrl,
    );
    const backDoc = await this.saveDocument(
      userId,
      DocumentType.passport_back,
      backUrl,
    );

    return ResponseHelper.created(
      { front: this.mapDocument(frontDoc), back: this.mapDocument(backDoc) },
      'Passport uploaded successfully',
    );
  }

  async uploadUtilityBill(
    userId: string,
    file: Express.Multer.File,
    address?: string,
  ) {
    const user = await this.ensureUser(userId);
    this.ensureDocumentFile(file);
    const fileUrl = await this.s3UploadService.uploadFile(
      userId,
      file,
      `documents/${DocumentType.utility_bill}`,
    );
    const document = await this.saveDocument(
      userId,
      DocumentType.utility_bill,
      fileUrl,
    );
    const addressUpdated = await this.updateUserAddress(
      user.id,
      user.role,
      address,
    );

    return ResponseHelper.created(
      { document: this.mapDocument(document), addressUpdated },
      'Utility bill uploaded successfully',
    );
  }

  private async ensureUser(userId: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return user;
  }

  private ensureImageFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BusinessException('File is required');
    }

    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new BusinessException('Invalid file type');
    }
  }

  private ensureDocumentFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BusinessException('File is required');
    }

    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isPdf = file.mimetype === 'application/pdf';

    if (!isImage && !isVideo && !isPdf) {
      throw new BusinessException('Invalid file type');
    }
  }

  private async saveDocument(
    userId: string,
    type: DocumentType,
    fileUrl: string,
  ) {
    const existing = await this.prismaService.client.document.findFirst({
      where: { user_id: userId, type },
    });

    if (existing) {
      return this.prismaService.client.document.update({
        where: { id: existing.id },
        data: {
          file_url: fileUrl,
          status: ReviewStatus.pending,
          rejection_reason: null,
          reviewed_at: null,
          uploaded_at: new Date(),
        },
      });
    }

    return this.prismaService.client.document.create({
      data: {
        user_id: userId,
        type,
        file_url: fileUrl,
        status: ReviewStatus.pending,
      },
    });
  }

  private async updateUserAddress(
    userId: string,
    role: UserRole,
    address?: string,
  ) {
    if (!address || !address.trim()) {
      return false;
    }

    const trimmed = address.trim();

    if (role === UserRole.employee) {
      await this.prismaService.client.employeeProfile.upsert({
        where: { user_id: userId },
        update: { address: trimmed },
        create: { user_id: userId, address: trimmed },
      });
      return true;
    }

    if (role === UserRole.employer) {
      await this.prismaService.client.employerProfile.upsert({
        where: { user_id: userId },
        update: { address: trimmed },
        create: { user_id: userId, address: trimmed },
      });
      return true;
    }

    return false;
  }

  private async updateProfilePhoto(
    userId: string,
    role: UserRole,
    profilePhotoUrl: string,
  ) {
    if (role === UserRole.employee) {
      await this.prismaService.client.employeeProfile.upsert({
        where: { user_id: userId },
        update: { profile_photo_url: profilePhotoUrl },
        create: { user_id: userId, profile_photo_url: profilePhotoUrl },
      });
      return;
    }

    if (role === UserRole.employer) {
      await this.prismaService.client.employerProfile.upsert({
        where: { user_id: userId },
        update: { profile_photo_url: profilePhotoUrl },
        create: { user_id: userId, profile_photo_url: profilePhotoUrl },
      });
    }
  }

  private mapDocument(document: {
    id: string;
    type: DocumentType;
    file_url: string;
    status: ReviewStatus;
    rejection_reason: string | null;
    uploaded_at: Date;
    reviewed_at: Date | null;
  }) {
    return {
      id: document.id,
      type: document.type,
      fileUrl: document.file_url,
      status: document.status,
      rejectionReason: document.rejection_reason,
      uploadedAt: document.uploaded_at,
      reviewedAt: document.reviewed_at,
    };
  }
}
