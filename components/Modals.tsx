
import React, { useState } from 'react';
import { Member, AppData, CLASS_COLORS, GROUP_COLORS, GameConfig, DEFAULT_ULT_SKILLS, DEFAULT_CLAN_SKILLS } from '../types';
import { X, Plus, Trash2, Save, Upload, CheckCircle2, Gamepad2, RotateCcw, Palette, ArrowDownToLine, WrapText } from 'lucide-react';
import { generateId } from '../services/storage';

// --- Generic Modal Wrapper ---
export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }> = ({ title, onClose, children, maxWidth = "max-w-4xl" }) => (
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

// --- Member Editor Modal ---
interface MemberEditorProps {
  pool: Member[];
  gameConfig: GameConfig;
  onUpdatePool: (newPool: Member[]) => void;
  onUpdateGameConfig: (newConfig: GameConfig) => void;
  onClose: () => void;
}

export const MemberEditorModal: React.FC<MemberEditorProps> = ({ pool, gameConfig, onUpdatePool, onUpdateGameConfig, onClose }) => {
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
    
    // Track new skills to auto-add to config
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
        const note = parts[4] || ''; // 5th column is Note

        // Check for new skills
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
           // Update existing
           newPool[existingIdx] = {
             ...newPool[existingIdx],
             profession,
             ult,
             clan,
             note: note || newPool[existingIdx].note
           };
        } else {
           // Add new
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
              {/* List */}
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

              {/* Form */}
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

export const StructureEditorModal: React.FC<StructureEditorProps> = ({ data, onUpdateStructure, onClose }) => {
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
      // Add squad
      group.squads.push({
        id: generateId(),
        name: `${group.name}-${group.squads.length + 1}队`,
        slots: Array(6).fill(null).map(() => ({ id: generateId(), memberId: null, note: '' }))
      });
    } else if (group.squads.length > 0) {
      // Remove squad (check if empty?)
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
          // Fallback logic for old data to pre-fill UI if new fields missing
          const currentColor = group.color || (group.theme ? GROUP_COLORS.find(c => group.theme?.includes(c.label))?.value : GROUP_COLORS[0].value);
          const currentStrategy = group.strategy || (group.theme ? group.theme.split('(')[0] : '综合');

          return (
            <div key={group.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col gap-4 shadow-sm">
              {/* Row 1: Name and Configs */}
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
              
              {/* Row 2: Squad Count */}
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

export const GameConfigModal: React.FC<GameConfigProps> = ({ config, onUpdate, onClose }) => {
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

export const SkillEditorModal: React.FC<SkillEditorProps> = ({ member, gameConfig, onUpdate, onClose, position }) => {
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
