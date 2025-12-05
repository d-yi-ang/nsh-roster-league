import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings, Image as ImageIcon, Download, Save, XCircle, MousePointer2, Plus, LayoutGrid, Palette, FileJson, Upload, Moon, Sun, Gamepad2, Eye, Search, Users, Filter, GripVertical, CheckCircle2, Trash2, RotateCcw, ArrowDownToLine, WrapText, X } from 'lucide-react';
import html2canvas from 'html2canvas';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================

export interface Member {
  id: string;
  name: string;
  profession: string;
  ult: string;
  clan: string;
  note?: string; 
}

export interface Slot {
  id: string;
  memberId: string | null;
  note: string; // Deprecated but kept for type compat
}

export interface Squad {
  id: string;
  name: string;
  slots: Slot[];
}

export interface Group {
  id: string;
  name: string;
  theme?: string; // Deprecated
  color?: string;
  strategy?: string;
  newLine?: boolean;
  squads: Squad[];
}

export interface GameConfig {
  ultSkills: string[];
  clanSkills: string[];
  professionColors?: Record<string, string>;
}

export interface AppData {
  pool: Member[];
  groups: Group[];
  gameConfig?: GameConfig;
}

export const THEME_CONFIG: Record<string, { bg: string; border: string; label: string }> = {
  "进攻(红)": { bg: "rgba(239, 154, 154, 0.2)", border: "#EF9A9A", label: "进攻" },
  "防守(蓝)": { bg: "rgba(144, 202, 249, 0.2)", border: "#90CAF9", label: "防守" },
  "机动(黄)": { bg: "rgba(255, 224, 130, 0.2)", border: "#FFE082", label: "机动" },
  "辅助(绿)": { bg: "rgba(165, 214, 167, 0.2)", border: "#A5D6A7", label: "辅助" },
  "综合(紫)": { bg: "rgba(206, 147, 216, 0.2)", border: "#CE93D8", label: "综合" },
  "暗黑(灰)": { bg: "rgba(176, 190, 197, 0.2)", border: "#B0BEC5", label: "暗黑" },
};

export const GROUP_COLORS = [
  { label: "红", value: "#EF9A9A" },
  { label: "蓝", value: "#90CAF9" },
  { label: "黄", value: "#FFE082" },
  { label: "绿", value: "#A5D6A7" },
  { label: "紫", value: "#CE93D8" },
  { label: "灰", value: "#B0BEC5" },
  { label: "粉", value: "#F48FB1" },
  { label: "橙", value: "#FFCC80" },
  { label: "青", value: "#80DEEA" },
];

export const CLASS_COLORS: Record<string, string> = {
  "素问": "#F06292", "潮光": "#4FC3F7", "铁衣": "#FFB74D",
  "血河": "#E57373", "龙吟": "#81C784", "碎梦": "#4DD0E1",
  "沧澜": "#7986CB", "神相": "#64B5F6", "九灵": "#BA68C8",
  "玄机": "#FFF176", "未知": "#757575"
};

export const DEFAULT_ULT_SKILLS = ["红莲", "凛月", "长歌", "狂啸", "繁花", "碧血", "太极", "无"];
export const DEFAULT_CLAN_SKILLS = ["金钟罩", "善恶断", "明鉴护心", "不攻", "无"];

const PRESET_BACKGROUNDS = [
  { name: "纯净白", url: "" },
  { name: "水墨云", url: "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?q=80&w=1920&auto=format&fit=crop" },
  { name: "几何白", url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1920&auto=format&fit=crop" },
  { name: "淡雅灰", url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=1920&auto=format&fit=crop" },
];

// ==========================================
// 2. STORAGE SERVICES
// ==========================================

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const STORAGE_KEY = 'nsh_roster_data_v1';
const BG_KEY = 'nsh_roster_bg_v1';

const DEFAULT_DATA: AppData = {
  pool: [],
  groups: [
    {
      id: 'g1',
      name: '主力团',
      theme: '进攻(红)',
      squads: [
        {
          id: 's1',
          name: '一队',
          slots: Array(6).fill(null).map(() => ({ id: generateId(), memberId: null, note: '' }))
        }
      ]
    }
  ],
  gameConfig: {
    ultSkills: DEFAULT_ULT_SKILLS,
    clanSkills: DEFAULT_CLAN_SKILLS
  }
};

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.gameConfig) {
        parsed.gameConfig = {
          ultSkills: DEFAULT_ULT_SKILLS,
          clanSkills: DEFAULT_CLAN_SKILLS
        };
      }
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load data", e);
  }
  return DEFAULT_DATA;
};

