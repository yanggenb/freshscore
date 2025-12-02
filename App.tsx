
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, LayoutDashboard, History, Leaf, AlertCircle, CheckCircle2, X, Settings, BookOpen } from 'lucide-react';
import { analyzeProduceImage } from './services/geminiService';
import { AnalysisOverlay } from './components/AnalysisOverlay';
import { StatsChart } from './components/StatsChart';
import { TechSpecsModal } from './components/TechSpecsModal';
import { AppMode, AnalysisResult, ProduceItem } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [selectedModel, setSelectedModel] = useState('flash');
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize some dummy history data for the demo
  useEffect(() => {
    // Check if we already have history, otherwise seed it
    if (history.length === 0) {
      const dummyHistory: AnalysisResult[] = [
        {
          timestamp: Date.now() - 100000,
          imageUrl: '',
          overallScore: 92,
          items: [
            { 
              id: '1', 
              name: 'Banana', 
              status: 'Fresh',
              ripeness_stage: 'Unripe', // Stage 1
              score: 98, 
              confidence: 0.99,
              box_2d: [100, 100, 500, 600], 
              visual_features: ['Uniform green color', 'Hard texture', 'Intact stem'],
              reasoning: 'Global Context indicates high integrity. Color histogram confirms Stage 1 (Unripe). High store-ability detected.',
              shelf_life_room: '1-2 weeks',
              shelf_life_fridge: '3 weeks',
              action: 'Store',
              defects: [],
              explainability: {
                defect_count: 0,
                surface_discoloration_percent: 0,
                primary_visual_cue: 'Uniform Green Chlorophyll'
              },
              color_distribution: { green_ratio: 0.95, yellow_ratio: 0.05, brown_ratio: 0, dominant_color: 'Green' },
              texture_metrics: { roughness_score: 5, pattern_irregularity: 2, surface_type: 'Smooth' }
            },
            { 
              id: '2', 
              name: 'Apple', 
              status: 'Fresh',
              ripeness_stage: 'Ripe', // Stage 3
              score: 94, 
              confidence: 0.97,
              box_2d: [150, 550, 420, 800],
              visual_features: ['Glossy surface', 'Uniform red'],
              reasoning: 'Attention heads focused on skin texture; no anomalies. Optimal ripeness level (Stage 3).',
              shelf_life_room: '1 week',
              shelf_life_fridge: '1 month',
              action: 'Sell',
              defects: [
                { type: 'Minor Scuff', severity: 'Low', center_2d: [30, 40] }
              ],
              explainability: {
                defect_count: 1,
                surface_discoloration_percent: 2,
                primary_visual_cue: 'High Gloss'
              },
              color_distribution: { green_ratio: 0.1, yellow_ratio: 0.1, brown_ratio: 0.0, dominant_color: 'Red' },
              texture_metrics: { roughness_score: 12, pattern_irregularity: 5, surface_type: 'Smooth' }
            }
          ]
        },
        {
          timestamp: Date.now() - 300000,
          imageUrl: '',
          overallScore: 45,
          items: [{ 
            id: '3', 
            name: 'Pear', 
            status: 'Rotten',
            ripeness_stage: 'Rotten', // Stage 5
            score: 15, 
            confidence: 0.94,
            visual_features: ['Deep brown patches', 'Mold traces'],
            reasoning: 'Severe oxidation and structural collapse detected by ViT patch embeddings. Classified as Stage 5 (Rotten).',
            shelf_life_room: '0 days',
            shelf_life_fridge: '0 days',
            action: 'Discard',
            defects: [
              { type: 'Rot Spot', severity: 'High', center_2d: [50, 50] },
              { type: 'Mold', severity: 'High', center_2d: [70, 60] }
            ],
            explainability: {
              defect_count: 2,
              surface_discoloration_percent: 45,
              primary_visual_cue: 'Oxidation/Mold'
            },
            color_distribution: { green_ratio: 0.2, yellow_ratio: 0.2, brown_ratio: 0.6, dominant_color: 'Brown' },
            texture_metrics: { roughness_score: 85, pattern_irregularity: 90, surface_type: 'Pitted' }
          }]
        }
      ];
      setHistory(dummyHistory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode === AppMode.CAMERA) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  const handleAnalysis = async (imgBase64: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const items = await analyzeProduceImage(imgBase64);
      
      const overallScore = items.length > 0
        ? Math.round(items.reduce((acc, item) => acc + item.score, 0) / items.length)
        : 0;

      const result: AnalysisResult = {
        timestamp: Date.now(),
        items,
        imageUrl: imgBase64,
        overallScore
      };

      setCurrentResult(result);
      setHistory(prev => [result, ...prev]);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg');
        setCurrentImage(imgData);
        // Pause camera preview (optional, effectively handled by switching view)
        handleAnalysis(imgData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentImage(result);
        setMode(AppMode.UPLOAD); // Ensure we are in upload view
        handleAnalysis(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetAnalysis = () => {
    setCurrentImage(null);
    setCurrentResult(null);
    setError(null);
    if (mode === AppMode.CAMERA) {
      startCamera();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)}>
            <div className="bg-green-600 p-2 rounded-lg text-white">
              <Leaf size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">FreshScore</h1>
              <p className="text-xs text-green-600 font-medium tracking-wide">ViT-POWERED QUALITY CONTROL</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg mr-2">
              {[
                { id: AppMode.DASHBOARD, icon: LayoutDashboard, label: 'Dash' },
                { id: AppMode.CAMERA, icon: Camera, label: 'Cam' },
                { id: AppMode.UPLOAD, icon: Upload, label: 'Upload' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    resetAnalysis();
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${mode === tab.id 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
            <button 
              onClick={() => setShowTechSpecs(true)}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Technical Showcase"
            >
              <BookOpen size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-900"><X size={18} /></button>
          </div>
        )}

        {/* Dashboard View */}
        {mode === AppMode.DASHBOARD && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-1">Total Scans</p>
                <p className="text-3xl font-bold text-gray-900">{history.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-1">Avg Quality Score</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(history.reduce((a, b) => a + b.overallScore, 0) / (history.length || 1))}
                  </p>
                  <p className="text-sm text-gray-400 mb-1">/ 100</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-1">Model Architecture</p>
                <div className="flex items-center gap-2 text-purple-600 mt-1">
                  <CheckCircle2 size={24} />
                  <span className="font-semibold">Vision Transformer</span>
                </div>
              </div>
            </div>

            <StatsChart history={history} />

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 text-center border border-green-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Assess?</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Use our ViT-powered vision system to grade produce freshness and ripeness instantly.</p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setMode(AppMode.CAMERA)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Camera size={20} />
                  Start Camera
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-semibold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <Upload size={20} />
                  Upload Image
                </button>
                {/* Hidden Input for dashboard shortcut */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Camera View */}
        {mode === AppMode.CAMERA && (
          <div className="max-w-4xl mx-auto">
            {!currentImage ? (
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20">
                   {/* Scanning Overlay UI */}
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-lg">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
                   </div>
                   <div className="absolute bottom-8 left-0 right-0 text-center">
                     <p className="text-white/80 text-sm font-medium bg-black/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
                       Align produce within frame
                     </p>
                   </div>
                </div>
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                  <button 
                    onClick={captureImage}
                    className="w-16 h-16 rounded-full bg-white border-4 border-green-500 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500"></div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Analyzing freshness with ViT...</p>
                  </div>
                ) : (
                  currentResult && (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold text-gray-800">Analysis Results</h2>
                         <button 
                          onClick={resetAnalysis} 
                          className="text-sm font-medium text-green-600 hover:text-green-700 underline"
                        >
                          Scan Another
                        </button>
                      </div>
                      <AnalysisOverlay 
                        imageUrl={currentImage} 
                        items={currentResult.items} 
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Upload View */}
        {mode === AppMode.UPLOAD && (
          <div className="max-w-4xl mx-auto">
             {!currentImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Click to upload image</h3>
                  <p className="text-gray-500">JPG, PNG supported</p>
                </div>
             ) : (
                <div className="space-y-6">
                 {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl shadow-sm border border-gray-100">
                      <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-500 font-medium">Analyzing freshness with ViT...</p>
                    </div>
                  ) : (
                    currentResult && (
                      <div className="animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-xl font-bold text-gray-800">Analysis Results</h2>
                           <button 
                            onClick={resetAnalysis} 
                            className="text-sm font-medium text-green-600 hover:text-green-700 underline"
                          >
                            Analyze Another
                          </button>
                        </div>
                        <AnalysisOverlay 
                          imageUrl={currentImage} 
                          items={currentResult.items} 
                        />
                      </div>
                    )
                  )}
                </div>
             )}
          </div>
        )}
      </main>

      {/* Tech Specs Modal */}
      {showTechSpecs && <TechSpecsModal onClose={() => setShowTechSpecs(false)} />}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings size={20} /> System Settings
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-3">AI Model Selection</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setSelectedModel('flash')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${selectedModel === 'flash' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {selectedModel === 'flash' && <CheckCircle2 size={16} className="absolute top-3 right-3 text-green-600" />}
                    <div className="font-bold text-gray-900 mb-1">Flash 2.5</div>
                    <div className="text-[10px] font-semibold text-yellow-600 mb-2 flex items-center gap-1">⚡ Fast & Efficient</div>
                    <p className="text-[10px] text-gray-500 leading-tight">Optimized for speed. Best for real-time mobile scanning.</p>
                  </button>

                  <button 
                    onClick={() => setSelectedModel('pro')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${selectedModel === 'pro' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {selectedModel === 'pro' && <CheckCircle2 size={16} className="absolute top-3 right-3 text-purple-600" />}
                    <div className="font-bold text-gray-900 mb-1">Pro 3.0</div>
                    <div className="text-[10px] font-semibold text-purple-600 mb-2 flex items-center gap-1">● High Reasoning</div>
                    <p className="text-[10px] text-gray-500 leading-tight">Advanced reasoning for subtle defect detection.</p>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
                  <AlertCircle size={16} /> Why not YOLOv10?
                </div>
                <div className="space-y-3">
                  <div>
                     <span className="text-xs font-bold text-blue-900 block">Detection vs. Understanding:</span>
                     <p className="text-[11px] text-blue-700 leading-relaxed">
                       Traditional models like YOLO are excellent at bounding box detection (finding <em>where</em> an apple is) but lack the semantic understanding to judge quality.
                     </p>
                  </div>
                  <div>
                     <span className="text-xs font-bold text-blue-900 block">Multimodal Vision:</span>
                     <p className="text-[11px] text-blue-700 leading-relaxed">
                       We use <strong>Gemini Multimodal LLMs</strong> because they can "reason" about visual data. They understand that specific skin textures, slight oxidation colors, and shape irregularities correlate with freshness, simulating a human inspector's judgment rather than just object counting.
                     </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowSettings(false)} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
