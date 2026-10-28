import { z } from 'zod';
import { personName, safeText } from '../../utils/validators';

export const registerDto = z.strictObject({
  name: personName('name'),
  email: z.email().trim().toLowerCase(),
  password: safeText('password')
    .refine((value) => value.length >= 8, { error: 'password must be at least 8 characters' })
    .refine((value) => value.length <= 72, { error: 'password must be at most 72 characters' }),
});
export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.strictObject({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, { error: 'password is required' }),
});
export type LoginDto = z.infer<typeof loginDto>;

export interface AuthResponseDto {
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    studentId: number | null;
  };
}
