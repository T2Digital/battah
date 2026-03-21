import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (!serviceAccountStr) {
        return res.status(500).json({ 
          error: 'FIREBASE_SERVICE_ACCOUNT is not set in Vercel Environment Variables.' 
        });
      }

      let serviceAccount;
      try {
        // Try parsing normally
        serviceAccount = JSON.parse(serviceAccountStr);
      } catch (e) {
        // If it fails, Vercel might have escaped the newlines in the private key
        try {
          serviceAccount = JSON.parse(serviceAccountStr.replace(/\\n/g, '\n'));
        } catch (e2) {
          return res.status(500).json({ 
            error: 'Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Please ensure it is valid JSON.' 
          });
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing required fields (title, body)' });
    }

    const db = admin.firestore();
    const tokensSnapshot = await db.collection('device_tokens').get();
    
    const tokens: string[] = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No tokens found to send to.' });
    }

    const message = {
      notification: {
        title,
        body
      },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Clean up invalid tokens
    const tokensToRemove: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      const batch = db.batch();
      tokensSnapshot.docs.forEach(doc => {
        if (tokensToRemove.includes(doc.data().token)) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    }

    return res.status(200).json({ 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount,
      removedTokens: tokensToRemove.length
    });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
