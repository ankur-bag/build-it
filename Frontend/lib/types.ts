export interface Contact {
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: string | undefined;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  channels: string[];
  contactCount: number;
  status?: "draft" | "active" | "paused" | "completed";
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
