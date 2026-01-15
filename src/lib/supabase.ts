import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 获取或创建设备ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

// 获取或创建用户
export async function getOrCreateUser() {
  const deviceId = getDeviceId();

  // 尝试获取现有用户
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  // 如果不存在则创建
  if (!user) {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ device_id: deviceId })
      .select()
      .single();

    if (error) throw error;
    user = newUser;
  }

  return user;
}

// 签到
export async function checkin(userId: string) {
  const { data, error } = await supabase
    .from('checkins')
    .upsert({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      checked_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 获取签到记录
export async function getCheckins(userId: string) {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data || [];
}

// 获取最后签到时间
export async function getLastCheckin(userId: string) {
  const { data } = await supabase
    .from('checkins')
    .select('checked_at')
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();

  return data?.checked_at || null;
}

// 添加紧急联系人
export async function addEmergencyContact(userId: string, name: string, email: string) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert({ user_id: userId, name, email })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 获取紧急联系人
export async function getEmergencyContacts(userId: string) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

// 删除紧急联系人
export async function deleteEmergencyContact(contactId: string) {
  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId);

  if (error) throw error;
}
