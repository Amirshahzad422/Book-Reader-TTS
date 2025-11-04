export interface User {
  id: string;
  name: string;
  email: string;
  password: string | null;
  subscription_plan: string;
  subscription_id?: string | null;
  expiry_date: string;
  conversions: number;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}
