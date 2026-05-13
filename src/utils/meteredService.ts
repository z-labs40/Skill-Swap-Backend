import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fetches ICE servers (TURN/STUN) from Metered.ca
 * This is used to ensure WebRTC calls work across all networks.
 */
export const getMeteredIceServers = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const domain = process.env.METERED_DOMAIN;
    const secretKey = process.env.METERED_SECRET_KEY;

    if (!domain || !secretKey) {
      console.warn('Metered.ca credentials not set. Using default STUN servers.');
      return resolve([{ urls: 'stun:stun.l.google.com:19302' }]);
    }

    const options = {
      hostname: domain,
      path: `/api/v1/turn/credentials?apiKey=${secretKey}`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          // Check if Metered returned an error object
          if (result.error) {
            console.error('Metered API Error:', result.error);
            return reject(new Error(result.error));
          }
          
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse Metered.ca response'));
        }
      });
    });

    req.on('error', (e) => {
      console.error('Error fetching Metered ICE servers:', e);
      reject(e);
    });

    req.end();
  });
};

export default getMeteredIceServers;
