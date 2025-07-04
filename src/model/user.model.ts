export class UserRegistrationRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export class UserVerificationRequest {
  token: string;
}

export class UserResponse {
  username: string;
  name: string;
  email: string;
  token?: string;
}

export class LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export class TokenResponse {
  accessToken: string;
  expiresIn?: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export class UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
}