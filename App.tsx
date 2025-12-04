import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, LayoutDashboard, Leaf, AlertCircle, CheckCircle2, X, Settings, BookOpen, Lightbulb, ArrowRight, Utensils, CalendarClock, Trash2, Check, ArrowUp, ArrowDown, Save, Skull, Info, Edit2, Hourglass, Star, ChefHat, Store, ShoppingCart, Percent, Archive, Briefcase, User, Factory, ScanLine, Layers, TrendingUp, PackageSearch, ScanBarcode, BarChart4, BrainCircuit } from 'lucide-react';
import { analyzeProduceImage } from './services/geminiService';
import { AnalysisOverlay } from './components/AnalysisOverlay';
import { TechSpecsModal } from './components/TechSpecsModal';
import { AppMode, AnalysisResult, TrainingExample, FoodPlanItem, FoodPlan, UserRole, PlanType } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [userRole, setUserRole] = useState<UserRole>('PERSONAL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [selectedModel, setSelectedModel] = useState('flash');
  
  // ACTIVE LEARNING STATE (The "Brain")
  const [learningHistory, setLearningHistory] = useState<TrainingExample[]>([]);
  
  // FOOD PLAN STATE (Multi-plan)
  const [foodPlans, setFoodPlans] = useState<FoodPlan[]>([]);
  
  // SAVE DIALOG STATE
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingItems, setPendingItems] = useState<FoodPlanItem[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // EDITING STATE
  const [editingPlanTitleId, setEditingPlanTitleId] = useState<string | null>(null);
  const [editingItemNameId, setEditingItemNameId] = useState<string | null>(null); // format: "planId-itemId"
  const [tempEditValue, setTempEditValue] = useState('');

  // TOOLTIP STATE
  const [tooltipData, setTooltipData] = useState<{x: number, y: number, content: string} | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brightnessInterval = useRef<number | null>(null);

  // New State for Low Light Warning
  const [isTooDark, setIsTooDark] = useState(false);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    const savedPlans = localStorage.getItem('freshscore_plans');
    if (savedPlans) {
      try {
        setFoodPlans(JSON.parse(savedPlans));
      } catch (e) { console.error("Failed to load plans", e); }
    }

    const savedLearning = localStorage.getItem('freshscore_learning');
    if (savedLearning) {
      try {
        setLearningHistory(JSON.parse(savedLearning));
      } catch (e) { console.error("Failed to load learning history", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('freshscore_plans', JSON.stringify(foodPlans));
  }, [foodPlans]);

  useEffect(() => {
    localStorage.setItem('freshscore_learning', JSON.stringify(learningHistory));
  }, [learningHistory]);

  // Monitor Light Levels
  const checkBrightness = () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64; 
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 64, 64);
    const imageData = ctx.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    let avg, colorSum = 0;
    for (let x = 0, len = data.length; x < len; x += 4) {
        colorSum += Math.floor((data[x] + data[x+1] + data[x+2]) / 3);
    }
    const brightness = Math.floor(colorSum / (64 * 64));
    setIsTooDark(brightness < 30);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (brightnessInterval.current) {
      window.clearInterval(brightnessInterval.current);
      brightnessInterval.current = null;
    }
    setIsTooDark(false);
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
      brightnessInterval.current = window.setInterval(checkBrightness, 500);
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
      const items = await analyzeProduceImage(imgBase64, selectedModel, learningHistory);
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
        setMode(AppMode.UPLOAD);
        handleAnalysis(result);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerNewUpload = () => {
    fileInputRef.current?.click();
  };

  const resetAnalysis = () => {
    setCurrentImage(null);
    setCurrentResult(null);
    setError(null);
    if (mode === AppMode.CAMERA) {
      startCamera();
    }
  };

  const onUserCorrection = (itemId: string, correctionType: 'LABEL' | 'SCORE', value: string | number) => {
    if (!currentResult) return;
    const item = currentResult.items.find(i => i.id === itemId);
    if (!item) return;

    if (correctionType === 'LABEL') {
      const newExample: TrainingExample = {
        id: Date.now().toString(),
        type: 'LABEL_CORRECTION',
        originalLabel: item.name,
        correctedLabel: value as string,
        visualContext: `Confidence: ${item.confidence}, Features: ${item.visual_features.join(', ')}`,
        timestamp: Date.now()
      };
      setLearningHistory(prev => [...prev, newExample]);
      
      setCurrentResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(i => i.id === itemId ? { ...i, name: value as string, reasoning: `${i.reasoning} (User corrected Label)` } : i)
        };
      });
      alert(`[Active Learning] Correction Saved! Next scan incorporates ${item.name} -> ${value} label fix. (Total ${learningHistory.length + 1} examples)`);

    } else if (correctionType === 'SCORE') {
      const newExample: TrainingExample = {
        id: Date.now().toString(),
        type: 'SCORE_CORRECTION',
        originalScore: item.score,
        correctedScore: value as number,
        visualContext: `Confidence: ${item.confidence}, Features: ${item.visual_features.join(', ')}`,
        timestamp: Date.now()
      };
      setLearningHistory(prev => [...prev, newExample]);

      setCurrentResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(i => i.id === itemId ? { ...i, score: value as number, reasoning: `${i.reasoning} (User corrected Score)` } : i)
        };
      });
       alert(`[Active Learning] Calibration Saved! Next scan incorporates score correction for ${item.name}. (Total ${learningHistory.length + 1} examples)`);
    }
  };

  // --- FOOD PLAN LOGIC ---

  const prepareFoodPlanSave = () => {
    if (!currentResult) return;

    const items: FoodPlanItem[] = currentResult.items.map(item => {
      let priority: 'DISCARD' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
      let consumptionAdvice = '';
      
      if (userRole === 'PERSONAL') {
        // --- PERSONAL LOGIC ---
        if (item.score < 25) {
          priority = 'DISCARD';
          consumptionAdvice = 'Rotten • Discard immediately';
        } else if (item.score < 45) {
          priority = 'URGENT';
          consumptionAdvice = 'Overripe • Use today (Smoothie/Bake)';
        } else if (item.score < 70) {
          priority = 'HIGH';
          consumptionAdvice = 'Peak Quality • Enjoy raw now';
        } else if (item.score < 90) {
          priority = 'MEDIUM';
          consumptionAdvice = 'Semi-ripe • Ready in 2-3 days';
        } else {
          priority = 'LOW';
          consumptionAdvice = 'Unripe • Store (Good shelf life)';
        }
      } else {
        // --- BUSINESS / WAREHOUSE LOGIC ---
        if (item.score < 25) {
          priority = 'DISCARD';
          consumptionAdvice = 'Write-off / Compost';
        } else if (item.score < 45) {
          priority = 'URGENT'; // Clearance
          consumptionAdvice = 'Markdown 50% (Flash Sale)';
        } else if (item.score < 70) {
          priority = 'HIGH'; // Prime
          consumptionAdvice = 'Premium Display (Best Price)';
        } else if (item.score < 90) {
          priority = 'MEDIUM'; // Stock
          consumptionAdvice = 'Stock on Shelves';
        } else {
          priority = 'LOW'; // Storage
          consumptionAdvice = 'Backroom Inventory (Hold)';
        }
      }

      return {
        ...item,
        priority,
        consumptionAdvice,
        fullAdvice: item.reasoning
      };
    });

    setPendingItems(items);
    
    // Default Title logic
    const dateStr = new Date().toLocaleDateString();
    setNewPlanName(userRole === 'PERSONAL' 
      ? `Fridge Scan ${dateStr}` 
      : `Warehouse Audit ${dateStr}`);
      
    // Filter existing plans by current role type for the "Add to existing" dropdown
    const relevantPlans = foodPlans.filter(p => p.type === (userRole === 'PERSONAL' ? 'CONSUMPTION' : 'SALES'));
    setSelectedPlanId(relevantPlans.length > 0 ? relevantPlans[0].id : 'new');
    
    setShowSaveDialog(true);
  };

  const confirmSavePlan = () => {
    const currentPlanType: PlanType = userRole === 'PERSONAL' ? 'CONSUMPTION' : 'SALES';

    if (selectedPlanId === 'new') {
      const newPlan: FoodPlan = {
        id: Date.now().toString(),
        title: newPlanName || (userRole === 'PERSONAL' ? 'Untitled Plan' : 'Untitled Strategy'),
        type: currentPlanType,
        createdAt: Date.now(),
        items: pendingItems.sort((a, b) => a.score - b.score)
      };
      setFoodPlans(prev => [newPlan, ...prev]);
    } else {
      setFoodPlans(prev => prev.map(plan => {
        if (plan.id === selectedPlanId) {
          const mergedItems = [...pendingItems, ...plan.items];
          // Re-sort by score (urgency)
          mergedItems.sort((a, b) => a.score - b.score);
          return {
            ...plan,
            items: mergedItems
          };
        }
        return plan;
      }));
    }
    setShowSaveDialog(false);
    setMode(AppMode.DASHBOARD);
  };

  const deletePlan = (planId: string) => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      setFoodPlans(prev => prev.filter(p => p.id !== planId));
    }
  };

  const movePlan = (index: number, direction: 'up' | 'down', displayList: FoodPlan[]) => {
    // We need to move it in the main 'foodPlans' array, but the index comes from the filtered display list.
    // 1. Find the plan in the display list
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === displayList.length - 1) return;

    const planToMove = displayList[index];
    const swapTargetPlan = direction === 'up' ? displayList[index - 1] : displayList[index + 1];

    // 2. Find their actual indices in the master list
    setFoodPlans(prev => {
      const newPlans = [...prev];
      const idx1 = newPlans.findIndex(p => p.id === planToMove.id);
      const idx2 = newPlans.findIndex(p => p.id === swapTargetPlan.id);
      
      if (idx1 !== -1 && idx2 !== -1) {
         [newPlans[idx1], newPlans[idx2]] = [newPlans[idx2], newPlans[idx1]];
      }
      return newPlans;
    });
  };

  const renamePlan = (planId: string, newTitle: string) => {
    setFoodPlans(prev => prev.map(p => p.id === planId ? { ...p, title: newTitle } : p));
    setEditingPlanTitleId(null);
  };

  const removeFoodPlanItem = (planId: string, itemId: string) => {
    setFoodPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return { ...p, items: p.items.filter(i => i.id !== itemId) };
      }
      return p;
    }));
  };

  const renameFoodPlanItem = (planId: string, itemId: string, newName: string) => {
    setFoodPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return { 
          ...p, 
          items: p.items.map(i => i.id === itemId ? { ...i, name: newName } : i)
        };
      }
      return p;
    }));
    setEditingItemNameId(null);
  };

  const handleTooltip = (e: React.MouseEvent, content: string) => {
    setTooltipData({
      x: e.clientX,
      y: e.clientY,
      content
    });
  };

  // Filter plans based on Role
  const visiblePlans = foodPlans.filter(p => 
    userRole === 'PERSONAL' ? p.type === 'CONSUMPTION' : p.type === 'SALES'
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)}>
            <div className={`p-2 rounded-lg text-white transition-colors ${userRole === 'PERSONAL' ? 'bg-green-600' : 'bg-blue-600'}`}>
              {userRole === 'PERSONAL' ? <Leaf size={24} /> : <Factory size={24} />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">FreshScore</h1>
              <p className={`text-xs font-medium tracking-wide transition-colors ${userRole === 'PERSONAL' ? 'text-green-600' : 'text-blue-600'}`}>
                {userRole === 'PERSONAL' ? 'SMART FOOD MANAGEMENT' : 'COMMERCIAL QUALITY CONTROL'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            
            {/* ROLE SWITCHER */}
            {mode === AppMode.DASHBOARD && (
              <div className="flex bg-gray-100 p-1 rounded-lg mr-4 border border-gray-200">
                 <button
                   onClick={() => setUserRole('PERSONAL')}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${userRole === 'PERSONAL' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   <User size={14} /> Personal
                 </button>
                 <button
                   onClick={() => setUserRole('BUSINESS')}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${userRole === 'BUSINESS' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   <Briefcase size={14} /> Business
                 </button>
              </div>
            )}

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
            
            {/* 1. DYNAMIC ROADMAP MODULE (How it works) - UPGRADED FANCY VERSION */}
            <div className={`rounded-3xl p-8 shadow-xl border border-white/50 relative overflow-hidden transition-all duration-500 ${userRole === 'PERSONAL' ? 'bg-gradient-to-br from-green-50/50 via-slate-50 to-emerald-50/30' : 'bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/30'}`}>
               
               {/* Decorative Background Elements */}
               <div className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-500 ${userRole === 'PERSONAL' ? 'bg-green-300' : 'bg-blue-300'}`}></div>
               <div className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30 transition-colors duration-500 ${userRole === 'PERSONAL' ? 'bg-emerald-200' : 'bg-indigo-200'}`}></div>

               <div className="max-w-6xl mx-auto relative z-10">
                 <div className="mb-8 text-center md:text-left">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                        {userRole === 'PERSONAL' 
                          ? "Smart Food Management System"
                          : "Inventory Optimization Pipeline"
                        }
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                      {userRole === 'PERSONAL' 
                          ? "Automate your kitchen workflow in 3 steps."
                          : "Digitize and grade warehouse stock at scale."
                        }
                    </p>
                 </div>
                 
                 {userRole === 'PERSONAL' ? (
                   // PERSONAL ROADMAP - FANCY
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Step 1 */}
                      <div className="relative group">
                         <div className="absolute inset-0 bg-green-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                         <div className="relative h-full bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                             <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-green-600 shadow-inner border border-green-100">
                                <ScanLine size={28} />
                             </div>
                             <div className="absolute top-6 right-6 text-green-200 font-black text-4xl opacity-50">01</div>
                             <h3 className="text-lg font-bold text-gray-800 mb-2">Capture</h3>
                             <p className="text-xs text-gray-600 leading-relaxed font-medium">
                               Take a photo of your produce. The system detects each fruit and estimates its freshness level using a trained visual model.
                             </p>
                         </div>
                         {/* Connector Line (Desktop) */}
                         <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-green-200 z-0"></div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative group">
                         <div className="absolute inset-0 bg-green-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                         <div className="relative h-full bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                             <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-green-600 shadow-inner border border-green-100">
                                <Layers size={28} />
                             </div>
                             <div className="absolute top-6 right-6 text-green-200 font-black text-4xl opacity-50">02</div>
                             <h3 className="text-lg font-bold text-gray-800 mb-2">Insight</h3>
                             <p className="text-xs text-gray-600 leading-relaxed font-medium">
                               Items are organized into a 5-tier freshness hierarchy—from <strong>Discard</strong> and <strong>Urgent</strong> to <strong>Peak Quality</strong> and <strong>Storage</strong>—optimizing consumption order.
                             </p>
                         </div>
                         {/* Connector Line (Desktop) */}
                         <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-green-200 z-0"></div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative group">
                         <div className="absolute inset-0 bg-green-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                         <div className="relative h-full bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                             <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-green-600 shadow-inner border border-green-100">
                                <CalendarClock size={28} />
                             </div>
                             <div className="absolute top-6 right-6 text-green-200 font-black text-4xl opacity-50">03</div>
                             <h3 className="text-lg font-bold text-gray-800 mb-2">Plan</h3>
                             <p className="text-xs text-gray-600 leading-relaxed font-medium">
                               View a dynamically updated consumption plan based on observed freshness trends. Track usage, identify early spoilage, and reduce waste over time.
                             </p>
                         </div>
                      </div>
                   </div>
                 ) : (
                   // BUSINESS ROADMAP - FANCY
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Step 1 */}
                      <div className="relative group">
                         <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                         <div className="relative h-full bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner border border-blue-100">
                                <PackageSearch size={28} />
                             </div>
                             <div className="absolute top-6 right-6 text-blue-200 font-black text-4xl opacity-50">01</div>
                             <h3 className="text-lg font-bold text-gray-800 mb-2">Audit & Digitize</h3>
                             <p className="text-xs text-gray-600 leading-relaxed font-medium">
                               Scan incoming crates or shelves. The system automatically catalogs items and generates a structured digital inventory.
                             </p>
                         </div>
                         <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-blue-200 z-0"></div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative group">
                         <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                         <div className="relative h-full bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner border border-blue-100">
                                <ScanBarcode size={28} />
                             </div>
                             <div className="absolute top-6 right-6 text-blue-200 font-black text-4xl opacity-50">02</div>
                             <h3 className="text-lg font-bold text-gray-800 mb-2">Automated Grading</h3>
                             <p className="text-xs text-gray-600 leading-relaxed font-medium">
                               Produce items are assigned standardized quality levels using consistency-focused visual assessment models.
                             </p>
                         </div>
                         <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-blue-200 z-0"></div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative group">
                         <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity rounded-2xl"></div>
                         <div className="relative h-full bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner border border-blue-100">
                                <BarChart4 size={28} />
                             </div>
                             <div className="absolute top-6 right-6 text-blue-200 font-black text-4xl opacity-50">03</div>
                             <h3 className="text-lg font-bold text-gray-800 mb-2">Inventory Strategy & Recovery</h3>
                             <p className="text-xs text-gray-600 leading-relaxed font-medium">
                               Derive inventory actions from quality data: instantly identify <strong>Prime</strong> stock for premium positioning and <strong>Clearance</strong> candidates to recover costs before spoilage.
                             </p>
                         </div>
                      </div>
                   </div>
                 )}

               </div>
            </div>

            {/* 2. EASY START MODULE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button 
                  onClick={() => setMode(AppMode.CAMERA)}
                  className={`group relative h-48 bg-white border border-gray-100 rounded-2xl p-6 flex flex-col justify-center items-center text-center transition-all hover:shadow-xl overflow-hidden ${userRole === 'PERSONAL' ? 'hover:border-green-200' : 'hover:border-blue-200'}`}
               >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${userRole === 'PERSONAL' ? 'bg-green-50/50' : 'bg-blue-50/50'}`}></div>
                  <div className={`relative z-10 mb-4 p-4 rounded-full group-hover:scale-110 transition-transform ${userRole === 'PERSONAL' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                     <Camera size={36} />
                  </div>
                  <h3 className="relative z-10 text-xl font-bold text-gray-900 mb-1">
                    {userRole === 'PERSONAL' ? 'Start Live Camera' : 'Start Warehouse Scan'}
                  </h3>
                  <p className="relative z-10 text-sm text-gray-500">Real-time quality detection</p>
               </button>

               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative h-48 bg-white border border-gray-100 rounded-2xl p-6 flex flex-col justify-center items-center text-center transition-all hover:shadow-xl overflow-hidden ${userRole === 'PERSONAL' ? 'hover:border-blue-200' : 'hover:border-indigo-200'}`}
               >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${userRole === 'PERSONAL' ? 'bg-blue-50/50' : 'bg-indigo-50/50'}`}></div>
                  <div className={`relative z-10 mb-4 p-4 rounded-full group-hover:scale-110 transition-transform ${userRole === 'PERSONAL' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                     <Upload size={36} />
                  </div>
                  <h3 className="relative z-10 text-xl font-bold text-gray-900 mb-1">
                    {userRole === 'PERSONAL' ? 'Upload Fridge Photo' : 'Upload Audit Photo'}
                  </h3>
                  <p className="relative z-10 text-sm text-gray-500">Analyze existing images</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
               </button>
            </div>

            {/* 3. PLANS MODULE */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                   <div className={`p-2.5 rounded-xl shadow-sm ${userRole === 'PERSONAL' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {userRole === 'PERSONAL' ? <Utensils size={22} /> : <Store size={22} />}
                   </div>
                   <div>
                      <h3 className="font-bold text-gray-900 text-xl">
                        {userRole === 'PERSONAL' ? 'Consumption Plans' : 'Sales Strategy Plans'}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        {userRole === 'PERSONAL' ? 'Prioritized inventory management' : 'Maximize sales & reduce waste'}
                      </p>
                   </div>
                </div>

                {visiblePlans.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 border-dashed p-12 text-center flex flex-col items-center justify-center text-gray-400">
                     <div className="bg-gray-50 p-4 rounded-full mb-4">
                        {userRole === 'PERSONAL' ? <ChefHat size={32} className="opacity-40 text-gray-600" /> : <Briefcase size={32} className="opacity-40 text-gray-600" />}
                     </div>
                     <p className="mb-2 font-medium text-gray-600">No plans yet.</p>
                     <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
                       {userRole === 'PERSONAL' 
                         ? "Upload a photo of your groceries to generate your first smart consumption plan." 
                         : "Scan your inventory to generate actionable sales and pricing strategies."}
                     </p>
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-lg shadow-gray-200"
                     >
                        Create First Plan
                     </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    {visiblePlans.map((plan, planIndex) => (
                      <div key={plan.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 ring-1 ring-black/5">
                         
                         {/* Plan Header */}
                         <div className="bg-gray-50/80 backdrop-blur-sm p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                               {editingPlanTitleId === plan.id ? (
                                 <div className="flex items-center gap-2">
                                   <input 
                                     autoFocus
                                     type="text" 
                                     value={tempEditValue}
                                     onChange={(e) => setTempEditValue(e.target.value)}
                                     className="px-3 py-1.5 border border-blue-400 rounded-lg text-lg font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                                   />
                                   <button onClick={() => renamePlan(plan.id, tempEditValue)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"><Check size={18} /></button>
                                   <button onClick={() => setEditingPlanTitleId(null)} className="p-2 text-gray-400 bg-white hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setEditingPlanTitleId(plan.id); setTempEditValue(plan.title); }}>
                                    <h4 className="font-bold text-xl text-gray-900 tracking-tight">{plan.title}</h4>
                                    <Edit2 size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                               )}
                               <span className="text-xs text-gray-400 font-mono hidden sm:inline px-2 py-1 bg-gray-100 rounded border border-gray-200">
                                 {new Date(plan.createdAt).toLocaleDateString()}
                               </span>
                            </div>

                            <div className="flex items-center gap-2">
                               <button 
                                 disabled={planIndex === 0}
                                 onClick={() => movePlan(planIndex, 'up', visiblePlans)}
                                 className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-30 transition-colors"
                               >
                                 <ArrowUp size={18} />
                               </button>
                               <button 
                                 disabled={planIndex === visiblePlans.length - 1}
                                 onClick={() => movePlan(planIndex, 'down', visiblePlans)}
                                 className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-30 transition-colors"
                               >
                                 <ArrowDown size={18} />
                               </button>
                               <div className="h-6 w-px bg-gray-200 mx-2"></div>
                               <button 
                                 onClick={() => deletePlan(plan.id)}
                                 className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                               >
                                 <Trash2 size={14} /> Delete
                               </button>
                            </div>
                         </div>

                         {/* Plan Items Table */}
                         <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                              <thead className="bg-white text-gray-400 text-[10px] uppercase tracking-wider font-bold border-b border-gray-100">
                                 <tr>
                                    <th className="px-6 py-4">Item Name</th>
                                    <th className="px-6 py-4">Freshness</th>
                                    <th className="px-6 py-4">
                                      {userRole === 'PERSONAL' ? 'Priority' : 'Action Status'}
                                    </th>
                                    <th className="px-6 py-4">
                                      {userRole === 'PERSONAL' ? 'Expert Advice' : 'Sales Strategy'}
                                    </th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                 {plan.items.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No items in this plan.</td></tr>
                                 ) : (
                                   plan.items.map((item) => {
                                      const uniqueItemId = `${plan.id}-${item.id}`;
                                      const isRotten = item.priority === 'DISCARD';

                                      return (
                                        <tr key={item.id} className={`transition-colors group ${isRotten ? 'bg-gray-50' : 'hover:bg-blue-50/30'}`}>
                                          <td className="px-6 py-4 font-medium text-gray-900">
                                              {editingItemNameId === uniqueItemId ? (
                                                <div className="flex items-center gap-2">
                                                   <input 
                                                      autoFocus
                                                      type="text"
                                                      value={tempEditValue}
                                                      onChange={(e) => setTempEditValue(e.target.value)}
                                                      className="w-32 px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none"
                                                      onKeyDown={(e) => { if (e.key === 'Enter') renameFoodPlanItem(plan.id, item.id, tempEditValue); }}
                                                   />
                                                   <button onClick={() => renameFoodPlanItem(plan.id, item.id, tempEditValue)} className="text-green-600 hover:bg-green-100 p-1 rounded"><Check size={12} /></button>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-3">
                                                   {/* Dot Indicator */}
                                                   <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${isRotten ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                                                   
                                                   {/* Name with Strikethrough if rotten */}
                                                   <span className={`text-sm ${isRotten ? 'line-through text-gray-400 decoration-gray-400' : 'text-gray-900'}`}>
                                                      {item.name}
                                                   </span>

                                                   <button 
                                                      onClick={() => { setEditingItemNameId(uniqueItemId); setTempEditValue(item.name); }}
                                                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-600 transition-opacity"
                                                   >
                                                      <Edit2 size={12} />
                                                   </button>
                                                </div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-2">
                                                <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                    <div 
                                                      className={`h-full ${item.score < 25 ? 'bg-gray-600' : item.score < 45 ? 'bg-red-500' : item.score < 70 ? 'bg-yellow-400' : item.score < 90 ? 'bg-lime-500' : 'bg-green-500'}`} 
                                                      style={{ width: `${item.score}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`text-xs font-mono font-bold ${isRotten ? 'text-gray-400' : 'text-gray-600'}`}>{item.score}%</span>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4">
                                              {/* BUSINESS VS PERSONAL BADGES */}
                                              {userRole === 'PERSONAL' ? (
                                                <>
                                                  {item.priority === 'DISCARD' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600 border border-gray-300">
                                                        <Skull size={12} /> DISCARD
                                                    </span>
                                                  )}
                                                  {item.priority === 'URGENT' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                                        <AlertCircle size={12} /> URGENT
                                                    </span>
                                                  )}
                                                  {item.priority === 'HIGH' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                        <Star size={12} /> HIGH (Peak)
                                                    </span>
                                                  )}
                                                   {item.priority === 'MEDIUM' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-lime-100 text-lime-700 border border-lime-200">
                                                        <Hourglass size={12} /> MEDIUM
                                                    </span>
                                                  )}
                                                  {item.priority === 'LOW' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                        <CheckCircle2 size={12} /> LOW (Store)
                                                    </span>
                                                  )}
                                                </>
                                              ) : (
                                                // BUSINESS BADGES
                                                <>
                                                  {item.priority === 'DISCARD' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-800 text-white border border-gray-600">
                                                        <Skull size={12} /> WRITE-OFF
                                                    </span>
                                                  )}
                                                  {item.priority === 'URGENT' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white border border-red-700">
                                                        <Percent size={12} /> CLEARANCE
                                                    </span>
                                                  )}
                                                  {item.priority === 'HIGH' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-600 text-white border border-purple-700">
                                                        <Star size={12} /> PRIME
                                                    </span>
                                                  )}
                                                   {item.priority === 'MEDIUM' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white border border-blue-600">
                                                        <Store size={12} /> STOCK
                                                    </span>
                                                  )}
                                                  {item.priority === 'LOW' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                                                        <Archive size={12} /> STORAGE
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div 
                                                className="flex items-center gap-2 cursor-help w-fit"
                                                onMouseEnter={(e) => handleTooltip(e, item.fullAdvice || item.reasoning)}
                                                onMouseLeave={() => setTooltipData(null)}
                                              >
                                                <span className="text-xs text-gray-600 truncate max-w-[180px] block font-medium">
                                                  {item.consumptionAdvice}
                                                </span>
                                                <Info size={12} className="text-gray-300 hover:text-blue-500 transition-colors" />
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {isRotten ? (
                                                <button 
                                                  onClick={() => removeFoodPlanItem(plan.id, item.id)}
                                                  className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ml-auto border border-transparent hover:border-red-100"
                                                >
                                                  <Trash2 size={14} /> Remove
                                                </button>
                                              ) : (
                                                <button 
                                                  onClick={() => removeFoodPlanItem(plan.id, item.id)}
                                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ml-auto border border-transparent ${userRole === 'PERSONAL' ? 'text-green-600 hover:text-green-800 hover:bg-green-50 hover:border-green-100' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-100'}`}
                                                >
                                                  {userRole === 'PERSONAL' ? (
                                                    <><Check size={14} /> Mark Eaten</>
                                                  ) : (
                                                    <><ShoppingCart size={14} /> Mark Sold</>
                                                  )}
                                                </button>
                                              )}
                                          </td>
                                        </tr>
                                      );
                                   })
                                 )}
                              </tbody>
                           </table>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
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
                
                {/* Low Light Warning Overlay */}
                {isTooDark && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-black/40">
                    <div className="bg-black/70 backdrop-blur-md text-yellow-400 px-6 py-4 rounded-xl border border-yellow-500/50 flex flex-col items-center gap-3 animate-pulse">
                      <Lightbulb size={32} />
                      <div className="text-center">
                        <h3 className="font-bold text-lg">Too Dark</h3>
                        <p className="text-sm text-yellow-200/80">Turn on a light for better accuracy</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20">
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
                    <p className="text-xs text-gray-400 mt-2">Applying {learningHistory.length} active learning corrections...</p>
                  </div>
                ) : (
                  currentResult && (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold text-gray-800">Analysis Results</h2>
                         <div className="flex gap-2">
                             <button 
                                onClick={prepareFoodPlanSave}
                                className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${userRole === 'PERSONAL' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                {userRole === 'PERSONAL' ? <Utensils size={16} /> : <Briefcase size={16} />} 
                                {userRole === 'PERSONAL' ? 'Save to Food Plan' : 'Generate Sales Strategy'}
                              </button>
                             <button 
                                onClick={resetAnalysis} 
                                className="text-sm font-medium text-gray-500 hover:text-green-600 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors"
                              >
                                Scan Another
                              </button>
                         </div>
                      </div>
                      <AnalysisOverlay 
                        imageUrl={currentImage} 
                        items={currentResult.items} 
                        onCorrectPrediction={onUserCorrection}
                        userRole={userRole}
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
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload} 
              />
             {!currentImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
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
                      <p className="text-gray-500 font-medium">Analyzing...</p>
                    </div>
                  ) : (
                    currentResult && (
                      <div className="animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-xl font-bold text-gray-800">Analysis Results</h2>
                           <div className="flex gap-2">
                               <button 
                                  onClick={prepareFoodPlanSave}
                                  className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${userRole === 'PERSONAL' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                  {userRole === 'PERSONAL' ? <Utensils size={16} /> : <Briefcase size={16} />} 
                                  {userRole === 'PERSONAL' ? 'Save to Food Plan' : 'Generate Sales Strategy'}
                                </button>
                               <button 
                                  onClick={triggerNewUpload} 
                                  className="text-sm font-medium text-gray-500 hover:text-green-600 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors"
                                >
                                  Upload Another
                                </button>
                           </div>
                        </div>
                        <AnalysisOverlay 
                          imageUrl={currentImage} 
                          items={currentResult.items} 
                          onCorrectPrediction={onUserCorrection}
                          userRole={userRole}
                        />
                      </div>
                    )
                  )}
                </div>
             )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <p className="text-xs text-gray-400 font-mono">
             FreshScore AI v2.5 • Powered by Google Gemini 2.5 Flash & ViT-L/16
           </p>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
                   <Settings size={18} /> System Settings
                 </h3>
                 <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">AI Model Selection</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={() => setSelectedModel('flash')}
                         className={`p-3 rounded-xl border text-left transition-all ${selectedModel === 'flash' ? 'border-green-500 bg-green-50 ring-1 ring-green-200' : 'border-gray-200 hover:border-gray-300'}`}
                       >
                          <div className="font-bold text-sm mb-1">Gemini 2.5 Flash</div>
                          <div className="text-[10px] text-gray-500">Fast • Low Latency • Default</div>
                       </button>
                       <button 
                         onClick={() => setSelectedModel('pro')}
                         className={`p-3 rounded-xl border text-left transition-all ${selectedModel === 'pro' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}`}
                       >
                          <div className="font-bold text-sm mb-1">Gemini 3.0 Pro</div>
                          <div className="text-[10px] text-gray-500">High Reasoning • Precise</div>
                       </button>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Why Multimodal LLM?</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                       Unlike traditional object detection (YOLO) which only finds "where" an object is, Multimodal LLMs understand "what" condition it is in. 
                       They analyze texture, oxidation, and subtle bruising patterns to replicate human judgment.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* SAVE PLAN DIALOG */}
      {showSaveDialog && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
               <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-lg text-gray-900">
                    {userRole === 'PERSONAL' ? 'Save Consumption Plan' : 'Save Sales Strategy'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {pendingItems.length} items to be tracked.
                  </p>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Save Destination</label>
                     <select 
                       value={selectedPlanId}
                       onChange={(e) => setSelectedPlanId(e.target.value)}
                       className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                        <option value="new">+ Create New Plan</option>
                        {foodPlans.filter(p => p.type === (userRole === 'PERSONAL' ? 'CONSUMPTION' : 'SALES')).map(plan => (
                           <option key={plan.id} value={plan.id}>Add to: {plan.title}</option>
                        ))}
                     </select>
                  </div>

                  {selectedPlanId === 'new' && (
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Plan Title</label>
                        <input 
                           type="text" 
                           value={newPlanName}
                           onChange={(e) => setNewPlanName(e.target.value)}
                           className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder={userRole === 'PERSONAL' ? "e.g. Weekly Groceries" : "e.g. Q3 Inventory Audit"}
                        />
                     </div>
                  )}

                  <div className="flex gap-3 pt-2">
                     <button onClick={() => setShowSaveDialog(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                     <button onClick={confirmSavePlan} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-lg shadow-md hover:shadow-lg transition-all ${userRole === 'PERSONAL' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Confirm Save
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* TECH SPECS MODAL */}
      {showTechSpecs && <TechSpecsModal onClose={() => setShowTechSpecs(false)} />}

      {/* GLOBAL FIXED TOOLTIP (Prevent Clipping) */}
      {tooltipData && (
        <div 
          className="fixed z-[9999] pointer-events-none bg-gray-900/95 text-white text-xs p-3 rounded-lg shadow-xl max-w-xs animate-in fade-in zoom-in-95 backdrop-blur-sm border border-white/10"
          style={{ 
            left: tooltipData.x + 15, 
            top: tooltipData.y + 15 
          }}
        >
          <div className="flex items-start gap-2">
             <Lightbulb size={14} className="text-yellow-400 shrink-0 mt-0.5" />
             <p className="leading-relaxed">{tooltipData.content}</p>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;