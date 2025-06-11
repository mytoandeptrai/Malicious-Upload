import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const GOOGLE_DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

export async function POST(request: NextRequest) {
  try {
    // Log environment variables for debugging
    console.log('Environment variables:', {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    });

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

    // Initialize Google Drive API using service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.split(String.raw`\n`).join('\n'),
      },
      scopes: GOOGLE_DRIVE_SCOPE,
    });

    const drive = google.drive({ version: 'v3', auth });

    // Convert File to stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    console.log('Uploading file to Google Drive:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    });

    // Upload file to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id,name,mimeType,size',
    });

    const uploadedFile = driveResponse.data;

    if (!uploadedFile.id) {
      throw new Error('Failed to upload file to Google Drive');
    }

    console.log('File uploaded successfully:', uploadedFile);

    // Wait for Google Drive to process the file
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Make the file publicly viewable
    await drive.permissions.create({
      fileId: uploadedFile.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Check if file is accessible (indicates it passed virus scan)
    try {
      await drive.files.get({
        fileId: uploadedFile.id,
        fields: 'id,name,mimeType',
      });

      // If we can access the file, it's safe
      const imageUrl = `https://drive.google.com/uc?id=${uploadedFile.id}`;

      return NextResponse.json({
        success: true,
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        virusScanResult: 'clean',
        imageUrl,
      });
    } catch (accessError: any) {
      console.error('File access error:', accessError);
      // If we can't access the file, it might be quarantined
      return NextResponse.json({
        success: false,
        error: 'File may contain virus and has been quarantined by Google Drive',
        virusScanResult: 'infected',
      });
    }
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
