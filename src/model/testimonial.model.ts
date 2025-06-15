export interface CreateTestimonialRequest {
  content: string;
}

export interface UpdateTestimonialRequest {
  content: string;
}

export interface TestimonialResponse {
  id: number;
  userId: number;
  content: string;
  createdAt: Date;
  user: {
    id: number;
    name: string;
  };
}
