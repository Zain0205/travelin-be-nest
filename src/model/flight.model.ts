export interface CreateFlight {
  airlineName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number | string;
  thumnail?: string;
}

export interface FlightResponse {
  id: number;
  agentId: number;
  airlineName: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  createdAt: Date;
  thumnail?: string;
  agent?: {
    id: number;
    name: string;
    email: string;
  };
}