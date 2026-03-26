export interface UpdateUserDTO {
  name?: string;
  school?: string;
  subject?: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  school?: string;
  subject?: string;
}
