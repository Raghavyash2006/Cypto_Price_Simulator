function mockUploadResult(fileName = 'asset') {
  return {
    mode: 'mock',
    provider: 'cloudinary',
    publicId: `${fileName}-${Date.now()}`,
    secureUrl: `https://res.cloudinary.com/mock/${fileName}`
  };
}

export async function uploadAsset({ filePath, folder = 'crypto-simulator' } = {}) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return mockUploadResult(folder);
  }

  return {
    mode: 'live',
    provider: 'cloudinary',
    filePath,
    folder,
    publicId: 'replace-with-cloudinary-upload',
    secureUrl: 'replace-with-cloudinary-upload-url'
  };
}
