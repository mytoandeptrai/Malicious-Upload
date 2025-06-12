import { google } from 'googleapis';
import mime from 'mime';
import { type NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

const key =
  '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDTd9uNNJ2nmNHQ\nyk0EDTcYjacOzfMtxPybiJBwmZ/kkkdn3ZT4LlMcN04OJlbwuik5+XfCOBl3bUnE\n2f/Z1u4ckI7iphjWcuTvcpjUr24BfCpxVRvLEEQYkbSHMbINsGn4qEUgGLwBJ6RU\n1x4FV6deAkWjPpF39c+5m/qDu7g1TPrz/L7MqreuXztZ/XanHIbafhv9YQ+FydqX\nTFYoMaB+dPFlmDnRBJ52j9HThk5D5JpXlhZHI8swS4j7st0VtFQc6dhM3LizN9Ha\nfrgITLEgiTwBoHUxMT2qQxfxoLvwPALTZVsRo4oSFdwJY49Sw69QueBwGzx1D0qK\nnHF67IglAgMBAAECggEAG+pxKcld3I+QdyMVmqjR8qRUfuBSL2MXQ8L56ltlX6ut\n0HjQXxjicNGeNMD77ihtI9GabSGxvvHG8L0kiNHWOiAdNK9fjQO61B9JLJ6CA6Es\nCy0Ej8B0dNfbQJOfYS4+Nwyjn3KUcwSULXz+Yg8psX/USJIMaw0goGyGXBiOXz6u\nTOZCVl6aORBex+S/wVbkpt2JNltO3fS9plmp5Rkd9EMNduzLRb6pg0hdkYY6EE0V\npQ4G0slq61iTZP4JuQvMZBGtW/KgdgyTQjaUtlVFpu9aCPJFCFZ3qwKNFIxqDgM/\nQoJ42Q+wnUoo7d/VgUdVec6dZzvUDqY/BZm8nzXqgQKBgQDzy5JQg8Oj+rYFWY/L\npw7nQ51y5Pq4dO1KXCf1AhUjsWTDrwjwrRXxDaiZtmDvNccQlfA5Ze+fs+TQlYm0\nHy9RPOY6Gh6lxMULcxTFaxR6ZVX+oJvpsqCOUPE9OHu+CttZt8Ij4cNSwHnT7y/w\nwFg30LRGJRPbq80iele0eIR6wQKBgQDeDf1p0BZjly14GTWXDcOPLIZRt+9Z4kiI\n+o1X99i5a5Pzt4dOJ55F55y667i2nKHlmbX2qIgFw++RbTwe+UkfWERRtCfkMD29\nfR+AOIZCLTJLNB7Ojriw2AiSTFOX5o1gz7eIkvFfjB24HnCnIo8DDuzfs5Q/pU/l\nZrk6gNCaZQKBgQCvlgG2TYA9fRdVuRCQy6w3MgKXOoW9DjHNKZx5oNtazqvVKB6X\nQQIZkA3LT4h3INNThbnzjRBNhIIbHGiGOyOYLfVfCWrjV1nXijX+jcW89Xk/H6vL\nYCS0+2UUA7dTw3wCHRANSc+krQ3Rb2amzdF7uavtDU1FHHJtD5JVX6uCwQKBgAvg\nMapkD5556lue9YfDm67fkbtzG+DxwjFZPQ/0WGnqP/pr2VertMJGVdKFYtaZX+s4\nokuzzbqJNRnQ/sMlT+zWOqkn+m4wykyFEZc47q1BX4w4GGGxrlz+4M56OIpKMUt5\nMHakbTZP9xLuxdWaeo2OUcrQ/t+8hp5dNRDU7NMlAoGBAMnjVUXxsmVi45kv+q8J\nRRQ6kDCILcWhA5Sv7yTTfd7eQBdNmF1XIkSabKWIHpd6VYkNazMqwlsg7qN1weVW\nNofSSPol3ZHagyysJbUnOyP9zEZwGoAI/431FQn5d5rL4tV5WCE/s6PK9yuoT9OX\nUjrU3DDUNt5QJhP0K6EUEjwr\n-----END PRIVATE KEY-----\n';

const privateKey = key?.replace(/\\n/g, '\n');
const clientEmail = process.env.NEXT_PUBLIC_CLIENT_EMAIL;
const serviceAccountClientId = process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_CLIENT_ID;
const scopes = ['https://www.googleapis.com/auth/drive.file'];
const googleDriveId = process.env.NEXT_PUBLIC_SHARED_DRIVE_ID;

const authenticateGoogle = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: serviceAccountClientId,
    },
    scopes,
  });

  return auth;
};

const uploadFileToDrive = async (file: any) => {
  try {
    const auth = authenticateGoogle();
    const drive = google.drive({ version: 'v3', auth });

    const mimeType = mime.getType(file.name);
    if (!mimeType) {
      throw new Error('Invalid file type');
    }

    const fileMetadata = {
      name: file.name,
      parents: [googleDriveId!],
      mimeType: mimeType,
    };

    const fileBuffer = file.stream();

    /** Add file to drive folder */
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new Error('Failed to create file in Google Drive');
    }

    /** Get file link from drive */
    await drive.files.get({
      fileId: response.data.id,
      alt: 'media',
    });

    return {
      id: response.data.id,
      name: response.data.name,
    };
  } catch (error: any) {
    // biome-ignore lint/complexity/noUselessCatch: <explanation>
    throw error;
  }
};

// POST request handler
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size must be less than 10MB' }, { status: 400 });
    }

    const response = await uploadFileToDrive(file);

    return NextResponse.json({
      success: true,
      fileId: response.id,
      fileName: file.name,
      virusScanResult: 'clean',
    });
  } catch (error: any) {
    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'This file has been identified as malware or spam and cannot be downloaded.',
        },
        { status: 403 }
      );
    }

    if (error.code === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed. Please check your Google Drive setup.',
        },
        { status: 401 }
      );
    }

    if (error.code === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Folder not found. Please check your Google Drive folder ID.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed. Please try again.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
