
export interface Member {
  id: string;
  name: string;
  profession: string;
  ult: string;
  clan: string;
  note?: string; // Merged note field
}

export interface Slot {
  id: string;
  memberId: string | null;
  // note field in Slot is deprecated in favor of Member.note, but kept for type safety if needed temporarily
  note: string;
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
  newLine?: boolean; // New: Controls if this group starts a new row
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

export type ThemeColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'gray';

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
