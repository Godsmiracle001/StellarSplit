import { Injectable } from "@nestjs/common";
import * as AWS from "aws-sdk";

@Injectable()
export class StorageProviderService {
  private s3 = new AWS.S3({ region: process.env.AWS_REGION });

  async saveFile(file: Express.Multer.File): Promise<string> {
    const key = `receipts/${Date.now()}-${file.originalname}`;
    await this.s3
      .putObject({
        Bucket: process.env.AWS_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();
    return key;
  }

  async getSignedUrl(key: string, expiresIn: number) {
    return this.s3.getSignedUrl("getObject", {
      Bucket: process.env.AWS_BUCKET!,
      Key: key,
      Expires: expiresIn,
    });
  }

  async deleteFile(key: string) {
    await this.s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET!,
        Key: key,
      })
      .promise();
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const result = await this.s3
      .getObject({
        Bucket: process.env.AWS_BUCKET!,
        Key: key,
      })
      .promise();

    return result.Body as Buffer;
  }
}
