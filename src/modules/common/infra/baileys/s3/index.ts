import * as path from 'path';
import fs from 'fs/promises';
import {
  BufferJSON,
  initAuthCreds,
  WAProto as proto,
} from '@whiskeysockets/baileys';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// Function that normalize key name
const fixFileName = (file: string) => {
  if (!file) {
    return undefined;
  }
  const replacedSlash = file.replace(/\//g, '__');
  const replacedColon = replacedSlash.replace(/:/g, '-');
  return replacedColon;
};

const generateBucketKey = (sessionId: string, key: string) =>
  `${process.env.S3_BUCKET_NAME}/zapwise-whatsapp-sessions/${sessionId}-${key}.json`;

export const getS3Client = () => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
    region: process.env.S3_REGION as string,
  });

  return s3;
};

// Upsert session json in s3
async function insertOrUpdateAuthKey(
  sessionId: string,
  key: string,
  dataString: string,
) {
  const s3Client = getS3Client();
  const bucketKey = generateBucketKey(sessionId, key);
  try {
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: bucketKey,
    });
    const response = await s3Client.send(getObjectCommand);
    const keyJsonString = await response.Body?.transformToString();
    if (!keyJsonString) return;
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: bucketKey,
      Body: dataString,
    });
    await s3Client.send(putObjectCommand);
  } catch (err: any) {
    if (err.name !== 'NoSuchKey') return;
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: bucketKey,
      Body: dataString,
    });
    await s3Client.send(putObjectCommand);
  }
}

// Get the session in s3
export async function getAuthKey(sessionId: string, key: string) {
  try {
    const bucketKey = generateBucketKey(sessionId, key);
    const s3Client = getS3Client();
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: bucketKey,
    });
    const response = await s3Client.send(getObjectCommand);
    const keyJsonString = await response.Body?.transformToString();
    if (!keyJsonString) return null;
    return keyJsonString;
  } catch (err: any) {
    return null;
  }
}

// Remove session in s3
export async function deleteAuthKey(sessionId: string, key: string) {
  const s3Client = getS3Client();
  const bucketKey = generateBucketKey(sessionId, key);
  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: bucketKey,
  });
  await s3Client.send(deleteCommand);
}

export default async function useS3AuthState(
  sessionID: string,
  saveOnlyCreds = false,
) {
  const localFolder = path.join(
    process.cwd(),
    'nection-whatsapp-sessions',
    sessionID,
  );

  const localFile = (key: string) =>
    path.join(localFolder, fixFileName(key) + '.json');
  if (saveOnlyCreds) await fs.mkdir(localFolder, { recursive: true });

  async function writeData(data: string, key: string) {
    const dataString = JSON.stringify(data, BufferJSON.replacer);
    if (saveOnlyCreds && key !== 'creds') {
      await fs.writeFile(localFile(key), dataString);
      return;
    }
    await insertOrUpdateAuthKey(sessionID, key, dataString);
  }

  async function readData(key: string) {
    try {
      let rawData: string | null = null;
      if (saveOnlyCreds && key !== 'creds') {
        rawData = await fs.readFile(localFile(key), {
          encoding: 'utf-8',
        });
      } else {
        rawData = await getAuthKey(sessionID, key);
      }
      if (!rawData) return;
      const parsedData = JSON.parse(rawData, BufferJSON.reviver);
      return parsedData;
    } catch (err) {
      console.log('❌ readData', (err as Error).message);
      return null;
    }
  }

  async function removeData(key: string) {
    try {
      if (saveOnlyCreds && key !== 'creds') {
        await fs.unlink(localFile(key));
      } else {
        await deleteAuthKey(sessionID, key);
      }
    } catch (err) {}
  }

  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeData(creds, 'creds');
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const data = {} as any;
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: any[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => {
      return writeData(creds, 'creds');
    },
  };
}
