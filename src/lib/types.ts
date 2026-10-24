export type City = { code: number; name: string; uf: string; description: string; active: boolean; parishes: number; houses: number; catalog_parishes?: number };
export type Parish = { id: number; city_code: number; name: string; description: string; slot: number; active: boolean };
export type House = { id: number; city_code: number; parish_id: number; username: string; display_name: string; slot: number; color: string; active: boolean };
export type World = { cities: City[]; parishes: Parish[]; houses: House[] };
export type CityWorld = { parishes: Parish[]; houses: House[] };
export type MapSelection = { city: City; parish?: Parish; house?: House };
export type MapFocus = { code: number|null; sequence: number; houseId?: number };
export type FormState = { error?: string; success?: string };
