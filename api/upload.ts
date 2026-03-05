import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  try {
    const { image } = req.body; // Expecting { image: "base64string..." }

    if (!image) {
        return res.status(400).json({ error: 'No image provided' });
    }

    // ImgBB accepts base64 string in 'image' parameter
    const params = new URLSearchParams();
    params.append('image', image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: params,
    });

    const data = await response.json();

    if (data.success) {
      return res.status(200).json(data);
    } else {
      return res.status(400).json(data);
    }
  } catch (error: any) {
    console.error('ImgBB Upload Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
