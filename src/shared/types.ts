export type InterfaceLanguage = 'zh' | 'en';

export type GeneratorSite = 'chatgpt' | 'codex' | 'jimeng' | 'gemini' | 'midjourney' | 'lovart';

export type AnalysisPhase = 'reading_image' | 'capturing_region' | 'preparing_image' | 'requesting_model' | 'parsing_result';

export interface AppSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  apiTimeoutSeconds: number;
  interfaceLanguage: InterfaceLanguage;
  defaultGeneratorSite: GeneratorSite;
  persistentFloatingButton: boolean;
}

export interface PromptAnalysis {
  zh: { prompt: string; analysis: string };
  en: { prompt: string; analysis: string };
  zh_style_tags: string[];
  en_style_tags: string[];
  json_prompt: {
    schema_version: string;
    summary: string;
    generation_prompt: string;
    generation_negative_prompt: string;
    spatial_dynamics: string;
    subject: string;
    action_pose: string;
    details_appearance: string;
    environment_background: string;
    lighting_atmosphere: string;
    composition_framing: string;
    style_camera: string;
    colors: string[];
    materials: string[];
    aspect_ratio: string;
    quality_modifiers: string[];
    fidelity_priorities: string[];
    global_fingerprint: {
      style_index: number;
      density: string;
      spatial_flow: string;
      optical_finish: string[];
      render_finish: string[];
      palette: string[];
    };
    observation_units: Array<{
      id: string;
      kind: string;
      priority: number;
      prompt: string;
      evidence: string;
      location: string;
      must_preserve: string[];
      avoid_drift: string[];
    }>;
    text_elements: Array<{
      content: string;
      language: string;
      role: string;
      location: string;
      typography: string;
      legibility: string;
      priority: number;
    }>;
    reconstruction_priorities: Array<{
      cue: string;
      priority: number;
      tradeoff: string;
      compile_to_en_prompt: boolean;
      risk_if_missing: string;
    }>;
    likely_generation_intent: string;
  };
  prompt_core: string;
  negative_prompt: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
  title: string;
  favorite: boolean;
  analysis?: PromptAnalysis;
  status: 'success' | 'failed' | 'running' | 'canceled';
  error?: string;
}

export interface ImageTarget {
  srcUrl?: string;
  dataUrl?: string;
  pageUrl?: string;
  title?: string;
  kind: 'image' | 'page' | 'selection' | 'local';
}

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export type PanelTab = 'en' | 'zh' | 'json' | 'negative';
