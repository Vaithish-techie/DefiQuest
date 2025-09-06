from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY", "")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to your frontend URL in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuizRequest(BaseModel):
    topic: str
    num_questions: int = 5

class AnalyzeRequest(BaseModel):
    user_id: str
    actions: list = []

@app.post("/analyze")
async def analyze_user_progress(req: AnalyzeRequest):
    try:
        # Generate AI feedback based on user actions
        completed_quests = len(req.actions)
        
        if completed_quests == 0:
            return {"ai_feedback": "Welcome to DeFiQuest! Start your learning journey by completing your first quest."}
        elif completed_quests < 3:
            return {"ai_feedback": f"Great start! You've completed {completed_quests} quest(s). Keep building your DeFi knowledge foundation."}
        elif completed_quests < 5:
            return {"ai_feedback": f"Excellent progress! With {completed_quests} quests completed, you're becoming a DeFi enthusiast. Consider exploring advanced topics."}
        else:
            return {"ai_feedback": f"Outstanding achievement! You've mastered {completed_quests} quests. You're well on your way to becoming a DeFi expert!"}
            
    except Exception as e:
        return {"ai_feedback": "AI analysis temporarily unavailable. Keep up the great work!"}
    
@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    try:
        prompt = f"""
        Generate {req.num_questions} multiple-choice questions on '{req.topic}' for DeFi beginners.
        Format:
        [
          {{
            "question": "...",
            "choices": ["...", "...", "...", "..."],
            "correct_index": 0
          }},
          ...
        ]
        """
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json",
        }
        json_payload = {
            "prompt": prompt,
            "model": "perplexity-1",
        }
        resp = requests.post("https://api.perplexity.ai/v1/complete", json=json_payload, headers=headers)
        resp.raise_for_status()
        import json as js
        import re
        data = resp.json()
        match = re.search(r"\[.*\]", data.get("text", ""), re.DOTALL)
        quiz_json = js.loads(match.group(0)) if match else []
        return {"success": True, "questions": quiz_json}
    except Exception as e:
        return {"success": False, "error": str(e)}
