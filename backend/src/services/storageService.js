const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

let storageClient = null;

function getSupabaseClient() {
  if (!storageClient) {
    storageClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return storageClient;
}

async function uploadPDF(buffer, filename, folder = 'documents') {
  const provider = process.env.STORAGE_PROVIDER || 'supabase';

  if (provider === 's3') {
    return uploadToS3(buffer, filename, folder);
  }
  return uploadToSupabase(buffer, filename, folder);
}

async function uploadToSupabase(buffer, filename, folder) {
  const supabase = getSupabaseClient();
  const path = `${folder}/${filename}`;

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'champ-documents')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'champ-documents')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function uploadToS3(buffer, filename, folder) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ca-central-1',
  });

  const key = `${folder}/${filename}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  };

  await s3.upload(params).promise();
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Fallback: return base64 data URL when no storage is configured
async function uploadPDFSafe(buffer, filename, folder = 'documents') {
  try {
    if (!process.env.SUPABASE_URL && !process.env.AWS_S3_BUCKET) {
      return `data:application/pdf;base64,${buffer.toString('base64')}`;
    }
    return await uploadPDF(buffer, filename, folder);
  } catch (err) {
    console.error('Storage upload failed, returning base64:', err.message);
    return `data:application/pdf;base64,${buffer.toString('base64')}`;
  }
}

module.exports = { uploadPDF: uploadPDFSafe };
