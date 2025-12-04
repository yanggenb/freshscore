import os
import base64
import json
from PIL import Image
import google.generativeai as genai

# Configuration
API_KEY = os.getenv("API_KEY")
MODEL_NAME = "gemini-2.5-flash"

class FreshScoreEngine:
    def __init__(self, model_version="flash-v2.5"):
        self.model_version = model_version
        genai.configure(api_key=API_KEY)
        self.model = genai.GenerativeModel(MODEL_NAME)
        
        # The exact same System Prompt logic as in the frontend
        self.system_prompt = """
        You are a precision Optical Sorting Machine.
        TASK: Detect produce with PIXEL-PERFECT Bounding Boxes.
        RULES:
        1. SEPARATION: Use Shadow Valley Logic.
        2. LIFECYCLE SCORE: 0 (Rotten) to 100 (Unripe).
        """

    def preprocess(self, image_path, max_size=600):
        """
        Resize image to optimize token usage (ViT Patching).
        """
        with Image.open(image_path) as img:
            img.thumbnail((max_size, max_size))
            return img

    def predict(self, image_path):
        """
        Main inference entry point.
        """
        img = self.preprocess(image_path)
        
        response = self.model.generate_content(
            [self.system_prompt, img],
            generation_config={"response_mime_type": "application/json"}
        )
        
        return self._parse_response(response.text)

    def _parse_response(self, raw_json):
        try:
            data = json.loads(raw_json)
            # Post-processing: Caliper Logic Expansion
            processed = []
            for item in data:
                bbox = item.get('box_2d', [0,0,0,0])
                # Apply 1.5% padding (Caliper Mode)
                item['box_2d'] = self._apply_padding(bbox)
                processed.append(item)
            return processed
        except Exception as e:
            print(f"Parser Error: {e}")
            return []

    
    def _apply_padding(self, box):
        # Visual Caliper Mode Implementation
        # Matches frontend logic in services/geminiService.ts
        ymin, xmin, ymax, xmax = box
        h, w = ymax - ymin, xmax - xmin
        
        # 1.5% Padding constant derived from Fresh-500 Validation
        pad = 0.015 
        
        return [
            max(0, ymin - h*pad), 
            max(0, xmin - w*pad),
            min(1000, ymax + h*pad), 
            min(1000, xmax + w*pad)
        ]