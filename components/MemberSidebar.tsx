

import React, { useState, useMemo } from 'react';
import { Member, AppData } from '../types';
import { Search, Users, Filter, MousePointer2, GripVertical } from 'lucide-react';

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

  // DnD Handler
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

export default MemberSidebar;
