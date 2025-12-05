
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Member, AppData, Slot, THEME_CONFIG, CLASS_COLORS, Squad, GameConfig, DEFAULT_ULT_SKILLS, DEFAULT_CLAN_SKILLS } from './types';
import { loadData, saveData, loadBackground, saveBackground, clearBackground } from './services/storage';
import MemberSidebar from './components/MemberSidebar';
import { MemberEditorModal, StructureEditorModal, SkillEditorModal, GameConfigModal } from './components/Modals';
import { Settings, Image as ImageIcon, Download, Save, XCircle, MousePointer2, Plus, LayoutGrid, Palette, FileJson, Upload, Moon, Sun, Gamepad2, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- Constants ---
const PRESET_BACKGROUNDS = [
  { name: "纯净白", url: "" }, // Empty url means default CSS pattern
  { name: "水墨云", url: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?q=80&w=1920&auto=format&fit=crop" },
  { name: "几何白", url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1920&auto=format&fit=crop" },
  { name: "淡雅灰", url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=1920&auto=format&fit=crop" },
];

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex) return `rgba(100,100,100,${alpha})`;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
};

// --- Components ---

// 1. Slot Item Component
interface SlotItemProps {
  gIdx: number;
  sIdx: number;
  slotIdx: number;
  slot: Slot;
  member: Member | undefined;
  isDeploymentTarget: boolean;
  isExportMode: boolean;
  classColor: string | undefined;
  cardWidth: number;
  cardHeight: number;
  cardOpacity: number;
  metaFontSize: number;
  onClick: (g: number, s: number, si: number) => void;
  onRightClick: (e: React.MouseEvent, memberId: string) => void;
  // DnD
  onDrop: (e: React.DragEvent, g: number, s: number, si: number) => void;
  onDragStart: (e: React.DragEvent, g: number, s: number, si: number, memberId: string) => void;
}

const SlotItem = React.memo<SlotItemProps>(({
  gIdx, sIdx, slotIdx, slot, member, isDeploymentTarget, isExportMode, classColor,
  cardWidth, cardHeight, cardOpacity, metaFontSize,
  onClick, onRightClick, onDrop, onDragStart
}) => {
  const isEmpty = !member;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isExportMode) return;
    onClick(gIdx, sIdx, slotIdx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isExportMode) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isExportMode) onDrop(e, gIdx, sIdx, slotIdx);
  };

  const handleDragStartInternal = (e: React.DragEvent) => {
    if (member && !isExportMode) {
      onDragStart(e, gIdx, sIdx, slotIdx, member.id);
    }
  };

  // Dynamic Style for Card Color
  const cardStyle = useMemo(() => {
    const baseStyle = { height: `${cardHeight}px` };
    if (!member) return baseStyle;
    return {
       ...baseStyle,
       backgroundColor: hexToRgba(classColor || '#ccc', cardOpacity),
       borderColor: hexToRgba(classColor || '#ccc', 0.6),
       borderLeftWidth: '5px',
       borderLeftColor: classColor,
    };
  }, [member, classColor, cardHeight, cardOpacity]);

  const mergedNote = member?.note || '';

  return (
    <div 
      onClick={handleClick}
      onContextMenu={(e) => { if (!isExportMode && member) onRightClick(e, member.id); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      draggable={!!member && !isExportMode}
      onDragStart={handleDragStartInternal}
      className={`
         relative rounded transition-all duration-200 flex items-center overflow-hidden select-none group
         ${isEmpty 
             ? `bg-white/50 dark:bg-slate-800/30 border border-dashed border-gray-300 dark:border-slate-600 ${!isExportMode ? 'hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10' : ''}` 
             : 'shadow-sm border'
         }
         ${(isDeploymentTarget || isDragOver) ? 'ring-2 ring-primary ring-offset-1 scale-[1.02] bg-primary/10 dark:bg-primary/20 border-primary border-solid' : ''}
         ${!isExportMode && !isDeploymentTarget ? 'cursor-pointer hover:shadow-md' : ''}
      `}
      style={cardStyle}
    >
      {member ? (
        <div className="flex-1 pl-3 flex items-center justify-between min-w-0 pr-1 h-full">
          {/* Main Info - Flex column centered */}
          <div className="flex flex-col min-w-0 mr-1 justify-center h-full flex-1 gap-0.5">
             <div className="flex items-baseline gap-2 w-full">
                <span className="text-gray-900 dark:text-gray-50 font-black text-2xl leading-none truncate tracking-tight drop-shadow-sm">{member.name}</span>
                <span 
                    className="font-bold text-white px-1.5 py-0.5 rounded-sm shadow-sm opacity-90 shrink-0 leading-none self-center" 
                    style={{ backgroundColor: classColor, fontSize: `${Math.max(10, metaFontSize)}px` }}
                >
                   {member.profession}
                </span>
             </div>
             <div className="flex gap-2 items-center opacity-90 mt-0.5" style={{ fontSize: `${metaFontSize}px` }}>
                 <span className={`font-bold leading-none ${member.ult !== '无' ? 'text-accent dark:text-purple-300' : 'text-gray-400 dark:text-slate-500'}`}>
                    {member.ult === '无' ? '-' : member.ult}
                 </span>
                 <span className="w-px h-3 bg-gray-400 dark:bg-slate-500"></span>
                 <span className="font-semibold text-gray-700 dark:text-slate-300 truncate leading-none">
                    {member.clan === '无' ? '' : member.clan}
                 </span>
                  {mergedNote && (
                    <>
                        <span className="w-px h-3 bg-gray-400 dark:bg-slate-500"></span>
                        <span className="font-bold text-gray-800 dark:text-white truncate leading-none">
                            {mergedNote}
                        </span>
                    </>
                 )}
             </div>
          </div>
        </div>
      ) : (
        !isExportMode && (
           <div className="flex-1 flex items-center justify-center text-gray-300 dark:text-slate-600 transition-colors">
             {isDeploymentTarget || isDragOver ? <MousePointer2 size={24} className="text-primary animate-bounce" /> : <Plus size={24} />}
           </div>
        )
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.slot === next.slot && 
    prev.member === next.member && 
    prev.member?.note === next.member?.note &&
    prev.member?.ult === next.member?.ult &&
    prev.member?.clan === next.member?.clan &&
    prev.isDeploymentTarget === next.isDeploymentTarget &&
    prev.isExportMode === next.isExportMode &&
    prev.cardWidth === next.cardWidth &&
    prev.cardHeight === next.cardHeight &&
    prev.cardOpacity === next.cardOpacity &&
    prev.classColor === next.classColor &&
    prev.metaFontSize === next.metaFontSize
  );
});

// 2. Squad Column Component
interface SquadColumnProps {
  squad: Squad;
  gIdx: number;
  sIdx: number;
  pool: Member[];
  isExportMode: boolean;
  selectedMemberId: string | null;
  cardWidth: number;
  cardHeight: number;
  cardOpacity: number;
  metaFontSize: number;
  professionColors: Record<string, string>;
  onSlotClick: (g: number, s: number, si: number) => void;
  onSlotRightClick: (e: React.MouseEvent, memberId: string) => void;
  onSquadNameChange: (gIdx: number, sIdx: number, val: string) => void;
  onSlotDrop: (e: React.DragEvent, g: number, s: number, si: number) => void;
  onSlotDragStart: (e: React.DragEvent, g: number, s: number, si: number, memberId: string) => void;
}

const SquadColumn = React.memo<SquadColumnProps>(({
  squad, gIdx, sIdx, pool, isExportMode, selectedMemberId,
  cardWidth, cardHeight, cardOpacity, metaFontSize, professionColors,
  onSlotClick, onSlotRightClick, onSquadNameChange, onSlotDrop, onSlotDragStart
}) => {
  return (
    <div 
        className="flex flex-col group/col bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300"
        style={{ width: `${cardWidth + 24}px` }} // Padding 16 + Border 2 ~ approx 
    >
      {/* Squad Name - Vertical Column Header */}
      <div className="mb-2 bg-gray-50 dark:bg-slate-900/50 rounded-md border border-gray-100 dark:border-slate-700 p-1.5 flex items-center justify-center relative">
         <div className="w-1 h-4 bg-primary rounded-full absolute left-2"></div>
         <input 
           className={`bg-transparent text-center w-full font-bold text-gray-700 dark:text-slate-200 focus:text-primary outline-none transition-colors text-lg ${isExportMode ? 'text-gray-900 dark:text-white' : ''}`}
           value={squad.name}
           readOnly={isExportMode}
           onChange={e => onSquadNameChange(gIdx, sIdx, e.target.value)}
           placeholder="队名"
         />
      </div>

      {/* Slots Stack */}
      <div className="flex flex-col gap-2">
        {squad.slots.map((slot, slotIdx) => {
          const member = slot.memberId ? pool.find(m => m.id === slot.memberId) : undefined;
          return (
            <SlotItem
              key={slot.id}
              gIdx={gIdx}
              sIdx={sIdx}
              slotIdx={slotIdx}
              slot={slot}
              member={member}
              isDeploymentTarget={!!selectedMemberId}
              isExportMode={isExportMode}
              classColor={member ? (professionColors[member.profession] || '#999') : undefined}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              cardOpacity={cardOpacity}
              metaFontSize={metaFontSize}
              onClick={onSlotClick}
              onRightClick={onSlotRightClick}
              onDrop={onSlotDrop}
              onDragStart={onSlotDragStart}
            />
          );
        })}
      </div>
    </div>
  );
});

// --- Main App ---

const App: React.FC = () => {
  const [data, setData] = useState<AppData>({ pool: [], groups: [] });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  // Settings State
  const [cardWidth, setCardWidth] = useState(200); 
  const [cardHeight, setCardHeight] = useState(72); 
  const [cardOpacity, setCardOpacity] = useState(0.15);
  const [metaFontSize, setMetaFontSize] = useState(12);

  const [showMemberEditor, setShowMemberEditor] = useState(false);
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [showGameConfig, setShowGameConfig] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ member: Member, pos: {x: number, y: number} } | null>(null);
  const [exportMode, setExportMode] = useState(false);
  const [exportTitle, setExportTitle] = useState("帮会联赛排兵布阵");
  const [exportTime, setExportTime] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} 20:00 - 22:00`;
  });

  const selectedMemberIdRef = useRef(selectedMemberId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedMemberIdRef.current = selectedMemberId;
  }, [selectedMemberId]);

  useEffect(() => {
    setData(loadData());
    const bg = loadBackground();
    if (bg) setBackgroundImage(bg);
    
    // Load settings
    const savedView = localStorage.getItem('nsh_roster_view_settings');
    if (savedView) {
      try {
        const parsed = JSON.parse(savedView);
        if (parsed.cardWidth) setCardWidth(parsed.cardWidth);
        if (parsed.cardHeight) setCardHeight(parsed.cardHeight);
        if (parsed.cardOpacity) setCardOpacity(parsed.cardOpacity);
        if (parsed.metaFontSize) setMetaFontSize(parsed.metaFontSize);
      } catch(e) {}
    }

    // Load theme
    const savedTheme = localStorage.getItem('nsh_roster_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeMode(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setThemeMode('dark');
    }
  }, []);

  // Persist View Settings
  useEffect(() => {
    localStorage.setItem('nsh_roster_view_settings', JSON.stringify({ cardWidth, cardHeight, cardOpacity, metaFontSize }));
  }, [cardWidth, cardHeight, cardOpacity, metaFontSize]);

  // Apply theme class to HTML element
  useEffect(() => {
    const html = document.documentElement;
    if (themeMode === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    localStorage.setItem('nsh_roster_theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSaveData = useCallback(() => {
    saveData(data);
    const btn = document.getElementById('save-btn');
    if(btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = `<div class="flex items-center gap-1 text-emerald-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 已保存</div>`;
      setTimeout(() => btn.innerHTML = originalText, 1500);
    }
  }, [data]);

  const handleExportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NSH_Roster_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedData = JSON.parse(content);
        if (parsedData.pool && Array.isArray(parsedData.pool) && parsedData.groups && Array.isArray(parsedData.groups)) {
            if(window.confirm("确定导入该配置？当前数据将被覆盖。")) {
                // If gameConfig missing in import, try to rebuild it from pool
                if (!parsedData.gameConfig) {
                    const ults = new Set(DEFAULT_ULT_SKILLS);
                    const clans = new Set(DEFAULT_CLAN_SKILLS);
                    parsedData.pool.forEach((m: Member) => {
                        if(m.ult !== '无') ults.add(m.ult);
                        if(m.clan !== '无') clans.add(m.clan);
                    });
                    parsedData.gameConfig = {
                        ultSkills: Array.from(ults),
                        clanSkills: Array.from(clans),
                        professionColors: CLASS_COLORS
                    };
                }

                setData(parsedData);
                saveData(parsedData);
                alert("导入成功！");
            }
        } else {
            alert("无效的文件格式。");
        }
      } catch (error) {
        console.error("Import error:", error);
        alert("文件解析失败。");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePoolUpdate = useCallback((newPool: Member[]) => {
    setData(prev => {
      const poolIds = new Set(newPool.map(m => m.id));
      const newGroups = prev.groups.map(g => ({
        ...g,
        squads: g.squads.map(s => ({
          ...s,
          slots: s.slots.map(slot => ({
            ...slot,
            memberId: slot.memberId && poolIds.has(slot.memberId) ? slot.memberId : null
          }))
        }))
      }));
      const newData = { ...prev, groups: newGroups, pool: newPool };
      saveData(newData);
      return newData;
    });
  }, []);

  const handleStructureUpdate = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);
  
  const handleGameConfigUpdate = useCallback((newConfig: GameConfig) => {
    setData(prev => {
      const newData = { ...prev, gameConfig: newConfig };
      saveData(newData);
      return newData;
    });
  }, []);

  const handleSlotClick = useCallback((groupIdx: number, squadIdx: number, slotIdx: number) => {
    const currentSelectedId = selectedMemberIdRef.current;
    setData(prev => {
      if (currentSelectedId) {
        // Mode: Placing a selected member
        const newData = JSON.parse(JSON.stringify(prev)) as AppData;
        
        // Remove from old location if any
        newData.groups.forEach(g => g.squads.forEach(s => s.slots.forEach(sl => {
          if (sl.memberId === currentSelectedId) {
            sl.memberId = null;
          }
        })));
        
        // Assign to new location
        newData.groups[groupIdx].squads[squadIdx].slots[slotIdx].memberId = currentSelectedId;
        saveData(newData);
        return newData;
      } else {
        // Mode: Clicking an existing slot to remove
        const slot = prev.groups[groupIdx].squads[squadIdx].slots[slotIdx];
        if (slot.memberId) {
          if (window.confirm("移出该成员?")) {
             const newData = JSON.parse(JSON.stringify(prev)) as AppData;
             newData.groups[groupIdx].squads[squadIdx].slots[slotIdx].memberId = null;
             saveData(newData);
             return newData;
          }
        }
        return prev;
      }
    });
    if (currentSelectedId) setSelectedMemberId(null);
  }, []);

  // --- Drag and Drop Logic ---
  const handleSlotDragStart = useCallback((e: React.DragEvent, gIdx: number, sIdx: number, slotIdx: number, memberId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'slot', gIdx, sIdx, slotIdx, memberId }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSlotDrop = useCallback((e: React.DragEvent, gIdx: number, sIdx: number, slotIdx: number) => {
     e.preventDefault();
     const dataRaw = e.dataTransfer.getData('text/plain');
     if (!dataRaw) return;

     try {
       const dragData = JSON.parse(dataRaw);
       setData(prev => {
         const newData = JSON.parse(JSON.stringify(prev)) as AppData;
         
         const targetMemberId = newData.groups[gIdx].squads[sIdx].slots[slotIdx].memberId;
         const sourceMemberId = dragData.memberId;

         // Case 1: Drag from Sidebar
         if (dragData.type === 'sidebar') {
           // Remove from anywhere else first
           newData.groups.forEach(g => g.squads.forEach(s => s.slots.forEach(sl => {
             if (sl.memberId === sourceMemberId) sl.memberId = null;
           })));
           
           // Place in target (overwrite if exists)
           newData.groups[gIdx].squads[sIdx].slots[slotIdx].memberId = sourceMemberId;
         }
         
         // Case 2: Drag from another Slot
         if (dragData.type === 'slot') {
            const sourceG = dragData.gIdx;
            const sourceS = dragData.sIdx;
            const sourceSl = dragData.slotIdx;

            // Perform Swap
            newData.groups[gIdx].squads[sIdx].slots[slotIdx].memberId = sourceMemberId;
            newData.groups[sourceG].squads[sourceS].slots[sourceSl].memberId = targetMemberId;
         }

         saveData(newData);
         return newData;
       });
     } catch (err) {
       console.error("Drop failed", err);
     }
  }, []);

  const handleSlotRightClick = useCallback((e: React.MouseEvent, memberId: string) => {
    e.preventDefault();
    setData(currentData => {
      const member = currentData.pool.find(m => m.id === memberId);
      if (member) setContextMenu({ member, pos: { x: e.clientX, y: e.clientY } });
      return currentData;
    });
  }, []);

  const handleUpdateMemberSkill = useCallback((updatedMember: Member) => {
    setData(prev => {
      const newPool = prev.pool.map(m => m.id === updatedMember.id ? updatedMember : m);
      const newData = { ...prev, pool: newPool };
      saveData(newData);
      return newData;
    });
  }, []);
  
  const handleSquadNameChange = useCallback((groupIdx: number, squadIdx: number, val: string) => {
      setData(prev => {
        const newGroups = [...prev.groups];
        const newSquads = [...newGroups[groupIdx].squads];
        newSquads[squadIdx] = { ...newSquads[squadIdx], name: val };
        newGroups[groupIdx] = { ...newGroups[groupIdx], squads: newSquads };
        return { ...prev, groups: newGroups };
      });
  }, []);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = reader.result as string;
        setBackgroundImage(res);
        const saved = await saveBackground(res);
        if (saved !== res) setBackgroundImage(saved);
        setShowBgPicker(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenshot = async () => {
    if (!rosterRef.current) return;
    
    // Temporarily hide UI elements that shouldn't be in screenshot if any
    // Note: Export mode already handles most of this by cleaning up the view
    
    // Wait a tick for UI update if switching modes
    setTimeout(async () => {
        try {
            const canvas = await html2canvas(rosterRef.current!, {
                backgroundColor: null, // Transparent to let background image show
                scale: 2, // High resolution
                useCORS: true, // Allow cross-origin images
                logging: false,
                windowWidth: rosterRef.current!.scrollWidth + 100, // Capture full scroll width
                width: rosterRef.current!.scrollWidth + 50
            });
            
            const link = document.createElement('a');
            link.download = `NSH_League_Roster_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error("Screenshot failed", e);
            alert("截图失败，请重试");
        }
    }, 500);
  };

  // Stats Calculation
  const stats = useMemo(() => {
    let count = 0;
    const profCounts: Record<string, number> = {};
    data.groups.forEach(g => g.squads.forEach(s => s.slots.forEach(sl => {
      if (sl.memberId) {
        count++;
        const m = data.pool.find(x => x.id === sl.memberId);
        if (m) profCounts[m.profession] = (profCounts[m.profession] || 0) + 1;
      }
    })));
    const sortedProfs = Object.entries(profCounts).sort((a,b) => b[1] - a[1]);
    return { count, sortedProfs };
  }, [data]);

  const profColors = data.gameConfig?.professionColors || CLASS_COLORS;

  // Split groups into rows based on newLine config
  const groupRows = useMemo(() => {
    const rows: (typeof data.groups)[] = [];
    let currentRow: typeof data.groups = [];
    
    data.groups.forEach(g => {
      if (g.newLine && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      currentRow.push(g);
    });
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  }, [data.groups]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans text-slate-800 dark:text-slate-100 relative ${themeMode === 'dark' ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Background Layer */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${backgroundImage ? 'bg-cover bg-center' : ''}`}
           style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, opacity: themeMode === 'dark' ? 0.4 : 0.8 } : { opacity: 1 }} 
      />
      
      {/* Sidebar */}
      {!exportMode && (
        <MemberSidebar 
          members={data.pool} 
          data={data}
          selectedMemberId={selectedMemberId} 
          professionColors={profColors}
          onSelectMember={m => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)}
        />
      )}

      {/* Right Content */}
      <div className="flex-1 flex flex-col h-full z-10 relative overflow-hidden bg-slate-50/30 dark:bg-slate-900/50 backdrop-blur-[2px]">
        
        {/* Stats Bar */}
        {!exportMode && (
          <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-2 flex items-center text-xs text-gray-600 dark:text-gray-300 select-none shadow-sm z-20 gap-4 transition-colors">
            <span className="font-bold text-primary flex items-center gap-2 bg-primary/5 dark:bg-primary/20 px-2 py-1 rounded">
               <LayoutGrid size={14}/> 总人数: {stats.count}
            </span>
            <div className="h-4 w-px bg-gray-300 dark:bg-slate-600"></div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
              {stats.sortedProfs.map(([prof, cnt]) => (
                <div key={prof} className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: profColors[prof] }} />
                  <span className="text-gray-500 dark:text-gray-300">{prof}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        {!exportMode && (
          <div className="bg-white dark:bg-slate-800 p-3 flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 shadow-sm relative z-20 transition-colors">
            <div className="flex gap-2">
              <button onClick={() => setShowStructureEditor(true)} className="btn-toolbar">
                <Settings size={16} /> 架构
              </button>
              <button onClick={() => setShowMemberEditor(true)} className="btn-toolbar">
                <Settings size={16} /> 成员
              </button>
              <button onClick={() => setShowGameConfig(true)} className="btn-toolbar" title="配置绝技、百家及颜色">
                <Gamepad2 size={16} /> 全局配置
              </button>
            </div>
            
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-600 mx-2" />
            
            <div className="flex gap-2">
              <button onClick={handleExportJSON} className="btn-toolbar text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary" title="下载配置">
                <FileJson size={16} /> 导出
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="btn-toolbar text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary" title="上传配置">
                <Upload size={16} /> 导入
              </button>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-slate-600 mx-2" />
            
            {/* View Settings */}
             <div className="relative">
              <button onClick={() => setShowViewSettings(!showViewSettings)} className={`btn-toolbar ${showViewSettings ? 'bg-gray-100 dark:bg-slate-700 text-primary border-primary' : ''}`}>
                <Eye size={16} /> 视图
              </button>
              {showViewSettings && (
                 <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-top-2">
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">卡片外观</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>宽度</span>
                          <span>{cardWidth}px</span>
                        </div>
                        <input 
                          type="range" min="160" max="280" step="5" 
                          value={cardWidth} onChange={e => setCardWidth(Number(e.target.value))}
                          className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>高度</span>
                          <span>{cardHeight}px</span>
                        </div>
                        <input 
                          type="range" min="60" max="120" step="2" 
                          value={cardHeight} onChange={e => setCardHeight(Number(e.target.value))}
                          className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>信息字体大小</span>
                          <span>{metaFontSize}px</span>
                        </div>
                        <input 
                          type="range" min="10" max="16" step="1" 
                          value={metaFontSize} onChange={e => setMetaFontSize(Number(e.target.value))}
                          className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>背景透明度</span>
                          <span>{Math.round(cardOpacity * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05" 
                          value={cardOpacity} onChange={e => setCardOpacity(Number(e.target.value))}
                          className="w-full accent-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="pt-2 text-right">
                         <button onClick={() => { setCardWidth(200); setCardHeight(72); setCardOpacity(0.15); setMetaFontSize(12); }} className="text-xs text-primary hover:underline">重置默认</button>
                      </div>
                    </div>
                 </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowBgPicker(!showBgPicker)} className={`btn-toolbar ${showBgPicker ? 'bg-gray-100 dark:bg-slate-700 text-primary border-primary' : ''}`}>
                <Palette size={16} /> 主题背景
              </button>

              {showBgPicker && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-2xl p-4 z-50 animate-in slide-in-from-top-2">
                   <div className="grid grid-cols-2 gap-3 mb-4">
                     {PRESET_BACKGROUNDS.map((bg, i) => (
                       <button 
                         key={i}
                         onClick={() => { setBackgroundImage(bg.url || null); if(bg.url) saveBackground(bg.url); else clearBackground(); setShowBgPicker(false); }}
                         className="h-16 rounded-md bg-cover bg-center border border-gray-200 dark:border-slate-600 hover:border-primary transition-all hover:scale-105 relative group overflow-hidden shadow-sm bg-gray-50 dark:bg-slate-700"
                         style={bg.url ? { backgroundImage: `url(${bg.url})` } : {}}
                       >
                         <span className="absolute bottom-1 left-2 text-[10px] font-bold bg-white/90 px-1.5 rounded text-gray-800 shadow-sm">{bg.name}</span>
                       </button>
                     ))}
                   </div>
                   <label className="flex items-center justify-center w-full gap-2 p-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-md cursor-pointer text-xs text-gray-600 dark:text-gray-300 transition-colors border border-dashed border-gray-300 dark:border-slate-500 hover:border-primary">
                     <ImageIcon size={16} /> 上传本地图片
                     <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                   </label>
                </div>
              )}
            </div>

            <div className="flex items-center ml-2">
                <button 
                    onClick={toggleTheme} 
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors"
                    title={themeMode === 'dark' ? "切换到亮色模式" : "切换到暗黑模式"}
                >
                    {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <div className="ml-auto flex items-center gap-3">
               <button onClick={() => setExportMode(true)} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-primary border border-primary font-bold px-4 py-1.5 rounded flex items-center gap-2 text-sm transition-colors">
                 <Download size={16} /> 截图预览
               </button>
               <button id="save-btn" onClick={handleSaveData} className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-1.5 rounded flex items-center gap-2 text-sm transition-colors shadow-md shadow-primary/20">
                 <Save size={16} /> 保存
               </button>
            </div>
          </div>
        )}

        {exportMode && (
          <div className="absolute top-6 right-6 z-50 flex gap-4">
             <button onClick={handleScreenshot} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full shadow-xl font-bold flex items-center gap-2 transition-all hover:scale-105">
               <Download size={18} /> 确认导出
             </button>
             <button onClick={() => setExportMode(false)} className="bg-white dark:bg-slate-800 text-danger hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-2 rounded-full shadow-xl font-bold flex items-center gap-2 border border-red-100 dark:border-red-900/30 transition-all hover:scale-105">
               <XCircle size={18} /> 退出预览
             </button>
          </div>
        )}

        {/* Main Roster Scroll Area */}
        <div ref={rosterRef} className={`flex-1 overflow-x-auto overflow-y-auto custom-scrollbar`}>
          
          {exportMode && (
            <div className="flex flex-col items-center mt-8 mb-4">
               <input 
                 value={exportTitle}
                 onChange={e => setExportTitle(e.target.value)}
                 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white text-center bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary outline-none transition-all pb-2 mb-4 min-w-[300px] drop-shadow-sm"
               />
               <div className="inline-flex items-center gap-2 bg-gray-100/80 dark:bg-slate-800/80 px-4 py-1.5 rounded-full text-gray-600 dark:text-gray-300 text-sm font-mono border border-gray-200 dark:border-slate-700 backdrop-blur-sm">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <input 
                   value={exportTime}
                   onChange={(e) => setExportTime(e.target.value)}
                   className="bg-transparent border-none outline-none text-center w-48 text-gray-700 dark:text-gray-200 font-bold" 
                 />
               </div>
            </div>
          )}

          {/* Canvas - Render Groups by Row */}
          <div className="flex flex-col gap-6 p-6 min-w-max">
            {groupRows.map((row, rIdx) => (
              <div key={rIdx} className="flex flex-row gap-6">
                {row.map((group, gIdx) => {
                  const themeColor = group.color || (group.theme ? THEME_CONFIG[group.theme]?.border : THEME_CONFIG["进攻(红)"].border);
                  const themeBg = hexToRgba(themeColor, 0.2);
                  const strategyTag = group.strategy || (group.theme ? THEME_CONFIG[group.theme]?.label : "综合");

                  return (
                    <div key={group.id} className="flex flex-col animate-in fade-in duration-500 h-full">
                      {/* Group Header Area */}
                      <div className="mb-3">
                        <div 
                            className="rounded-t-lg px-4 py-2 text-gray-700 dark:text-white font-bold text-base tracking-wide border-t-4 shadow-sm flex items-center justify-between"
                            style={{ 
                              backgroundColor: themeBg, 
                              borderTopColor: themeColor,
                              borderLeft: `1px solid ${themeColor}`,
                              borderRight: `1px solid ${themeColor}`
                            }}
                        >
                            <span>{group.name}</span>
                            <span className="text-[10px] font-bold opacity-70 uppercase bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded ml-2">
                              {strategyTag}
                            </span>
                        </div>
                      </div>

                      {/* Squads Container - Horizontal Row */}
                      <div className="flex flex-row gap-3 items-start bg-white/30 dark:bg-slate-900/30 p-3 rounded-b-lg border border-gray-200 dark:border-slate-700/50 backdrop-blur-sm h-full overflow-y-auto custom-scrollbar">
                        {group.squads.length === 0 ? (
                            <div className="w-40 flex items-center justify-center text-gray-400 dark:text-slate-500 italic text-sm border border-dashed border-gray-300 dark:border-slate-700 rounded-lg h-32">暂无队伍</div>
                        ) : (
                            group.squads.map((squad, sIdx) => (
                              <SquadColumn 
                                  key={squad.id}
                                  squad={squad}
                                  gIdx={data.groups.indexOf(group)}
                                  sIdx={sIdx}
                                  pool={data.pool}
                                  isExportMode={exportMode}
                                  selectedMemberId={selectedMemberId}
                                  cardWidth={cardWidth}
                                  cardHeight={cardHeight}
                                  cardOpacity={cardOpacity}
                                  metaFontSize={metaFontSize}
                                  professionColors={profColors}
                                  onSlotClick={handleSlotClick}
                                  onSlotRightClick={handleSlotRightClick}
                                  onSquadNameChange={handleSquadNameChange}
                                  onSlotDrop={handleSlotDrop}
                                  onSlotDragStart={handleSlotDragStart}
                              />
                            ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
             
            {/* Spacer for right padding */}
            <div className="h-12"></div>
          </div>
        </div>

        {selectedMemberId && !exportMode && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
             <div className="bg-white dark:bg-slate-800 text-gray-800 dark:text-white pl-6 pr-2 py-2 rounded-full shadow-2xl font-bold flex items-center gap-4 border border-gray-200 dark:border-slate-600 ring-1 ring-gray-100 dark:ring-slate-700">
               <div className="flex items-center gap-2">
                 <MousePointer2 size={18} className="text-primary animate-bounce" />
                 <span className="text-sm text-gray-500 dark:text-gray-400">部署中:</span>
                 <span className="text-lg text-primary">{data.pool.find(m => m.id === selectedMemberId)?.name}</span>
               </div>
               <button onClick={() => setSelectedMemberId(null)} className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full p-2 text-gray-500 dark:text-gray-400 transition-colors">
                 <XCircle size={18} />
               </button>
             </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showMemberEditor && <MemberEditorModal pool={data.pool} gameConfig={data.gameConfig || { ultSkills: DEFAULT_ULT_SKILLS, clanSkills: DEFAULT_CLAN_SKILLS }} onUpdatePool={handlePoolUpdate} onUpdateGameConfig={handleGameConfigUpdate} onClose={() => setShowMemberEditor(false)} />}
      {showStructureEditor && <StructureEditorModal data={data} onUpdateStructure={handleStructureUpdate} onClose={() => setShowStructureEditor(false)} />}
      {showGameConfig && <GameConfigModal config={data.gameConfig || { ultSkills: DEFAULT_ULT_SKILLS, clanSkills: DEFAULT_CLAN_SKILLS }} onUpdate={handleGameConfigUpdate} onClose={() => setShowGameConfig(false)} />}
      {contextMenu && <SkillEditorModal member={contextMenu.member} gameConfig={data.gameConfig || { ultSkills: DEFAULT_ULT_SKILLS, clanSkills: DEFAULT_CLAN_SKILLS }} onUpdate={handleUpdateMemberSkill} onClose={() => setContextMenu(null)} position={contextMenu.pos} />}
    </div>
  );
};

const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .btn-toolbar {
    display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem;
    border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600;
    color: #475569; background-color: transparent;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }
  .dark .btn-toolbar {
    color: #94a3b8;
  }
  .btn-toolbar:hover { background-color: #F1F5F9; color: #0F766E; }
  .dark .btn-toolbar:hover { background-color: #1e293b; color: #14b8a6; }
`;
document.head.appendChild(styleTag);

export default App;
