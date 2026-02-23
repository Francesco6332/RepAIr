import { supabase } from './supabase';

export type ReminderType = 'revision' | 'insurance' | 'tax' | 'service' | 'custom';

export interface Reminder {
  id: string;
  vehicle_id: string;
  user_id: string;
  type: ReminderType;
  title: string;
  due_date: string; // 'YYYY-MM-DD'
  due_mileage: number | null;
  notified: boolean;
  completed: boolean;
  created_at: string;
}

export async function listRemindersByVehicle(vehicleId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('completed', false)
    .order('due_date', { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Reminder[];
}

export async function addReminder(reminder: {
  vehicleId: string;
  userId: string;
  type: ReminderType;
  title: string;
  dueDate: string;
  dueMileage?: number;
}): Promise<void> {
  const { error } = await supabase.from('reminders').insert({
    vehicle_id: reminder.vehicleId,
    user_id: reminder.userId,
    type: reminder.type,
    title: reminder.title,
    due_date: reminder.dueDate,
    due_mileage: reminder.dueMileage ?? null,
  });
  if (error) throw error;
}

export async function completeReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ completed: true })
    .eq('id', reminderId);
  if (error) throw error;
}

export function daysUntil(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}
