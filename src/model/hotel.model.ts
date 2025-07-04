export interface CreateHotel {
  name: string;
  description: string;
  location: string;
  pricePerNight: number;
  thumbnail?: string;
  images?: {
    fileUrl: string;
    type: string;
  }[];
}
