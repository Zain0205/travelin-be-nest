export interface AgentStatistics {
  totalPackages: number;
  totalHotels: number;
  totalFlights: number;
  totalBookings: number;
  totalRevenue: number;
  activePackages: number;
}

export interface AdminStatistics {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalAgents: number;
  totalPackages: number;
  totalHotels: number;
  totalFlights: number;
  pendingBookings: number;
  completedBookings: number;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalBookings: number;
  totalRevenue: number;
  packageBookings: number;
  hotelBookings: number;
  flightBookings: number;
}

export interface AgentPerformance {
  agentId: number;
  agentName: string;
  totalPackages: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

export interface PackagePerformance {
  id: number;
  title: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  location: string;
}

