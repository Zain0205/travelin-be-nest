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
