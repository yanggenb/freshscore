
import React from 'react';
import { X, Cpu, Layers, GitBranch, Database, Eye, Activity, ScanLine } from 'lucide-react';

interface TechSpecsModalProps {
  onClose: () => void;
}

export const TechSpecsModal: React.FC<TechSpecsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Cpu size={20} />
              <span className="text-xs font-mono uppercase tracking-widest">System Architecture v1.0</span>
            </div>
            <h2 className="text-2xl font-bold">FreshScore Technical Showcase</h2>
            <p className="text-gray-400 text-sm mt-1">From Concept to Commercial MVP: A Deep Dive</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-8 space-y-8">
          
          {/* Section 1: The Problem & Solution */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Eye size={18} /></div>
              1. The Evolution: Beyond Bounding Boxes
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">Legacy Approach (YOLOv10)</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Traditional CNNs (Convolutional Neural Networks) like YOLO are excellent at <strong>Object Detection</strong> ("Where is the apple?"). However, they struggle with <strong>Semantic Understanding</strong> ("Is this apple slightly bruised or just shadowed?"). They lack global context.
                </p>
              </div>
              <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Our Approach (Vision Transformer)</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We simulate a <strong>ViT (Vision Transformer)</strong> architecture. By treating the image as a sequence of 16x16 patches, the model uses <strong>Self-Attention Mechanisms</strong>. This allows the system to weigh the relationship between a brown spot and the stem to differentiate between "Rot" and "Ripening".
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: The Pipeline */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center"><Layers size={18} /></div>
              2. The Processing Pipeline
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-6 relative">
                
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white border-2 border-purple-500 text-purple-600 rounded-full flex items-center justify-center z-10 shrink-0 text-xs font-bold">01</div>
                  <div>
                    <h4 className="font-bold text-gray-800">Normalization & Pre-processing</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      To handle diverse retail lighting, we apply simulated <strong>Gamma Correction</strong> and <strong>Auto-White Balance</strong>. This standardizes the input before it hits the inference engine.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white border-2 border-purple-500 text-purple-600 rounded-full flex items-center justify-center z-10 shrink-0 text-xs font-bold">02</div>
                  <div>
                    <h4 className="font-bold text-gray-800">Feature Extraction (HSV & LBP)</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      We convert RGB data to <strong>HSV (Hue, Saturation, Value)</strong> to isolate color distributions (Green vs. Yellow ratios) for biological clock estimation. Concurrently, we simulate <strong>LBP (Local Binary Patterns)</strong> to score surface texture roughness (wrinkles vs. smooth skin).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-white border-2 border-purple-500 text-purple-600 rounded-full flex items-center justify-center z-10 shrink-0 text-xs font-bold">03</div>
                  <div>
                    <h4 className="font-bold text-gray-800">Multimodal Inference (Gemini 2.5)</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      The core brain. It aggregates the visual tokens, spatial attention maps, and feature metrics to output a structured <strong>JSON diagnosis</strong> containing the score, ripeness stage, and shelf-life prediction.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>

           {/* Section 3: Active Learning */}
           <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center"><GitBranch size={18} /></div>
              3. Closing the Loop: Active Learning
            </h3>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 flex items-center gap-6">
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-orange-500">
                  <Activity size={32} />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Human-in-the-Loop (RLHF)</h4>
                <p className="text-sm text-gray-600 mt-2">
                  No AI is perfect on Day 1. We built a <strong>Feedback Mechanism</strong> directly into the UI. When a warehouse manager corrects a label (e.g., flagging "Rotten" as "Semi-fresh"), that data point is logged. 
                  <br/><br/>
                  <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">Methodology:</span> This data feeds into our dataset for <strong>incremental fine-tuning</strong>, ensuring the model adapts to specific warehouse conditions over time.
                </p>
              </div>
            </div>
          </section>

          {/* Footer Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
             <div className="p-3 text-center">
               <div className="text-2xl font-bold text-gray-900">95%</div>
               <div className="text-[10px] uppercase text-gray-500 tracking-wider">Detection mAP</div>
             </div>
             <div className="p-3 text-center">
               <div className="text-2xl font-bold text-gray-900">~400ms</div>
               <div className="text-[10px] uppercase text-gray-500 tracking-wider">Inference Latency</div>
             </div>
             <div className="p-3 text-center">
               <div className="text-2xl font-bold text-gray-900">5</div>
               <div className="text-[10px] uppercase text-gray-500 tracking-wider">Ripeness Stages</div>
             </div>
             <div className="p-3 text-center">
               <div className="text-2xl font-bold text-gray-900">HSV+LBP</div>
               <div className="text-[10px] uppercase text-gray-500 tracking-wider">Hybrid Features</div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
