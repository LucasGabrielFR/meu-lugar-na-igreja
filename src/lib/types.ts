export type LiturgicalRole =
  | 'leigo'
  | 'coroinha'
  | 'acolito'
  | 'cerimoniario'
  | 'ministro_eucaristia'
  | 'sacristao'
  | 'padre'
  | 'criador';

export type CivilRole = 'prefeito' | 'governador' | 'presidente' | null;

export type City = {
  code: number;
  name: string;
  uf: string;
  description: string;
  active: boolean;
  parishes: number;
  houses: number;
  catalog_parishes?: number;
  patron_festival_active?: boolean;
  mayor_message?: string | null;
  governor_featured?: boolean;
};

export type Parish = {
  id: number;
  city_code: number;
  name: string;
  description: string;
  slot: number;
  active: boolean;
  catalog_id?: number | null;
  jurisdiction?: string | null;
  source_url?: string | null;
  source_kind?: 'institutional' | 'reference' | null;
  has_approved_priest?: boolean;
  priest_name?: string | null;
  priest_title?: string | null;
  priest_house_id?: number | null;
  holy_blessing_active?: boolean;
  stained_glass_active?: boolean;
  blessed_sacrament_chapel?: boolean;
  featured_parish?: boolean;
};

export type House = {
  id: number;
  city_code: number;
  parish_id: number;
  username: string;
  display_name: string;
  slot: number;
  color: string;
  active: boolean;
  xp?: number;
  points?: number;
  level?: number;
  role?: LiturgicalRole | string;
  civil_role?: CivilRole;
  is_founder?: boolean;
  is_priest?: boolean;
  priest_title?: string | null;
  priest_approved?: boolean;
  referred_by?: string | null;
  last_checkin_at?: string | Date | null;
  streak_days?: number;
  weekly_score?: number;
};

export type World = { cities: City[]; parishes: Parish[]; houses: House[] };
export type CityWorld = { parishes: Parish[]; houses: House[] };
export type MapSelection = { city: City; parish?: Parish; house?: House };
export type MapFocus = { code: number|null; sequence: number; houseId?: number; parishId?:number; region?:string; uf?:string; municipal?:boolean };
export type FormState = { error?: string; success?: string };

export type FeatureProposal = {
  id: number;
  cycle_week: string;
  president_username: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'declined' | 'implemented';
  admin_notes?: string | null;
  created_at: string | Date;
  reviewed_at?: string | Date | null;
};

export type PrayerIntention = {
  id: number;
  city_code: number;
  parish_id: number;
  author_username: string;
  author_display_name: string;
  intention: string;
  is_blessed: boolean;
  created_at: string | Date;
};

export type GovernanceMandate = {
  id: number;
  cycle_week: string;
  role_type: 'presidente' | 'governador' | 'prefeito' | 'sacristao';
  scope_uf?: string | null;
  scope_city_code?: number | null;
  username: string;
  score: number;
  active: boolean;
  started_at: string | Date;
};
