import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateSmartReplies = async (req: Request, res: Response) => {
  const { lastMessages, currentUserName, partnerName } = req.body;

  if (!lastMessages || lastMessages.length === 0) {
    return res.status(400).json({ success: false, error: 'No messages provided' });
  }

  try {
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

export const getAiAssistance = async (req: Request, res: Response) => {
    const { topic, context } = req.body;
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
            Context: ${context}
            User wants help with: ${topic}
            Provide a helpful, short advice or a template message for the user to use in a skill exchange platform.
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ success: true, data: response.text() });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
}
