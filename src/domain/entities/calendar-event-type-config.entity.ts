/**
 * Custom event type configuration.
 * System types mirror the CalendarEventType enum (isSystem = true).
 * Schools can create custom types (isSystem = false).
 */
export interface CalendarEventTypeConfig {
  id: string;
  name: string;
  label: string;
  color: string;
  schoolId?: string;
  isSystem: boolean;
  createdAt: Date;
}

/**
 * Default system event type configurations.
 * These map 1:1 to the CalendarEventType enum for backward compatibility.
 */
export const SYSTEM_EVENT_TYPES: Omit<CalendarEventTypeConfig, 'id' | 'createdAt'>[] = [
  { name: 'NATIONAL_HOLIDAY', label: 'Feriado Nacional', color: '#EF4444', isSystem: true },
  { name: 'SCHOOL_HOLIDAY', label: 'Feriado Escolar', color: '#F97316', isSystem: true },
  { name: 'TRIMESTER_BREAK', label: 'Férias', color: '#3B82F6', isSystem: true },
  { name: 'EXAM_PERIOD', label: 'Período de Provas', color: '#8B5CF6', isSystem: true },
  { name: 'MAKEUP_EXAM', label: 'Exame de Recurso', color: '#F59E0B', isSystem: true },
  { name: 'PEDAGOGICAL_ACTIVITY', label: 'Jornada Pedagógica', color: '#06B6D4', isSystem: true },
  { name: 'SCHOOL_EVENT', label: 'Evento Escolar', color: '#10B981', isSystem: true },
  { name: 'CUSTOM', label: 'Personalizado', color: '#6B7280', isSystem: true },
];
