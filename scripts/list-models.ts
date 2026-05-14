import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.error('API Key missing');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        console.log('Fetching available models list...');
        const response = await axios.get(url);
        console.log('Available Models:');
        response.data.models.forEach((m: any) => {
            console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods.join(', ')})`);
        });
    } catch (e: any) {
        console.error('❌ FAILED to list models:', e.response?.data || e.message);
    }
}

listModels();
