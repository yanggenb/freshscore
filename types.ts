
export type FreshnessStatus = 'Fresh' | 'Semi-fresh' | 'Rotten';
export type RipenessStage = 'Unripe' | 'Semi-ripe' | 'Ripe' | 'Overripe' | 'Rotten';

export interface Defect {
  type: string; // e.g. "Bruise", "Mold", "Discoloration"
  severity: 'Low' | 'Medium' | 'High';
  center_2d: [number, number]; // [y, x] relative to the bounding box (0-100)
}

export interface ExplainabilityMetrics {
  surface_discoloration_percent: number;
  defect_count: number;
  primary_visual_cue: string;
}

export interface ColorDistribution {
  green_ratio: number; // 0-1
  yellow_ratio: number; // 0-1
  brown_ratio: number; // 0-1
  dominant_color: string;
}

export interface TextureMetrics {
  roughness_score: number; // 0-100
  pattern_irregularity: number; // 0-100
  surface_type: 'Smooth' | 'Rough' | 'Pitted' | 'Wrinkled';
}

export interface UserFeedback {
  itemId: string;
  originalStatus: string;
  correctedStatus: string;
  originalScore: number;
  correctedScore: number;
  comments?: string;
  timestamp: number;
}

export interface ProduceItem {
  id: string;
  name: string;
  status: FreshnessStatus; // Overall commercial status
  ripeness_stage: RipenessStage; // Biological maturity (5 stages)
  score: number; // 0-100 Quality/Integrity Score
  confidence: number; // 0-1
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  reasoning: string; // Explanation for the score
  visual_features: string[]; // List of specific visual traits detected
  shelf_life_room?: string; // e.g. "3-5 days"
  shelf_life_fridge?: string; // e.g. "7-10 days"
  lighting_condition?: 'Good' | 'Low';
  action?: 'Sell' | 'Discount' | 'Discard' | 'Store'; // Store = for unripe items
  defects?: Defect[]; // For heatmap
  explainability?: ExplainabilityMetrics;
  
  // Advanced Features
  color_distribution?: ColorDistribution;
  texture_metrics?: TextureMetrics;
}

export interface AnalysisResult {
  timestamp: number;
  items: ProduceItem[];
  imageUrl: string;
  overallScore: number;
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY'
}
