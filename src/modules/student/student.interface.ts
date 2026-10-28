export type GuardianRelation = 'father' | 'mother' | 'guardian';

export interface Guardian {
  name: string;
  phone: string;
  relation: GuardianRelation;
}

export interface Student {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  className: string;
  section: string;
  guardian: Guardian;
  createdAt: Date;
  updatedAt: Date;
}

/** Flat DB row — never leaves the repository. */
export interface StudentRow {
  id: number;
  roll_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date | string;
  class_name: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  created_at: Date;
  updated_at: Date;
}

/** Partial domain changes used by update / toPersistence. */
export type StudentChanges = Partial<{
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  className: string;
  section: string;
  guardian: Guardian;
}>;

/** Snake_case columns that can be written to the DB. */
export type StudentWritableColumns = Partial<{
  roll_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  class_name: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
}>;

export interface StudentFilter {
  className?: string;
  section?: string;
  search?: string;
  limit: number;
  offset: number;
}
