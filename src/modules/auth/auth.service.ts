import bcrypt from 'bcryptjs';
import { unauthorized } from '../../errors/APIError';
import { signAccessToken } from '../../middlewares/authenticate';
import type { AuthResponseDto, LoginDto, RegisterDto } from './auth.dto';
import * as authRepository from './auth.repository';

const SALT_ROUNDS = 10;

const toAuthResponse = (user: {
  id: number;
  name: string;
  email: string;
  role: string;
  studentId: number | null;
}): AuthResponseDto => ({
  accessToken: signAccessToken(user.id),
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
  },
});

export const register = async (dto: RegisterDto): Promise<AuthResponseDto> => {
  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const user = await authRepository.insertAuthUser({
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: 'user',
  });
  return toAuthResponse(user);
};

export const login = async (dto: LoginDto): Promise<AuthResponseDto> => {
  const user = await authRepository.findAuthUserByEmail(dto.email);
  if (!user?.passwordHash) {
    throw unauthorized('Invalid email or password');
  }

  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  return toAuthResponse(user);
};
