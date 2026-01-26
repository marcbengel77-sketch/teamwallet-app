
import { supabase } from '../supabaseClient';
import { PenaltyCatalogItem, AssignedPenalty, TransactionType } from '../types';

export async function getPenaltyCatalog(teamId: string): Promise<PenaltyCatalogItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('penalty_catalog')
    .select('*')
    .eq('team_id', teamId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function addPenaltyCatalogItem(teamId: string, name: string, amount: number): Promise<PenaltyCatalogItem> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { data, error } = await supabase
    .from('penalty_catalog')
    .insert({ team_id: teamId, name, amount })
    .select().single();
  if (error) throw error;
  return data;
}

/**
 * Ruft zugewiesene Strafen ab.
 * @param teamId Team-ID
 * @param limit Anzahl der Ergebnisse
 * @param isPaid Filter: true für bezahlt, false für offen, undefined für alle
 */
export async function getAssignedPenalties(
  teamId: string,
  limit: number = 20,
  isPaid?: boolean,
): Promise<AssignedPenalty[]> {
  if (!supabase) return [];
  
  let query = supabase
    .from('penalties')
    .select('*, penalty_catalog(name), profiles(full_name, email)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (isPaid !== undefined) {
    query = query.eq('is_paid', isPaid);
  }
  
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data as any[]).map((item: any) => ({
    ...item,
    penalty_name: item.penalty_catalog?.name || 'Individuelle Strafe',
    member_name: item.profiles?.full_name || item.profiles?.email || 'Unbekannt',
  }));
}

export async function assignPenalty(
  teamId: string,
  userId: string,
  penaltyCatalogId: string,
  dateAssigned: string,
  amount: number,
): Promise<AssignedPenalty> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { data, error } = await supabase
    .from('penalties')
    .insert({
      team_id: teamId,
      user_id: userId,
      penalty_catalog_id: penaltyCatalogId,
      date_assigned: dateAssigned,
      amount: amount,
      is_paid: false,
    })
    .select('*, penalty_catalog(name), profiles(full_name, email)')
    .single();

  if (error) throw error;
  
  return {
    ...data,
    penalty_name: (data as any).penalty_catalog?.name || 'Individuelle Strafe',
    member_name: (data as any).profiles?.full_name || (data as any).profiles?.email || 'Unbekannt',
  };
}

export async function markPenaltyAsPaid(penaltyId: string, payerId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  
  const { data: penalty, error: fetchError } = await supabase
    .from('penalties')
    .select('team_id, amount, user_id')
    .eq('id', penaltyId)
    .single();

  if (fetchError) throw fetchError;

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      team_id: penalty.team_id,
      payer_id: payerId,
      amount: penalty.amount,
      type: TransactionType.PenaltyPayment,
      description: `Zahlung für Strafe (ID: ${penaltyId.substring(0,8)})`,
    })
    .select().single();

  if (transactionError) throw transactionError;

  const { error: updateError } = await supabase
    .from('penalties')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      transaction_id: transaction.id,
    })
    .eq('id', penaltyId);

  if (updateError) throw updateError;
}

export async function getTeamFinancialSummary(teamId: string) {
  if (!supabase) return { cashBalance: 0, openPenaltiesAmount: 0 };
  
  const { data: trans, error: err1 } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('team_id', teamId);

  let cash = 0;
  if (trans) {
    cash = trans.reduce((sum, t) => {
      if (t.type === 'deposit' || t.type === 'penalty_payment') return sum + t.amount;
      if (t.type === 'withdrawal') return sum - t.amount;
      return sum;
    }, 0);
  }

  const { data: open, error: err2 } = await supabase
    .from('penalties')
    .select('amount')
    .eq('team_id', teamId)
    .eq('is_paid', false);

  const openAmount = open ? open.reduce((sum, p) => sum + p.amount, 0) : 0;

  return { cashBalance: cash, openPenaltiesAmount: openAmount };
}
