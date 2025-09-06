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
