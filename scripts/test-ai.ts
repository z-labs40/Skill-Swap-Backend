import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function finalTest() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.error('API Key missing');
    
    console.log('Testing gemini-2.0-flash...');
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent("Hi");
        console.log('✅ SUCCESS:', result.response.text());
    } catch (e: any) {
        console.error('❌ FAILED:', e.message);
    }
}

finalTest();
