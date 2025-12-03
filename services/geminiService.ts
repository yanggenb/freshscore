import { GoogleGenAI, Type } from "@google/genai";
import { ProduceItem, TrainingExample } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// SPEED OPTIMIZATION:
// Reduced max width to 600px and quality to 0.7.
// This is the "Sweet Spot" - fast upload/processing but enough detail for the Vision Transformer.
const resizeImage = (base64Str: string, maxWidth = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // Lower quality slightly for speed
    };
    img.onerror = () => {
      resolve(base64Str); // Fallback
    }
  });
};

export const analyzeProduceImage = async (
  base64Image: string, 
  modelId: string = 'flash',
  feedbackHistory: TrainingExample[] = []
): Promise<ProduceItem[]> => {
  try {
    const optimizedImage = await resizeImage(base64Image);
    const cleanBase64 = optimizedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const modelName = 'gemini-2.5-flash';
    
    // Construct Learning Context
    let learningContext = "";
    if (feedbackHistory.length > 0) {
      const labelCorrections = feedbackHistory.filter(f => f.type === 'LABEL_CORRECTION');
      const scoreCorrections = feedbackHistory.filter(f => f.type === 'SCORE_CORRECTION');

      learningContext = `
      USER FEEDBACK MEMORY:
      - LABEL FIXES: ${labelCorrections.map(ex => `'${ex.originalLabel}'->'${ex.correctedLabel}'`).join(', ')}
      - SCORE FIXES: ${scoreCorrections.map(ex => `Score ${ex.originalScore}->${ex.correctedScore}`).join(', ')}
      `;
    }

    // SYSTEM PROMPT: CONCISE & FAST
    const systemInstruction = `
    You are a precision Optical Sorting Machine.
    ${learningContext}

    TASK: Detect produce with PIXEL-PERFECT Bounding Boxes.

    RULES:
    1. **SEPARATION:** If items touch, find the shadow line between them. Do not merge them.
    2. **BOUNDARIES:** Box must cover the FULL object. For Bananas, include the stem and tip.
    3. **LIFECYCLE SCORE (0-100):**
       - 100 = Unripe/Hard/Green (Max Shelf Life)
       - 50 = Ripe/Perfect (Eat Now)
       - 0 = Rotten/Mushy (Discard)

    OUTPUT JSON ONLY.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Fresh', 'Semi-fresh', 'Rotten'] },
              ripeness_stage: { type: Type.STRING, enum: ['Unripe', 'Semi-ripe', 'Ripe', 'Overripe', 'Rotten'] },
              score: { type: Type.INTEGER },
              confidence: { type: Type.NUMBER },
              box_2d: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER },
                description: "[ymin, xmin, ymax, xmax] 0-1000. EXACT EDGES."
              },
              reasoning: { type: Type.STRING },
              visual_features: { type: Type.ARRAY, items: { type: Type.STRING } },
              shelf_life_room: { type: Type.STRING },
              shelf_life_fridge: { type: Type.STRING },
              lighting_condition: { type: Type.STRING, enum: ['Good', 'Low'] },
              action: { type: Type.STRING, enum: ['Sell', 'Discount', 'Discard', 'Store'] },
              defects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    center_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                  }
                }
              },
              explainability: {
                type: Type.OBJECT,
                properties: {
                  surface_discoloration_percent: { type: Type.NUMBER },
                  defect_count: { type: Type.INTEGER },
                  primary_visual_cue: { type: Type.STRING }
                }
              },
              color_distribution: {
                type: Type.OBJECT,
                properties: {
                  green_ratio: { type: Type.NUMBER },
                  yellow_ratio: { type: Type.NUMBER },
                  brown_ratio: { type: Type.NUMBER },
                  dominant_color: { type: Type.STRING }
                }
              },
              texture_metrics: {
                type: Type.OBJECT,
                properties: {
                  roughness_score: { type: Type.NUMBER },
                  pattern_irregularity: { type: Type.NUMBER },
                  surface_type: { type: Type.STRING, enum: ['Smooth', 'Rough', 'Pitted', 'Wrinkled'] }
                }
              }
            },
            required: ["name", "status", "ripeness_stage", "score", "confidence", "reasoning", "action", "box_2d"]
          }
        }
      },
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Detect all produce items. Ensure strict separation of touching items."
          }
        ]
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawItems = JSON.parse(text) as any[];
    
    return rawItems.map((item, index) => {
      // POST-PROCESSING:
      // Minimal padding (1.5%) just to ensure we don't clip the very edge pixels.
      let [ymin, xmin, ymax, xmax] = item.box_2d || [0,0,100,100];
      
      const height = ymax - ymin;
      const width = xmax - xmin;
      const padY = height * 0.015; 
      const padX = width * 0.015;

      ymin = Math.max(0, ymin - padY);
      xmin = Math.max(0, xmin - padX);
      ymax = Math.min(1000, ymax + padY);
      xmax = Math.min(1000, xmax + padX);

      return {
        ...item,
        id: `item-${Date.now()}-${index}`,
        confidence: item.confidence || 0.95,
        visual_features: item.visual_features || [],
        box_2d: [ymin, xmin, ymax, xmax], 
        shelf_life_room: item.shelf_life_room || "N/A",
        shelf_life_fridge: item.shelf_life_fridge || "N/A",
        lighting_condition: item.lighting_condition || 'Good',
        action: item.action || 'Sell',
        ripeness_stage: item.ripeness_stage || 'Ripe',
        defects: item.defects || [],
        explainability: item.explainability || { surface_discoloration_percent: 0, defect_count: 0, primary_visual_cue: "Uniform texture" },
        color_distribution: item.color_distribution || { green_ratio: 0.5, yellow_ratio: 0.5, brown_ratio: 0, dominant_color: 'Mixed' },
        texture_metrics: item.texture_metrics || { roughness_score: 10, pattern_irregularity: 10, surface_type: 'Smooth' }
      };
    });

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Analysis failed. Please try again.");
  }
};