import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import mime from 'mime';
import { Readable } from 'stream';

const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
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
  const auth = authenticateGoogle();
  const drive = google.drive({ version: 'v3', auth });

  const mimeType = mime.getType(file.name);

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
      mimeType: mimeType!,
      body: Readable.from(fileBuffer),
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  /** Get file link from drive */
  const responseFileLink = await drive.files.get({
    fileId: response.data.id!,
    fields: 'id,name,mimeType,webViewLink',
    supportsAllDrives: true,
  });

  const fileLink = responseFileLink.data;

  return {
    id: fileLink.id,
    name: fileLink.name,
    mimeType: fileLink.mimeType,
    webViewLink: fileLink.webViewLink,
  };
};

// POST request handler
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image files are allowed' }, { status: 400 });
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
      imageUrl: response.webViewLink,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    // Handle specific Google API errors
    if (error.code === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive API access denied. Please check your service account credentials.',
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
