import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommandInput, GetObjectCommandInput } from "@aws-sdk/client-s3";

require("dotenv").config();


const endpoint = process.env.WASABI_ENDPOINT;
const region = process.env.WASABI_REGION;
const bucket = process.env.WASABI_BUCKET as string;
const accessKeyId = process.env.WASABI_ACCESS_KEY as string;
const secretAccessKey = process.env.WASABI_SECRET_KEY as string;
const cdnUrl = process.env.CDN_URL;

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.warn("S3 (Wasabi) env not fully set: WASABI_BUCKET, WASABI_ACCESS_KEY, WASABI_SECRET_KEY are required.");
}

export const s3Client = new S3Client({
  region: region,
  endpoint: endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadBuffer(key: string, body: Buffer, contentType?: string, cacheControl?: string): Promise<void> {
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || "application/octet-stream",
    ACL: "public-read",
    CacheControl: cacheControl || "public, max-age=31536000",
  };

  await s3Client.send(new PutObjectCommand(params));
}

export async function getObject(key: string) {
  const params: GetObjectCommandInput = {
    Bucket: bucket,
    Key: key,
  };
  return s3Client.send(new GetObjectCommand(params));
}

export async function exists(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (_err) {
    return false;
  }
}

export function getPublicUrl(key: string): string {
  if (cdnUrl) {
    return `${cdnUrl.replace(/\/$/, "")}/${key}`;
  }
  if (endpoint) {
    const base = endpoint.replace(/\/$/, "");
    return `${base}/${bucket}/${key}`;
  }
  return `https://s3.${region}.wasabisys.com/${bucket}/${key}`;
}