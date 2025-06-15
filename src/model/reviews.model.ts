export interface CreateReviewRequest {
  rating: number;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

export interface ReviewResponse {
  id: number;
  userId: number;
  packageId?: number;
  hotelId?: number;
  flightId?: number;
  rating: number;
  comment: string;
  createdAt: Date;
  user: {
    id: number;
    name: string;
  };
}

export interface ReviewListResponse {
  reviews: ReviewResponse[];
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface UserReviewsResponse {
  reviews: Array<ReviewResponse & {
    entity: {
      id: number;
      name?: string;
      title?: string;
      airlineName?: string;
      type: 'package' | 'hotel' | 'flight';
    };
  }>;
  totalCount: number;
}
