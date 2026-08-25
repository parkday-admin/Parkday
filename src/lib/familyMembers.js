import { supabase } from '../supabase'

const SELECT = 'id, name, birthdate, annual_pass, annual_pass_tier, annual_pass_expiry'

export async function fetchFamilyMembers(userId) {
  const { data, error } = await supabase
    .from('family_members')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error }
}

export async function createFamilyMember(userId, fields) {
  const { data, error } = await supabase
    .from('family_members')
    .insert({ user_id: userId, ...fields })
    .select(SELECT)
    .single()

  return { data, error }
}

export async function updateFamilyMember(id, fields) {
  const { data, error } = await supabase
    .from('family_members')
    .update(fields)
    .eq('id', id)
    .select(SELECT)
    .single()

  return { data, error }
}

export async function deleteFamilyMember(id) {
  const { error } = await supabase.from('family_members').delete().eq('id', id)
  return { error }
}

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function familyMemberAge(birthdate) {
  if (!birthdate) return null
  const b = parseLocalDate(birthdate)
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

export function familyMemberBirthdateLabel(birthdate) {
  if (!birthdate) return null
  return parseLocalDate(birthdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// A member with no birthdate on file is assumed to be an adult — most
// family members added are the trip's primary planners, and birthdate is
// optional/recommended rather than required.
export function familyMemberIsAdult(member) {
  const age = familyMemberAge(member.birthdate)
  return age === null || age >= 18
}
