export interface CreateHotel {
  name: string;
  description: string;
  location: string;
  pricePerNight: number;
  amenities: string[];
  thumbnail?: string;
  images?: {
    fileUrl: string;
    type: string;
  }[]; 
}