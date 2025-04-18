import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { streamToString } from '../common/util/stream-to-string';
import { Readable } from 'stream';

export class S3StorageProvider {
  private s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
    region: process.env.S3_REGION as string,
  });

  async getJSONObject(key: string) {
    try {
      const data = await this.s3.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
        }),
      );

      return JSON.parse(await streamToString(data.Body as Readable));
    } catch (err: any) {
      console.log(err);
      return [];
    }
  }

  async putJSONObject(key: string, body: any): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Body: JSON.stringify(body),
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }),
    );
  }

  async putObject(key: string, body: Buffer): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        ACL: 'public-read',
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: body,
      }),
    );

    const bucketName = process.env.S3_BUCKET_NAME!;
    const region = process.env.S3_REGION;
    const url = `https://s3.${region}.amazonaws.com/${bucketName}/${key}`;
    return url;
  }
}
