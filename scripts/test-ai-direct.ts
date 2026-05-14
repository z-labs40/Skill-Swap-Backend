import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function directTest() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.error('API Key missing');

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    try {
        console.log('Testing with direct v1 URL...');
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hi" }] }]
        });
        console.log('✅ SUCCESS (v1):', response.data.candidates[0].content.parts[0].text);
    } catch (e: any) {
        console.error('❌ FAILED (v1):', e.response?.data || e.message);
        
        // Try v1beta
        const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        try {
            console.log('Testing with direct v1beta URL...');
            const response = await axios.post(urlBeta, {
                contents: [{ parts: [{ text: "Hi" }] }]
            });
            console.log('✅ SUCCESS (v1beta):', response.data.candidates[0].content.parts[0].text);
        } catch (e2: any) {
            console.error('❌ FAILED (v1beta):', e2.response?.data || e2.message);
        }
    }
}

directTest();
