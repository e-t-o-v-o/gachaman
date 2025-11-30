
import { GoogleGenAI, Type } from "@google/genai";
import { Rarity, ElementType, CharacterRole } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const WEAPON_SYSTEM_INSTRUCTION = `
You are a creative writer for a cyberpunk RPG.
Generate cool, edgy weapon names and descriptions.
Weapons can be melee (Katana, Bat, Pipe) or ranged (Blaster, Raygun).
Keep descriptions under 10 words. Punchy and bold.
`;

export const generateCharacterLore = async (rarity: Rarity, element: ElementType, role: CharacterRole) => {
  const CHARACTER_SYSTEM_INSTRUCTION = `
  You are a creative writer for a "Neo-Pop" RPG game. 
  Characters are stylish, quirky, and fit a modern fantasy street-wear aesthetic.
  
  The character's Role is: ${role}.
  - VANGUARD: Tanky, tough, shield-bearer or brawler.
  - DUELIST: High damage, single target striker.
  - OPERATOR: Healer, medic, support, or buffer.
  - DEADEYE: Sniper, AOE blaster, or artillery.

  Names should be short and punchy (e.g., "Vex", "Jinx", "Kio").
  Titles should be cool urban-fantasy monikers.
  Skills should have cool names and BRIEF descriptions.
  
  IMPORTANT: Since this character is a ${role}, ensure the skill names and descriptions match that role perfectly.
  ${role === 'OPERATOR' ? 'Use words like "Heal", "Restore", "Mend", "Patch" for skills.' : ''}
  ${role === 'DEADEYE' ? 'Use words like "Blast", "Nuke", "Volley", "Rain" for skills.' : ''}
  `;

  if (!process.env.API_KEY) {
    console.warn("No API Key provided. Returning fallback data.");
    return getFallbackLore(element, role);
  }

  try {
    const model = ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: CHARACTER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            skillNames: {
              type: Type.OBJECT,
              properties: {
                normal: { type: Type.STRING },
                skill: { type: Type.STRING },
                ultimate: { type: Type.STRING },
                ultimateDesc: { type: Type.STRING, description: "Short description of the ultimate move's effect" }
              }
            }
          },
          required: ["name", "title", "description", "skillNames"]
        }
      },
      contents: `Create a ${rarity}-star ${element} character.`
    });

    const result = await model;
    const text = result.text;
    
    if (!text) throw new Error("Empty response");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Generation Failed:", error);
    return getFallbackLore(element, role);
  }
};

export const generateWeaponLore = async (rarity: Rarity) => {
    if (!process.env.API_KEY) {
        return getFallbackWeaponLore(rarity);
    }
    try {
        const model = ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: WEAPON_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ["name", "description"]
                }
            },
            contents: `Create a ${rarity}-star weapon.`
        });
        const result = await model;
        const text = result.text;
        return JSON.parse(text || "{}");
    } catch (e) {
        console.error("Weapon Generation Failed:", e);
        return getFallbackWeaponLore(rarity);
    }
}

const getFallbackLore = (element: ElementType, role: CharacterRole) => {
  const names = ["Roko", "Mina", "Zane", "Kira", "Jax", "Nomi"];
  const titles = ["Street Samurai", "Neon Witch", "Data Knight", "Beat Boxer"];
  
  let skill = "Strike";
  let ult = "Mega Strike";
  
  if (role === 'OPERATOR') { skill = "Triage"; ult = "Revitalize"; }
  if (role === 'VANGUARD') { skill = "Shield Up"; ult = "Fortress"; }
  
  return {
    name: `${names[Math.floor(Math.random() * names.length)]}`,
    title: titles[Math.floor(Math.random() * titles.length)],
    description: `A skilled ${role} ready to fight.`,
    skillNames: {
      normal: "Smash",
      skill: skill,
      ultimate: ult,
      ultimateDesc: "Unleashes massive energy."
    }
  };
};

const getFallbackWeaponLore = (rarity: Rarity) => {
    const prefixes = ["Neon", "Plasma", "Void", "Cyber", "Mecha", "Glitch"];
    const types = ["Blade", "Bat", "Canon", "Rifle", "Fist", "Katana"];
    return {
        name: `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${types[Math.floor(Math.random() * types.length)]}`,
        description: "Standard issue street gear."
    };
}