export const saveData = (data: AppData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
    alert("保存失败！浏览器缓存已满，请尝试清理数据。");
  }
};

const compressImage = (base64Str: string, maxWidth = 1600, quality = 0.6): Promise<string> => {
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
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const saveBackground = async (dataUrl: string) => {
  try {
    const compressed = await compressImage(dataUrl);
    try {
      localStorage.setItem(BG_KEY, compressed);
      return compressed;
    } catch (storageError) {
      console.error("LocalStorage quota exceeded", storageError);
      alert("背景图过大，无法保存到本地缓存。刷新后将恢复默认。");
      return compressed; 
    }
  } catch (e) {
    console.error("Image processing failed", e);
    return dataUrl; 
  }
};

export const loadBackground = (): string | null => {
  return localStorage.getItem(BG_KEY);
};

export const clearBackground = () => {
  localStorage.removeItem(BG_KEY);
};

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

// ==========================================
// 3. COMPONENTS
// ==========================================

// --- Generic Modal ---
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }> = ({ title, onClose, children, maxWidth = "max-w-4xl" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-200 dark:bg-slate-700 rounded-full p-1"><X size={18}/></button>
      </div>
      <div className="overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200">
        {children}
      </div>
    </div>
  </div>
);

// --- Member Sidebar ---
interface MemberSidebarProps {
  members: Member[];
  data: AppData; 
  selectedMemberId: string | null;
  professionColors: Record<string, string>;
  onSelectMember: (member: Member) => void;
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({ 
  members, 
  data,
  selectedMemberId, 
  professionColors,
  onSelectMember 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProf, setFilterProf] = useState<string | null>(null);

  const assignedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    data.groups.forEach(g => g.squads.forEach(s => s.slots.forEach(slot => {
      if (slot.memberId) ids.add(slot.memberId);
    })));
    return ids;
  }, [data]);

  const availableMembers = useMemo(() => {
    return members.filter(m => !assignedMemberIds.has(m.id));
  }, [members, assignedMemberIds]);

  const filteredMembers = useMemo(() => {
    return availableMembers
      .filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              m.profession.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterProf ? m.profession === filterProf : true;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => a.profession.localeCompare(b.profession));
  }, [availableMembers, searchTerm, filterProf]);

  const professions = useMemo(() => Array.from(new Set(members.map(m => m.profession))), [members]);

  const handleDragStart = (e: React.DragEvent, member: Member) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'sidebar', memberId: member.id }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 w-80 flex-shrink-0 shadow-xl z-30 transition-colors duration-300">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg text-primary dark:text-teal-400">
            <Users className="w-6 h-6" />
          </div>
          待命成员
          <span className="text-sm bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-3 py-0.5 rounded-full ml-auto font-mono border border-gray-200 dark:border-slate-600">
            {availableMembers.length} / {members.length}
          </span>
        </h2>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="搜索成员..."
              className="w-full bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 pl-10 pr-3 py-2.5 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200 dark:border-slate-600 transition-all placeholder-gray-400 dark:placeholder-slate-500 hover:bg-white dark:hover:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {professions.length > 0 && (
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               <button 
                 onClick={() => setFilterProf(null)}
                 className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${!filterProf ? 'bg-gray-800 dark:bg-slate-700 border-gray-800 dark:border-slate-600 text-white font-bold' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
               >
                 全部
               </button>
               {professions.map(p => {
                 const color = professionColors[p] || '#94A3B8';
                 return (
                   <button
                     key={p}
                     onClick={() => setFilterProf(p === filterProf ? null : p)}
                     className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all font-medium`}
                     style={{ 
                       borderColor: p === filterProf ? color : undefined,
                       backgroundColor: p === filterProf ? color : undefined,
                       color: p === filterProf ? '#FFF' : undefined,
                     }}
                   >
                     {p}
                   </button>
                 );
               })}
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/30 dark:bg-slate-900/50">
        {filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-400 dark:text-slate-600 gap-3 opacity-60">
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full"><Filter size={28} /></div>
            <span className="text-sm">没有找到成员</span>
          </div>
        ) : (
          filteredMembers.map(member => {
            const isSelected = selectedMemberId === member.id;
            const color = professionColors[member.profession] || '#94A3B8';

            return (
              <div
                key={member.id}
                onClick={() => onSelectMember(member)}
                draggable
                onDragStart={(e) => handleDragStart(e, member)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 border group relative overflow-hidden text-left cursor-grab active:cursor-grabbing ${
                  isSelected 
                    ? 'bg-white dark:bg-slate-700 border-primary shadow-md translate-x-1' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className="w-1.5 h-10 rounded-full mr-3" style={{ backgroundColor: color }}></div>
                <div className="flex flex-col items-start overflow-hidden flex-1">
                   <span className={`font-bold truncate w-full text-base ${isSelected ? 'text-primary dark:text-teal-400' : 'text-gray-800 dark:text-gray-200'}`}>{member.name}</span>
                   <div className="flex gap-1.5 mt-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">{member.profession}</span>
                      {member.ult !== '无' && <span className="text-xs text-accent font-medium px-1">{member.ult}</span>}
                   </div>
                </div>
                
                {isSelected ? (
                  <div className="text-primary dark:text-teal-400 animate-pulse">
                    <MousePointer2 size={20} />
                  </div>
                ) : (
                   <div className="text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                     <GripVertical size={20} />
                   </div>
                )}
              </div>
            );
          })
        )}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

// --- Member Editor Modal ---
interface MemberEditorProps {
  pool: Member[];
  gameConfig: GameConfig;
  onUpdatePool: (newPool: Member[]) => void;
  onUpdateGameConfig: (newConfig: GameConfig) => void;
  onClose: () => void;
}

const MemberEditorModal: React.FC<MemberEditorProps> = ({ pool, gameConfig, onUpdatePool, onUpdateGameConfig, onClose }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'batch'>('edit');
  const [localPool, setLocalPool] = useState<Member[]>([...pool]);
  const [editForm, setEditForm] = useState<Partial<Member>>({ profession: '碎梦', ult: '无', clan: '无' });
  const [batchText, setBatchText] = useState('');

  const availableUlts = gameConfig?.ultSkills || DEFAULT_ULT_SKILLS;
  const availableClans = gameConfig?.clanSkills || DEFAULT_CLAN_SKILLS;
  const profColors = gameConfig?.professionColors || CLASS_COLORS;

  const handleSaveSingle = () => {
    if (!editForm.name) return;
    
    const existingIndex = localPool.findIndex(m => m.name === editForm.name);
    let newPool = [...localPool];

    if (existingIndex >= 0) {
      if (window.confirm(`成员 ${editForm.name} 已存在，是否覆盖?`)) {
         newPool[existingIndex] = { ...newPool[existingIndex], ...editForm } as Member;
      } else {
        return;
      }
    } else {
      newPool.push({ ...editForm, id: generateId() } as Member);
    }
    
    setLocalPool(newPool);
    setEditForm({ name: '', profession: '碎梦', ult: '无', clan: '无' });
    onUpdatePool(newPool);
  };

  const handleDelete = (id: string) => {
    const newPool = localPool.filter(m => m.id !== id);
    setLocalPool(newPool);
    onUpdatePool(newPool);
  };

  const handleBatchImport = () => {
    const lines = batchText.trim().split('\n');
    let addedCount = 0;
    const newPool = [...localPool];
    
    const foundUlts = new Set(availableUlts);
    const foundClans = new Set(availableClans);
    let configChanged = false;

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const profession = parts[1];
        const ult = parts[2] || '无';
        const clan = parts[3] || '无';
        const note = parts[4] || ''; 

        if (ult !== '无' && !foundUlts.has(ult)) {
            foundUlts.add(ult);
            configChanged = true;
        }
        if (clan !== '无' && !foundClans.has(clan)) {
            foundClans.add(clan);
            configChanged = true;
        }

        const existingIdx = newPool.findIndex(m => m.name === name);
        if (existingIdx >= 0) {
           newPool[existingIdx] = {
             ...newPool[existingIdx],
             profession,
             ult,
             clan,
             note: note || newPool[existingIdx].note
           };
        } else {
           newPool.push({
            id: generateId(),
            name,
            profession,
            ult,
            clan,
            note
          });
          addedCount++;
        }
      }
    });

    if (configChanged) {
        onUpdateGameConfig({
            ...gameConfig,
            ultSkills: Array.from(foundUlts),
            clanSkills: Array.from(foundClans)
        });
    }
    
    setLocalPool(newPool);
    onUpdatePool(newPool);
    alert(`批量处理完成。新增: ${addedCount} 人，同时更新了所有匹配成员信息及技能配置。`);
    setBatchText('');
  };

  return (
    <Modal title="成员档案管理" onClose={onClose}>
      <div className="flex flex-col h-[600px]">
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <button 
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'edit' ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-800' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('edit')}
          >
            详细编辑
          </button>
          <button 
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'batch' ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-800' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('batch')}
          >
            批量导入
          </button>
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === 'edit' ? (
            <div className="flex gap-6 h-full">
              <div className="w-1/3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col shadow-inner">
                 <div className="p-3 border-b border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 uppercase tracking-wider">现有成员 ({localPool.length})</div>
                 <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {localPool.sort((a,b) => a.profession.localeCompare(b.profession)).map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded border border-gray-100 dark:border-slate-700 hover:border-primary/30 transition-colors group shadow-sm">
                        <div onClick={() => setEditForm(m)} className="cursor-pointer flex-1 flex items-center">
                          <span 
                            className="text-white font-bold mr-2 text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: profColors[m.profession] || '#999' }}
                          >
                            {m.profession}
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{m.name}</span>
                        </div>
                        <button onClick={() => handleDelete(m.id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="flex-1 space-y-5">
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-primary dark:text-teal-400"/>
                    编辑 / 新增
                </h4>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">昵称</label>
                    <input 
                      className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2.5 text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={editForm.name || ''}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      placeholder="输入游戏ID"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">职业</label>
                    <select 
                       className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2.5 text-gray-900 dark:text-white focus:border-primary outline-none"
                       value={editForm.profession}
                       onChange={e => setEditForm({...editForm, profession: e.target.value})}
                    >
                      {Object.keys(CLASS_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">绝技</label>
                    <select 
                       className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2.5 text-gray-900 dark:text-white focus:border-primary outline-none"
                       value={editForm.ult}
                       onChange={e => setEditForm({...editForm, ult: e.target.value})}
                    >
                      {availableUlts.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">百家</label>
                    <select 
                       className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2.5 text-gray-900 dark:text-white focus:border-primary outline-none"
                       value={editForm.clan}
                       onChange={e => setEditForm({...editForm, clan: e.target.value})}
                    >
                      {availableClans.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">备注</label>
                    <input 
                      className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2.5 text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={editForm.note || ''}
                      onChange={e => setEditForm({...editForm, note: e.target.value})}
                      placeholder="可选备注"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-slate-700 mt-auto">
                   <button onClick={handleSaveSingle} className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-md font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95">
                     <Save size={18} /> 保存 / 新增
                   </button>
                   <button onClick={() => setEditForm({ name: '', profession: '碎梦', ult: '无', clan: '无' })} className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 px-6 py-2.5 rounded-md font-bold transition-colors">
                     重置
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="mb-3 text-sm text-gray-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-900/30">
                <span className="font-bold text-blue-600 dark:text-blue-400">格式说明:</span> 名字 职业 [绝技] [百家] [备注] (空格分隔)
              </div>
              <textarea 
                className="flex-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-4 font-mono text-sm text-gray-800 dark:text-white focus:border-primary outline-none resize-none shadow-inner"
                placeholder={"Player1 碎梦 红莲\nPlayer2 素问\nPlayer3 铁衣 凛月 金钟罩 指挥"}
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
              />
              <button onClick={handleBatchImport} className="mt-4 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-md font-bold flex items-center justify-center gap-2 shadow-md">
                <Upload size={18} /> 执行导入
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// --- Structure Editor Modal ---
interface StructureEditorProps {
  data: AppData;
  onUpdateStructure: (newData: AppData) => void;
  onClose: () => void;
}

const StructureEditorModal: React.FC<StructureEditorProps> = ({ data, onUpdateStructure, onClose }) => {
  const [localGroups, setLocalGroups] = useState<AppData['groups']>(JSON.parse(JSON.stringify(data.groups)));

  const handleUpdateGroup = (idx: number, field: keyof typeof localGroups[0], value: any) => {
    const newGroups = [...localGroups];
    newGroups[idx] = { ...newGroups[idx], [field]: value };
    setLocalGroups(newGroups);
  };

  const handleSquadCount = (gIdx: number, delta: number) => {
    const newGroups = [...localGroups];
    const group = newGroups[gIdx];
    
    if (delta > 0) {
      group.squads.push({
        id: generateId(),
        name: `${group.name}-${group.squads.length + 1}队`,
        slots: Array(6).fill(null).map(() => ({ id: generateId(), memberId: null, note: '' }))
      });
    } else if (group.squads.length > 0) {
      if (window.confirm("确定删除最后一个队伍吗? 里面的成员将被移除。")) {
         group.squads.pop();
      } else {
        return;
      }
    }
    setLocalGroups(newGroups);
  };

  const handleAddGroup = () => {
    setLocalGroups([
      ...localGroups,
      {
        id: generateId(),
        name: '新建团',
        strategy: '进攻',
        color: GROUP_COLORS[0].value,
        newLine: false,
        squads: [
           {
             id: generateId(),
             name: '新团-1队',
             slots: Array(6).fill(null).map(() => ({ id: generateId(), memberId: null, note: '' }))
           }
        ]
      }
    ]);
  };

  const handleDeleteGroup = (idx: number) => {
    if(window.confirm("确定删除整个团?")) {
      const newGroups = [...localGroups];
      newGroups.splice(idx, 1);
      setLocalGroups(newGroups);
    }
  };

  const handleSave = () => {
    onUpdateStructure({ ...data, groups: localGroups });
    onClose();
  };

  return (
    <Modal title="架构配置" onClose={onClose} maxWidth="max-w-4xl">
      <div className="p-6 space-y-4">
        {localGroups.map((group, idx) => {
          const currentColor = group.color || (group.theme ? GROUP_COLORS.find(c => group.theme?.includes(c.label))?.value : GROUP_COLORS[0].value);
          const currentStrategy = group.strategy || (group.theme ? group.theme.split('(')[0] : '综合');

          return (
            <div key={group.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">团名</label>
                  <input 
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-3 py-1.5 text-gray-900 dark:text-white font-bold w-40 focus:border-primary outline-none"
                    value={group.name}
                    onChange={(e) => handleUpdateGroup(idx, 'name', e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400">职能标签</label>
                   <input 
                      className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-3 py-1.5 text-gray-700 dark:text-gray-200 w-28 outline-none"
                      value={group.strategy || currentStrategy}
                      onChange={(e) => handleUpdateGroup(idx, 'strategy', e.target.value)}
                      placeholder="如: 进攻"
                   />
                </div>

                <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Palette size={12}/> 配色</label>
                   <div className="flex gap-2 items-center bg-gray-50 dark:bg-slate-900 p-1.5 rounded border border-gray-200 dark:border-slate-700">
                      {GROUP_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => handleUpdateGroup(idx, 'color', c.value)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === c.value ? 'border-gray-600 dark:border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                   </div>
                </div>

                 <div className="flex flex-col gap-1 ml-4">
                   <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">布局</label>
                   <button 
                      onClick={() => handleUpdateGroup(idx, 'newLine', !group.newLine)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${group.newLine ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-500'}`}
                   >
                     {group.newLine ? <ArrowDownToLine size={14}/> : <WrapText size={14}/>}
                     {group.newLine ? '另起一行' : '自动排列'}
                   </button>
                </div>

                <div className="ml-auto mt-auto">
                   <button onClick={() => handleDeleteGroup(idx)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 size={18} />
                   </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 p-3 rounded border border-gray-100 dark:border-slate-700/50">
                 <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">队伍数量:</span>
                 <span className="font-bold text-primary text-xl w-8 text-center">{group.squads.length}</span>
                 <div className="flex items-center gap-1">
                   <button onClick={() => handleSquadCount(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:border-primary hover:text-primary rounded text-gray-600 dark:text-slate-400 transition-colors shadow-sm">-</button>
                   <button onClick={() => handleSquadCount(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:border-primary hover:text-primary rounded text-gray-600 dark:text-slate-400 transition-colors shadow-sm">+</button>
                 </div>
              </div>
            </div>
          );
        })}

        <div className="flex justify-between pt-6 border-t border-gray-100 dark:border-slate-700 mt-4">
          <button onClick={handleAddGroup} className="flex items-center gap-2 text-primary font-bold px-4 py-2 hover:bg-primary/10 rounded transition-colors border border-transparent hover:border-primary/20">
            <Plus /> 添加新团
          </button>
          <button onClick={handleSave} className="bg-primary text-white font-bold px-8 py-2.5 rounded shadow-lg hover:bg-primary/90 transition-transform active:scale-95">
            应用更改
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Game Config Modal (Global Settings) ---
interface GameConfigProps {
  config: GameConfig;
  onUpdate: (newConfig: GameConfig) => void;
  onClose: () => void;
}

const GameConfigModal: React.FC<GameConfigProps> = ({ config, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'colors'>('skills');
  const [ultStr, setUltStr] = useState(config.ultSkills.join('\n'));
  const [clanStr, setClanStr] = useState(config.clanSkills.join('\n'));
  const [profColors, setProfColors] = useState<Record<string, string>>(config.professionColors || CLASS_COLORS);

  const handleSave = () => {
    const ultSkills = ultStr.split('\n').map(s => s.trim()).filter(s => s);
    const clanSkills = clanStr.split('\n').map(s => s.trim()).filter(s => s);
    onUpdate({ ultSkills, clanSkills, professionColors: profColors });
    onClose();
  };

  const handleReset = () => {
    if(window.confirm("重置为系统默认配置?")) {
      setUltStr(DEFAULT_ULT_SKILLS.join('\n'));
      setClanStr(DEFAULT_CLAN_SKILLS.join('\n'));
      setProfColors(CLASS_COLORS);
    }
  };

  const handleColorChange = (prof: string, color: string) => {
    setProfColors(prev => ({ ...prev, [prof]: color }));
  };

  return (
    <Modal title="游戏全局配置" onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col h-[550px]">
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
           <button 
             onClick={() => setActiveTab('skills')}
             className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'skills' ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-800' : 'text-gray-500'}`}
           >
             <Gamepad2 size={16}/> 技能配置
           </button>
           <button 
             onClick={() => setActiveTab('colors')}
             className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'colors' ? 'text-primary border-b-2 border-primary bg-white dark:bg-slate-800' : 'text-gray-500'}`}
           >
             <Palette size={16}/> 职业配色
           </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
           {activeTab === 'skills' ? (
             <div className="grid grid-cols-2 gap-6 h-full">
               <div className="flex flex-col h-full">
                  <div className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                     <span>绝技列表</span>
                     <span className="text-xs text-gray-400 font-normal">(一行一个)</span>
                  </div>
                  <textarea 
                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded p-3 text-sm focus:border-primary outline-none custom-scrollbar resize-none"
                    value={ultStr}
                    onChange={e => setUltStr(e.target.value)}
                  />
               </div>
               <div className="flex flex-col h-full">
                  <div className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                     <span>百家列表</span>
                     <span className="text-xs text-gray-400 font-normal">(一行一个)</span>
                  </div>
                  <textarea 
                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded p-3 text-sm focus:border-primary outline-none custom-scrollbar resize-none"
                    value={clanStr}
                    onChange={e => setClanStr(e.target.value)}
                  />
               </div>
             </div>
           ) : (
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.keys(CLASS_COLORS).map(prof => (
                  <div key={prof} className="flex items-center gap-3 p-3 rounded border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                     <input 
                       type="color" 
                       value={profColors[prof] || CLASS_COLORS[prof] || '#000000'}
                       onChange={(e) => handleColorChange(prof, e.target.value)}
                       className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                     />
                     <span className="font-bold text-gray-700 dark:text-gray-200">{prof}</span>
                     <span className="ml-auto text-xs font-mono text-gray-400">{profColors[prof] || CLASS_COLORS[prof]}</span>
                  </div>
                ))}
             </div>
           )}
        </div>

        <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
             <button onClick={handleReset} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 px-3 py-2 rounded transition-colors text-sm">
               <RotateCcw size={16} /> 恢复默认
             </button>
             <button onClick={handleSave} className="bg-primary text-white font-bold px-6 py-2.5 rounded shadow-lg hover:bg-primary/90 transition-transform active:scale-95">
               保存配置
             </button>
         </div>
      </div>
    </Modal>
  );
};

// --- Skill Editor Modal (Right Click) ---
interface SkillEditorProps {
  member: Member;
  gameConfig: GameConfig;
  onUpdate: (m: Member) => void;
  onClose: () => void;
  position: { x: number, y: number };
}

const SkillEditorModal: React.FC<SkillEditorProps> = ({ member, gameConfig, onUpdate, onClose, position }) => {
  const [form, setForm] = useState({ ult: member.ult, clan: member.clan, note: member.note || '' });

  const availableUlts = gameConfig?.ultSkills || DEFAULT_ULT_SKILLS;
  const availableClans = gameConfig?.clanSkills || DEFAULT_CLAN_SKILLS;

  const handleSave = () => {
    onUpdate({ ...member, ...form });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div 
        className="fixed z-[101] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl rounded-lg p-4 w-64 animate-in zoom-in-95 duration-100"
        style={{ top: Math.min(position.y, window.innerHeight - 350), left: Math.min(position.x, window.innerWidth - 260) }}
      >
        <h4 className="font-bold text-gray-800 dark:text-white mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">技能调整: <span className="text-primary">{member.name}</span></h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1 uppercase">绝技</label>
            <select 
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 focus:border-primary outline-none"
              value={form.ult}
              onChange={e => setForm({...form, ult: e.target.value})}
            >
              {availableUlts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1 uppercase">百家</label>
            <select 
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 focus:border-primary outline-none"
              value={form.clan}
              onChange={e => setForm({...form, clan: e.target.value})}
            >
              {availableClans.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1 uppercase">备注</label>
            <input 
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 focus:border-primary outline-none"
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value})}
            />
          </div>
          <button onClick={handleSave} className="w-full bg-primary text-white font-bold text-sm py-2 rounded hover:bg-primary/90 mt-2 shadow-sm">
            确定
          </button>
        </div>
      </div>
    </>
  );
};

// ==========================================
// 4. MAIN APP COMPONENTS
// ==========================================

// --- Slot Item Component ---
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
                 <span className="w-px h-3 bg-gray-400 dark:bg-slate-500 shrink-0"></span>
                 <span className="font-semibold text-gray-700 dark:text-slate-300 truncate leading-none">
                    {member.clan === '无' ? '' : member.clan}
                 </span>
                  {mergedNote && (
                    <>
                        <span className="w-px h-3 bg-gray-400 dark:bg-slate-500 shrink-0"></span>
                        <span className="font-bold text-gray-800 dark:text-white truncate leading-none min-w-0">
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
        style={{ width: `${cardWidth + 24}px` }}
    >
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

    const savedTheme = localStorage.getItem('nsh_roster_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeMode(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setThemeMode('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nsh_roster_view_settings', JSON.stringify({ cardWidth, cardHeight, cardOpacity, metaFontSize }));
  }, [cardWidth, cardHeight, cardOpacity, metaFontSize]);

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
        const newData = JSON.parse(JSON.stringify(prev)) as AppData;
        newData.groups.forEach(g => g.squads.forEach(s => s.slots.forEach(sl => {
          if (sl.memberId === currentSelectedId) {
            sl.memberId = null;
          }
        })));
        newData.groups[groupIdx].squads[squadIdx].slots[slotIdx].memberId = currentSelectedId;
        saveData(newData);
        return newData;
      } else {
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

         if (dragData.type === 'sidebar') {
           newData.groups.forEach(g => g.squads.forEach(s => s.slots.forEach(sl => {
             if (sl.memberId === sourceMemberId) sl.memberId = null;
           })));
           newData.groups[gIdx].squads[sIdx].slots[slotIdx].memberId = sourceMemberId;
         }
         
         if (dragData.type === 'slot') {
            const sourceG = dragData.gIdx;
            const sourceS = dragData.sIdx;
            const sourceSl = dragData.slotIdx;
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
    setTimeout(async () => {
        try {
            const canvas = await html2canvas(rosterRef.current!, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: rosterRef.current!.scrollWidth + 100,
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
      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${backgroundImage ? 'bg-cover bg-center' : ''}`}
           style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, opacity: themeMode === 'dark' ? 0.4 : 0.8 } : { opacity: 1 }} 
      />
      
      {!exportMode && (
        <MemberSidebar 
          members={data.pool} 
          data={data}
          selectedMemberId={selectedMemberId} 
          professionColors={profColors}
          onSelectMember={m => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)}
        />
      )}

      <div className="flex-1 flex flex-col h-full z-10 relative overflow-hidden bg-slate-50/30 dark:bg-slate-900/50 backdrop-blur-[2px]">
        
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
                          type="range" min="10" max="24" step="1" 
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
          <div className="flex flex-col gap-6 p-6 min-w-full items-center">
            {groupRows.map((row, rIdx) => (
              <div key={rIdx} className="flex flex-row gap-6 justify-center">
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

const root = createRoot(document.getElementById('root')!);
root.render(<App />);