export interface ADSBAircraft {
  Icao: string;
  Reg: string;
  Cou: string;
  Alt: number;
  AltT: number;
  GAlt: number;
  AltA: number;
  Tis: number;
  TS: number;
  TV: number;
  Lat: number;
  Long: number;
  Pos: number;
  VS: number;
  Spd: number;
  SpdT: number;
  Trak: number;
  TrkH: boolean;
  TTrkH: boolean;
  Call: string;
  CallSus: boolean;
  Desc: string;
  WTC: number;
  Species: number;
  EngType: number;
  EngMount: number;
  OpIcao: string;
  Op: string;
  Sqk: string;
  DST: boolean;
  Stnd: string;
  stallSpeed: number;
  Country: string;
  Hdg: number;
  Cmsn: boolean;
  VsiT: number;
  Vsi: number;
  Gnd: boolean;
  SpdTyp: number;
  Trt: number;
  HasKey: string;
  Key: string;
  From: string;
  To: string;
}

export interface ADSBResponse {
  acList: ADSBAircraft[];
  totalAc: number;
  lastDv: string;
  src: string;
  cId: number;
  sId: number;
  sRev: number;
  st: string;
  blLat: number;
  blLong: number;
  trLat: number;
  trLong: number;
  mlAlt: number;
  opRate: string;
  gndLong: number;
  gndLat: number;
  gndAlt: number;
}

export interface ADSBConfig {
  enabled?: boolean;
  pollingInterval?: number;
  boundingBox?: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
}
