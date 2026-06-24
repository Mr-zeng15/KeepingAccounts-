export interface AccountBook {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface AccountBookCreate {
  name: string;
  icon?: string;
}
