
import { AppData, Group, Member, DEFAULT_ULT_SKILLS, DEFAULT_CLAN_SKILLS } from '../types';

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
      // Backwards compatibility ensure config exists
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

// Image compression helper
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
        resolve(base64Str); // Fallback
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
    // Attempt to compress before saving to fit in LocalStorage
    const compressed = await compressImage(dataUrl);
    try {
      localStorage.setItem(BG_KEY, compressed);
      return compressed;
    } catch (storageError) {
      console.error("LocalStorage quota exceeded", storageError);
      alert("背景图过大，无法保存到本地缓存。刷新后将恢复默认，建议使用预设背景或更小的图片。");
      return compressed; // Return it so it shows for this session at least
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
