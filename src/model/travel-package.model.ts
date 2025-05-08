export interface PackageImage {
  fileUrl: string;
  type: string;
}

export interface CreateTravelPackage {
  title: string;
  description: string;
  location: string;
  price: number;
  duration: number; 
  quota: number; 
  startDate: Date;
  endDate: Date;
  thumbnail?: string;
  images?: PackageImage[];
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export interface TravelPackageResponse {
  id: number;
  agentId: number;
  title: string;
  description: string;
  location: string;
  price: number;
  duration: number;
  quota: number;
  startDate: Date;
  endDate: Date;
  thumbnail?: string;
  createdAt: Date;
  agent: {
    id: number;
    name: string;
    email: string;
  };
  images: PackageImage[];
}
