// Types pour l'application RH

export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE' | 'INTERIM' | 'SIVP' | 'VERBAL';

export interface Employee {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  cin: string;
  type_contrat: ContractType;
  service: string | null;
  poste: string;
  nationalite: string;
  date_embauche: string;
  id_type: 'CIN' | 'Passeport';
  id_date: string | null;
  id_place: string | null;
  created_at: string;
  updated_at: string;
}

export interface Salary {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  salaire: number;
  prime: number | null;
  absence: number | null;
  avance: number | null;
  date_avance: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Company {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  logo_url: string | null;
  cnss_employeur: string | null;
  rib: string | null;
  matricule_fiscal: string | null;
  banque: string | null;
  ccb: string | null;
  capital: string | null;
  telephone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Counter {
  id: string;
  entity: string;
  last_value: number;
  created_at: string;
  updated_at: string;
}

// Types pour les formulaires
export interface EmployeeFormData {
  nom: string;
  prenom: string;
  cin: string;
  type_contrat: ContractType;
  service?: string;
  poste: string;
  nationalite: string;
  date_embauche: string;
  id_type: 'CIN' | 'Passeport';
  id_date?: string;
  id_place?: string;
}

export interface SalaryFormData {
  employee_id: string;
  year: number;
  month: number;
  salaire: number;
  prime?: number;
  absence?: number;
  avance?: number;
  date_avance?: string;
}

export interface CompanyFormData {
  nom: string;
  adresse?: string;
  ville?: string;
  logo_url?: string;
  cnss_employeur?: string;
  rib?: string;
  matricule_fiscal?: string;
  banque?: string;
  ccb?: string;
  capital?: string;
  telephone?: string;
}
