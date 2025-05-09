export class UserRegistrationRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  // verificationToken?: string;
  // verificationExpires?: Date;
}

export class UserVerificationRequest {
  token: string;
}

export class UserResponse{
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

export class RefreshTokenRequest {
  refreshToken: string;
}

export class TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  }
}
