
import { supabase } from '../supabaseClient';
import { PenaltyCatalogItem, AssignedPenalty, TransactionType, Expense } from '../types';

export async function getPenaltyCatalog(teamId: string): Promise<PenaltyCatalogItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('penalty_catalog')
    .select('*')
    .eq('team_id', teamId)
    .order('name');
  if (error) throw error;
  return data || [];
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

export async function updatePenaltyCatalogItem(id: string, name: string, amount: number): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { error } = await supabase
    .from('penalty_catalog')
    .update({ name, amount })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePenaltyCatalogItem(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { error } = await supabase
    .from('penalty_catalog')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getAssignedPenalties(
  teamId: string,
  limit: number = 20,
  isPaid?: boolean,
): Promise<AssignedPenalty[]> {
  if (!supabase) return [];
  
  let query = supabase
    .from('penalties')
    .select(`
      *,
      penalty_catalog:penalty_catalog_id (name),
      profiles:user_id (full_name, email)
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (isPaid !== undefined) {
    query = query.eq('is_paid', isPaid);
  }
  
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Fehler beim Abrufen der Strafen:", error);
    throw error;
  }

  return (data as any[] || []).map((item: any) => ({
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
): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  
  const { error } = await supabase
    .from('penalties')
    .insert({
      team_id: teamId,
      user_id: userId,
      penalty_catalog_id: penaltyCatalogId,
      date_assigned: dateAssigned,
      amount: amount,
      is_paid: false
    });

  if (error) {
    console.error("Fehler beim Zuweisen der Strafe:", error);
    throw new Error(`Konnte Strafe nicht speichern: ${error.message}`);
  }
}

export async function deleteAssignedPenalty(penaltyId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { error } = await supabase
    .from('penalties')
    .delete()
    .eq('id', penaltyId);
  if (error) throw error;
}

export async function markPenaltyAsPaid(penaltyId: string, payerId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  
  const { data: penalty, error: fetchError } = await supabase
    .from('penalties')
    .select('team_id, amount, user_id')
    .eq('id', penaltyId)
    .single();

  if (fetchError) throw fetchError;

  // Transaktion erstellen
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      team_id: penalty.team_id,
      payer_id: payerId,
      amount: penalty.amount,
      type: TransactionType.PenaltyPayment,
      description: `Zahlung für Strafe`,
    })
    .select().single();

  if (transactionError) throw transactionError;

  // Strafe als bezahlt markieren
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

export async function recordExpense(teamId: string, amount: number, description: string, category: string, createdBy: string): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  
  const { error } = await supabase
    .from('expenses')
    .insert({
      team_id: teamId,
      amount,
      description,
      category,
      created_by: createdBy
    });

  if (error) throw error;

  await supabase.from('transactions').insert({
    team_id: teamId,
    amount: amount,
    type: TransactionType.Withdrawal,
    description: `Ausgabe: ${description} (${category})`,
  });
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
