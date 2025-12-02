
import React, { useState } from 'react';
import { ProduceItem, RipenessStage, UserFeedback } from '../types';
import { ScanEye, Sun, Snowflake, Tag, Trash2, ShoppingBag, SunDim, Eye, Grid3X3, Archive, Activity, ArrowLeft, Wand2, ThumbsDown, Save, CheckCircle2 } from 'lucide-react';

interface AnalysisOverlayProps {
  imageUrl: string;
  items: ProduceItem[];
  containerClassName?: string;
}

// 1. FRESHNESS/QUALITY COLORS
const getQualityColor = (score: number) => {
  if (score < 50) return 'text-red-600 bg-red-50 border-red-200';
  if (score < 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-green-600 bg-green-50 border-green-200';
};

const getProgressBarColor = (score: number) => {
  if (score < 50) return 'bg-red-500';
  if (score < 80) return 'bg-yellow-500';
  return 'bg-green-500';
};

// 2. RIPENESS BADGES (5 Stages)
const getRipenessBadge = (stage: RipenessStage) => {
  switch (stage) {
    case 'Unripe': return 'bg-blue-500 text-white border-blue-600';     // Stage 1: Raw
    case 'Semi-ripe': return 'bg-teal-500 text-white border-teal-600'; // Stage 2: Turning
    case 'Ripe': return 'bg-green-500 text-white border-green-600';    // Stage 3: Peak
    case 'Overripe': return 'bg-orange-500 text-white border-orange-600'; // Stage 4: Declining
    case 'Rotten': return 'bg-red-600 text-white border-red-700';      // Stage 5: Bad
    default: return 'bg-gray-500 text-white';
  }
};

// 3. CATEGORY COLORS
const CATEGORY_PALETTE = [
  { name: 'blue', border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-100', badge: 'bg-blue-600', dot: 'bg-blue-500' },
  { name: 'purple', border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-100', badge: 'bg-purple-600', dot: 'bg-purple-500' },
  { name: 'pink', border: 'border-pink-500', bg: 'bg-pink-500/20', text: 'text-pink-100', badge: 'bg-pink-600', dot: 'bg-pink-500' },
  { name: 'orange', border: 'border-orange-500', bg: 'bg-orange-500/20', text: 'text-orange-100', badge: 'bg-orange-600', dot: 'bg-orange-500' },
  { name: 'cyan', border: 'border-cyan-500', bg: 'bg-cyan-500/20', text: 'text-cyan-100', badge: 'bg-cyan-600', dot: 'bg-cyan-500' },
];

const getCategoryStyle = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[index];
};

const getActionBadge = (action?: string) => {
  switch(action) {
    case 'Discard': return <span className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Trash2 size={10} /> Discard</span>;
    case 'Discount': return <span className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Tag size={10} /> Discount</span>;
    case 'Sell': return <span className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><ShoppingBag size={10} /> Sell</span>;
    case 'Store': return <span className="flex items-center gap-1 bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Archive size={10} /> Store</span>;
    default: return null;
  }
};

export const AnalysisOverlay: React.FC<AnalysisOverlayProps> = ({ imageUrl, items, containerClassName }) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [showAttentionGrid, setShowAttentionGrid] = useState(false);
  
  // Feedback Logic
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedbackLog, setFeedbackLog] = useState<UserFeedback[]>([]);

  const isLowLight = items.some(i => i.lighting_condition === 'Low');
  
  const toggleCalibrate = () => {
    setIsCalibrated(!isCalibrated);
    if (!isCalibrated) {
      setBrightness(110);
      setContrast(115); // Simulate "Pop"
    } else {
      setBrightness(100);
      setContrast(100);
    }
  };

  const toggleEnhance = () => setBrightness(prev => prev === 100 ? 150 : 100);

  // Batch Summary Calculations
  const lowScoreItems = items.filter(i => i.score < 60);
  const avgScore = items.length > 0 ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : 0;

  // Filter items if one is selected
  const displayedItems = selectedItemId ? items.filter(i => i.id === selectedItemId) : items;

  const handleFeedbackSubmit = (id: string, newStatus: string) => {
    setFeedbackLog(prev => [...prev, {
      itemId: id,
      originalStatus: items.find(i => i.id === id)?.status || '',
      correctedStatus: newStatus,
      originalScore: items.find(i => i.id === id)?.score || 0,
      correctedScore: 0,
      timestamp: Date.now()
    }]);
    setFeedbackMode(false);
    alert("Correction logged for Active Learning loop!");
  };

  return (
    <div className={`relative w-full h-full flex flex-col lg:flex-row gap-6 ${containerClassName}`}>
      
      {/* Image View Wrapper */}
      <div 
        onClick={() => setSelectedItemId(null)}
        className="flex-grow bg-gray-900 rounded-xl overflow-hidden shadow-lg min-h-[300px] flex items-center justify-center relative group p-4 cursor-pointer"
      >
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 items-end">
          {/* Transformer Attention Toggle */}
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAttentionGrid(!showAttentionGrid); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit
              ${showAttentionGrid 
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
                : 'bg-black/50 text-white hover:bg-black/70 backdrop-blur'}`}
          >
            <Grid3X3 size={14} />
            <span>ViT GRID</span>
          </button>
          
          {/* Calibration Toggle */}
           <button 
            onClick={(e) => { e.stopPropagation(); toggleCalibrate(); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit
              ${isCalibrated 
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                : 'bg-black/50 text-white hover:bg-black/70 backdrop-blur'}`}
          >
            <Wand2 size={14} />
            <span>AUTO CALIB</span>
          </button>
        </div>

        {/* Low Light Warning */}
        {isLowLight && brightness === 100 && !isCalibrated && (
          <div className="absolute top-4 left-4 z-40 bg-black/70 backdrop-blur-sm text-yellow-400 px-3 py-2 rounded-lg text-xs font-medium border border-yellow-500/30 flex items-center gap-2 shadow-lg">
            <SunDim size={14} />
            <span>Low Light</span>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleEnhance(); }} 
              className="ml-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] font-bold"
            >
              ENHANCE
            </button>
          </div>
        )}
        
        <div className="relative inline-block max-w-full">
          <img 
            src={imageUrl} 
            alt="Analysis Target" 
            className="max-w-full max-h-[600px] block w-auto h-auto transition-all duration-300"
            style={{ 
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${selectedItemId ? 'grayscale(30%)' : ''}` 
            }}
          />

          {/* Transformer Attention Grid Simulation */}
          {showAttentionGrid && (
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none opacity-40">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className={`border-[0.5px] border-white/10 ${Math.random() > 0.85 ? 'bg-purple-500/40 animate-pulse' : ''}`} />
              ))}
            </div>
          )}
          
          {items.map((item) => {
            if (!item.box_2d) return null;
            const [ymin, xmin, ymax, xmax] = item.box_2d;
            
            const catStyle = getCategoryStyle(item.name);
            const isHovered = hoveredItemId === item.id;
            const isSelected = selectedItemId === item.id;
            const isDimmed = selectedItemId && !isSelected;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemId(item.id === selectedItemId ? null : item.id);
                  setFeedbackMode(false);
                }}
                className={`absolute border-2 transition-all duration-300 cursor-pointer
                  ${catStyle.border} 
                  ${(isHovered || isSelected) ? `bg-opacity-20 ${catStyle.bg} z-30 shadow-[0_0_15px_rgba(255,255,255,0.3)]` : 'bg-opacity-0 z-20'}
                  ${isDimmed ? 'opacity-30 border-gray-500 grayscale' : 'opacity-100'}
                `}
                style={{
                  top: `${ymin/10}%`,
                  left: `${xmin/10}%`,
                  width: `${(xmax-xmin)/10}%`,
                  height: `${(ymax-ymin)/10}%`,
                }}
              >
                {/* Heatmap Visualization (Only when selected) */}
                {isSelected && item.defects && item.defects.map((defect, idx) => (
                  <div 
                    key={idx}
                    className="absolute rounded-full pointer-events-none animate-pulse"
                    style={{
                      top: `${defect.center_2d[0]}%`,
                      left: `${defect.center_2d[1]}%`,
                      width: '20%',
                      height: '20%',
                      transform: 'translate(-50%, -50%)',
                      background: defect.type.toLowerCase().includes('fresh') 
                        ? 'radial-gradient(circle, rgba(250, 204, 21, 0.6) 0%, rgba(250, 204, 21, 0) 70%)' // Yellow for ripe spots
                        : 'radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0) 70%)' // Red for rot
                    }}
                  />
                ))}

                {/* Box Tag */}
                <div className={`absolute -top-8 left-0 flex flex-col items-start transition-all duration-200 ${isHovered || isSelected ? 'opacity-100 scale-100 z-50' : 'opacity-0 scale-95'}`}>
                  <div className="flex shadow-lg rounded overflow-hidden ring-1 ring-black/20">
                     <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap ${catStyle.badge}`}>
                      {item.name}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white text-gray-900">
                      {item.score}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {brightness > 100 && !isCalibrated && (
          <button onClick={(e) => { e.stopPropagation(); toggleEnhance(); }} className="absolute bottom-4 right-4 z-40 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs hover:bg-black/80 flex items-center gap-1">
            <Eye size={12} /> Reset View
          </button>
        )}
      </div>

      {/* Results Panel */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col max-h-[600px]">
        
        {/* BATCH SUMMARY CARD (Top) */}
        {!selectedItemId && items.length > 0 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Batch Summary</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                <span className="block text-lg font-bold text-gray-800">{items.length}</span>
                <span className="text-[10px] text-gray-400">Total Items</span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                <span className={`block text-lg font-bold ${avgScore > 70 ? 'text-green-600' : 'text-yellow-600'}`}>{avgScore}</span>
                <span className="text-[10px] text-gray-400">Avg Score</span>
              </div>
              <div 
                className={`p-2 rounded border shadow-sm cursor-pointer transition-colors ${lowScoreItems.length > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-white border-gray-200'}`}
                onClick={() => {
                  if(lowScoreItems.length > 0) {
                     // In a real app this would multi-select, for now we select the first one
                     setSelectedItemId(lowScoreItems[0].id);
                  }
                }}
              >
                <span className={`block text-lg font-bold ${lowScoreItems.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{lowScoreItems.length}</span>
                <span className="text-[10px] text-gray-500">Alerts</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-b border-gray-100 bg-white flex justify-between items-center z-10 shadow-sm">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              {selectedItemId ? 'Detailed Inspection' : 'Detected Items'}
            </h3>
            {selectedItemId && (
               <button 
                 onClick={() => { setSelectedItemId(null); setFeedbackMode(false); }}
                 className="text-xs text-blue-600 flex items-center gap-1 mt-1 hover:underline"
               >
                 <ArrowLeft size={10} /> Back to batch
               </button>
            )}
          </div>
          <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">ViT-L/16</span>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-grow">
          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-12 flex flex-col items-center">
              <ScanEye size={32} className="mb-2 opacity-50" />
              <p>No objects detected.</p>
            </div>
          ) : (
            displayedItems.map((item) => {
              const catStyle = getCategoryStyle(item.name);
              const qualityStyle = getQualityColor(item.score);
              const ripenessBadgeClass = getRipenessBadge(item.ripeness_stage);
              const isSelected = selectedItemId === item.id;
              
              return (
                <div 
                  key={item.id} 
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  onClick={() => {
                     if (!isSelected) {
                        setSelectedItemId(item.id);
                        setFeedbackMode(false);
                     }
                  }}
                  className={`relative flex flex-col p-3 bg-white rounded-lg border transition-all duration-200 cursor-pointer group
                    ${(hoveredItemId === item.id || isSelected) ? `border-${catStyle.name}-400 shadow-md ring-1 ring-${catStyle.name}-200 bg-blue-50/10` : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {/* Left Color Bar */}
                  {(hoveredItemId === item.id || isSelected) && (
                     <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${catStyle.badge}`}></div>
                  )}

                  {/* Header */}
                  <div className="flex-1 w-full pl-2">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-2 h-2 rounded-full ${catStyle.dot}`}></span>
                          <span className="font-bold text-gray-900">{item.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${qualityStyle}`}>
                            Q: {item.score}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${ripenessBadgeClass}`}>
                            {item.ripeness_stage}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        {getActionBadge(item.action)}
                        <span className="text-[10px] text-gray-400 font-mono">CONF: {Math.round(item.confidence * 100)}%</span>
                      </div>
                    </div>
                    
                    {/* Quality Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getProgressBarColor(item.score)}`} 
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>

                    {/* Feedback Loop (Human-in-the-loop) */}
                    {isSelected && (
                      <div className="mb-3">
                         {!feedbackMode ? (
                           <button 
                              onClick={(e) => { e.stopPropagation(); setFeedbackMode(true); }}
                              className="w-full text-xs flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
                           >
                              <ThumbsDown size={10} /> Incorrect Result?
                           </button>
                         ) : (
                           <div className="bg-gray-50 p-2 rounded border border-gray-200 animate-in fade-in zoom-in-95">
                             <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Active Learning Feedback</p>
                             <div className="grid grid-cols-2 gap-2 mb-2">
                                <button onClick={(e) => { e.stopPropagation(); handleFeedbackSubmit(item.id, 'Fresh'); }} className="bg-green-100 text-green-700 text-xs py-1 rounded hover:bg-green-200">Set Fresh</button>
                                <button onClick={(e) => { e.stopPropagation(); handleFeedbackSubmit(item.id, 'Rotten'); }} className="bg-red-100 text-red-700 text-xs py-1 rounded hover:bg-red-200">Set Rotten</button>
                             </div>
                             <button onClick={(e) => { e.stopPropagation(); setFeedbackMode(false); }} className="text-[10px] text-gray-400 underline w-full text-center">Cancel</button>
                           </div>
                         )}
                      </div>
                    )}

                    {/* Extended Details / Deep Diagnosis */}
                    {(isSelected || displayedItems.length === 1) && (
                      <div className="mb-3 bg-purple-50 rounded border border-purple-100 p-2 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center gap-1.5 mb-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
                           <Activity size={12} /> Deep Diagnosis
                         </div>
                         
                         {/* Advanced Feature Viz: Texture & Color */}
                         {item.color_distribution && (
                           <div className="mb-3">
                              <p className="text-[9px] text-gray-500 font-bold mb-1">COLOR SPECTRUM (HSV)</p>
                              <div className="flex h-2 rounded-full overflow-hidden w-full">
                                <div className="bg-green-500 h-full" style={{ width: `${item.color_distribution.green_ratio * 100}%` }}></div>
                                <div className="bg-yellow-400 h-full" style={{ width: `${item.color_distribution.yellow_ratio * 100}%` }}></div>
                                <div className="bg-amber-800 h-full" style={{ width: `${item.color_distribution.brown_ratio * 100}%` }}></div>
                              </div>
                           </div>
                         )}

                         {item.texture_metrics && (
                            <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
                                <div className="bg-white/80 p-1 rounded">
                                   <span className="text-gray-500 block">Roughness</span>
                                   <span className="font-mono font-bold">{item.texture_metrics.roughness_score}/100</span>
                                </div>
                                <div className="bg-white/80 p-1 rounded">
                                   <span className="text-gray-500 block">Texture</span>
                                   <span className="font-mono font-bold">{item.texture_metrics.surface_type}</span>
                                </div>
                            </div>
                         )}

                         <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-white p-1.5 rounded text-center">
                              <span className="block text-xl font-bold text-gray-800">{item.explainability?.defect_count || 0}</span>
                              <span className="text-[9px] text-gray-500 uppercase">Defects</span>
                            </div>
                            <div className="bg-white p-1.5 rounded text-center">
                              <span className="block text-xl font-bold text-gray-800">{item.explainability?.surface_discoloration_percent || 0}%</span>
                              <span className="text-[9px] text-gray-500 uppercase">Discoloration</span>
                            </div>
                         </div>
                         {item.defects && item.defects.length > 0 && (
                            <div className="text-[10px] space-y-1">
                              <p className="font-semibold text-gray-600">HEATMAP ANALYSIS:</p>
                              {item.defects.map((d, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${d.type.toLowerCase().includes('fresh') ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                                  <span className="text-gray-700">{d.type} ({d.severity})</span>
                                </div>
                              ))}
                            </div>
                         )}
                      </div>
                    )}

                    {/* Shelf Life */}
                    <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Sun size={14} className="text-orange-400 flex-shrink-0" />
                        <div className="flex flex-col leading-none">
                          <span className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Room</span>
                          <span className="text-xs font-semibold text-gray-700">{item.shelf_life_room}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
                        <Snowflake size={14} className="text-blue-400 flex-shrink-0" />
                         <div className="flex flex-col leading-none">
                          <span className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Fridge</span>
                          <span className="text-xs font-semibold text-gray-700">{item.shelf_life_fridge}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded leading-relaxed border border-dashed border-gray-200 font-mono">
                      <span className="font-semibold text-purple-700 block mb-1 flex items-center gap-1">
                        <ScanEye size={10} /> ATTENTION MAP REASONING:
                      </span>
                      {item.reasoning}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
