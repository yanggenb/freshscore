
import { GoogleGenAI, Type } from "@google/genai";
import { ProduceItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProduceImage = async (base64Image: string): Promise<ProduceItem[]> => {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `You are FreshScore AI, a sophisticated Computer Vision pipeline simulating Vision Transformer (ViT) analysis for industrial quality control.

            *** CRITICAL OBJECTIVE: HIGH-PRECISION LOCALIZATION ***
            The user requires PIXEL-PERFECT bounding boxes.
            1. **Coordinate System**: 0 to 1000 (Normalized).
            2. **Format**: [ymin, xmin, ymax, xmax].
            3. **Tightness**: Boxes must HUG the produce edges strictly. 
               - EXCLUDE shadows.
               - EXCLUDE stems if they extend significantly away from the body.
               - EXCLUDE the surface/plate.
            4. **Separation**: Distinctly separate touching items (simulate NMS - Non-Maximum Suppression).

            EXECUTION PIPELINE:
            1. **PRE-PROCESSING**: Simulate Auto-White Balance and Gamma Correction to neutralize lighting.
            2. **DETECTION (ViT-Based)**: 
               - Use attention maps to find object centroids.
               - Regress tight bounding boxes [ymin, xmin, ymax, xmax].
            3. **FEATURE EXTRACTION**: 
               - **Color Analysis**: Extract HSV/Lab color histograms (Green/Yellow/Brown ratios).
               - **Texture Analysis**: Simulate LBP (Local Binary Patterns) to detect wrinkles, pits, or mold fuzz.
            4. **CLASSIFICATION**: Combine features to determine Ripeness and Quality.

            CRITICAL LOGIC - 5-STAGE RIPENESS & QUALITY:
            
            1. **RIPENESS STAGE (Biological Clock)**:
               - **Unripe**: Green dominant (>80%). Action: Store.
               - **Semi-ripe**: Green fading to Yellow. Action: Store/Sell.
               - **Ripe**: Yellow/Red dominant. Peak texture. Action: Sell.
               - **Overripe**: Brown spots appearing (>20% brown). Action: Discount.
               - **Rotten**: Structural failure, visible mold, >50% brown/black. Action: Discard.

            2. **QUALITY SCORE (0-100)**: Measures INTEGRITY. Unripe items can have 100 Quality.

            OUTPUT JSON ARRAY:
            - **name**: Generic category (e.g. "Apple", "Banana", "Tomato").
            - **score**: 0-100 Quality.
            - **status**: Fresh/Semi-fresh/Rotten.
            - **ripeness_stage**: Unripe/Semi-ripe/Ripe/Overripe/Rotten.
            - **box_2d**: [ymin, xmin, ymax, xmax] (0-1000). PRECISE.
            - **reasoning**: Technical explanation (e.g., "High LBP roughness score detected").
            - **visual_features**: Specific tokens.
            - **shelf_life_room/fridge**: Estimates.
            - **lighting_condition**: "Good" or "Low".
            - **action**: Sell/Discount/Discard/Store.
            - **defects**: Array of defects with coordinates.
            - **explainability**: Metrics.
            - **color_distribution**: { green_ratio (0-1), yellow_ratio (0-1), brown_ratio (0-1), dominant_color }.
            - **texture_metrics**: { roughness_score (0-100), pattern_irregularity (0-100), surface_type: "Smooth"|"Rough"|"Pitted"|"Wrinkled" }.`
          }
        ]
      },
      config: {
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
                description: "ymin, xmin, ymax, xmax in 0-1000 scale"
              },
              reasoning: { type: Type.STRING },
              visual_features: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
              },
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
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawItems = JSON.parse(text) as any[];
    
    return rawItems.map((item, index) => ({
      ...item,
      id: `item-${Date.now()}-${index}`,
      confidence: item.confidence || 0.95,
      visual_features: item.visual_features || [],
      // Ensure box is valid 4 numbers
      box_2d: (item.box_2d && item.box_2d.length === 4) ? item.box_2d : [0,0,100,100], 
      shelf_life_room: item.shelf_life_room || "N/A",
      shelf_life_fridge: item.shelf_life_fridge || "N/A",
      lighting_condition: item.lighting_condition || 'Good',
      action: item.action || 'Sell',
      ripeness_stage: item.ripeness_stage || 'Ripe',
      defects: item.defects || [],
      explainability: item.explainability || { surface_discoloration_percent: 0, defect_count: 0, primary_visual_cue: "Uniform texture" },
      color_distribution: item.color_distribution || { green_ratio: 0.5, yellow_ratio: 0.5, brown_ratio: 0, dominant_color: 'Mixed' },
      texture_metrics: item.texture_metrics || { roughness_score: 10, pattern_irregularity: 10, surface_type: 'Smooth' }
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Analysis failed. Please try again.");
  }
};
