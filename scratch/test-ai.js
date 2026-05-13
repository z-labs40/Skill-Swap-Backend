const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAI() {
  const key = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

  try {
    const result = await model.generateContent('Say hello!');
    console.log('Gemini 2.5 Response:', result.response.text());
  } catch (err) {
    console.error('TEST FAILED:', err.message);
  }
}

testAI();
