import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export const generateSmartReplies = async (req: Request, res: Response) => {
  const { lastMessages, currentUserName, partnerName } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    console.error('[AI] GEMINI_API_KEY is missing in environment variables!');
    return res.status(500).json({ success: false, error: 'AI Service configuration missing' });
  }

  if (!lastMessages || lastMessages.length === 0) {
    return res.status(400).json({ success: false, error: 'No messages provided' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an AI assistant for SkillBridge, a peer-to-peer skill exchange platform.
      Based on the recent chat history between ${currentUserName} and ${partnerName}, suggest 3 short, helpful, and friendly replies for ${currentUserName}.
      Keep the replies natural and context-aware. If they are talking about learning a skill, suggest relevant follow-ups.
      
      Recent chat:
      ${lastMessages.map((m: any) => `${m.senderName}: ${m.text}`).join('\n')}
      
      Return ONLY a JSON array of 3 strings. Example: ["That sounds great!", "What time works for you?", "I'd love to learn that!"]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON array if AI adds markdown
    const jsonMatch = text.match(/\[.*\]/s);
    const replies = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.json({ success: true, data: replies });
  } catch (error: any) {
    console.error('Gemini Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate replies' });
  }
};

export const chatWithAi = async (req: Request, res: Response) => {
    const { message, history } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
        console.error('[AI] GEMINI_API_KEY is missing in environment variables!');
        return res.status(500).json({ success: false, error: 'AI Service configuration missing' });
    }

    if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        // Prepare context for the AI
        const prompt = `
            You are the SkillBridge Personal AI Assistant. 
            User is asking from their dashboard.
            Help them with platform features, skill exchange advice, or general learning tips.
            Keep it friendly, helpful, and concise.
            
            Chat History:
            ${history?.map((m: any) => `${m.role}: ${m.content}`).join('\n')}
            
            User Message: ${message}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text();

        res.json({ success: true, data: aiResponse });
    } catch (error: any) {
        console.error('Dashboard AI Error:', error);
        res.status(500).json({ success: false, error: 'AI Assistant is currently unavailable' });
    }
}
