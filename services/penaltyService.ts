
import { supabase } from '../supabaseClient';
import { PenaltyCatalogItem, AssignedPenalty, TransactionType } from '../types';

/**
 * Ruft alle Strafkatalog-Einträge für ein bestimmtes Team ab.
 */
export async function getPenaltyCatalog(teamId: string): Promise<PenaltyCatalogItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('penalty_catalog')
    .select('*')
    .eq('team_id', teamId)
    .order('name');

  if (error) {
    console.error('Error fetching penalty catalog:', error);
    throw error;
  }

  return data;
}

/**
 * Fügt einen neuen Eintrag zum Strafkatalog eines Teams hinzu.
 */
export async function addPenaltyCatalogItem(teamId: string, name: string, amount: number): Promise<PenaltyCatalogItem> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { data, error } = await supabase
    .from('penalty_catalog')
    .insert({ team_id: teamId, name, amount })
    .select()
    .single();

  if (error) {
    console.error('Error adding penalty catalog item:', error);
    throw error;
  }

  return data;
}

/**
 * Ruft alle zugewiesenen Strafen für ein Team ab.
 * Benutzt jetzt den Standard-Join ohne Alias, um Schema-Fehler zu vermeiden.
 */
export async function getAssignedPenalties(
  teamId: string,
  limit?: number,
  onlyPaid?: boolean,
  onlyUnpaid?: boolean,
): Promise<AssignedPenalty[]> {
  if (!supabase) return [];
  
  // Wir nutzen hier den Standard-Join profiles(...) statt member_name:profiles(...)
  // Das ist robuster gegenüber Cache-Problemen.
  let query = supabase
    .from('penalties')
    .select('*, penalty_catalog(name), profiles(full_name, email)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (onlyPaid !== undefined) {
    query = query.eq('is_paid', onlyPaid);
  }
  if (onlyUnpaid !== undefined) {
    query = query.eq('is_paid', !onlyUnpaid);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assigned penalties:', error);
    throw error;
  }

  return (data as any[]).map((item: any) => ({
    ...item,
    penalty_name: item.penalty_catalog?.name || 'Unbekannte Strafe',
    member_name: item.profiles?.full_name || item.profiles?.email || 'Unbekanntes Mitglied',
  }));
}

/**
 * Weist einem Spieler eine neue Strafe zu.
 */
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

  if (error) {
    console.error('Error assigning penalty:', error);
    throw error;
  }
  
  return {
    ...data,
    penalty_name: (data as any).penalty_catalog?.name || 'Unbekannte Strafe',
    member_name: (data as any).profiles?.full_name || (data as any).profiles?.email || 'Unbekanntes Mitglied',
  };
}

/**
 * Markiert eine Strafe als bezahlt und erstellt eine Transaktion.
 */
export async function markPenaltyAsPaid(penaltyId: string, payerId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");
  const { data: penalty, error: fetchError } = await supabase
    .from('penalties')
    .select('team_id, amount, user_id')
    .eq('id', penaltyId)
    .single();

  if (fetchError) {
    console.error('Error fetching penalty for payment:', fetchError);
    throw fetchError;
  }

  if (!penalty) {
    throw new Error('Strafe nicht gefunden.');
  }

  const { team_id, amount, user_id } = penalty;

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      team_id,
      payer_id: payerId,
      amount,
      type: TransactionType.PenaltyPayment,
      description: `Bezahlung für Strafe von ${user_id}`,
    })
    .select()
    .single();

  if (transactionError) {
    console.error('Error creating payment transaction:', transactionError);
    throw transactionError;
  }

  const { error: updateError } = await supabase
    .from('penalties')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      transaction_id: transaction.id,
    })
    .eq('id', penaltyId);

  if (updateError) {
    console.error('Error marking penalty as paid:', updateError);
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw updateError;
  }
}

/**
 * Ruft den aktuellen Kassenstand und die Summe der offenen Strafen ab.
 */
export async function getTeamFinancialSummary(
  teamId: string,
): Promise<{ cashBalance: number; openPenaltiesAmount: number }> {
  if (!supabase) return { cashBalance: 0, openPenaltiesAmount: 0 };
  
  const { data: transactionsData, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('team_id', teamId);

  if (transactionsError) {
    console.error('Error fetching transactions for summary:', transactionsError);
    throw transactionsError;
  }

  let cashBalance = 0;
  if (transactionsData) {
    cashBalance = transactionsData.reduce((sum, t) => {
      if (t.type === TransactionType.Deposit || t.type === TransactionType.PenaltyPayment) {
        return sum + t.amount;
      }
      if (t.type === TransactionType.Withdrawal) {
        return sum - t.amount;
      }
      return sum;
    }, 0);
  }

  const { data: openPenaltiesData, error: openPenaltiesError } = await supabase
    .from('penalties')
    .select('amount')
    .eq('team_id', teamId)
    .eq('is_paid', false);

  if (openPenaltiesError) {
    console.error('Error fetching open penalties for summary:', openPenaltiesError);
    throw openPenaltiesError;
  }

  const openPenaltiesAmount = openPenaltiesData ? openPenaltiesData.reduce((sum, p) => sum + p.amount, 0) : 0;

  return { cashBalance, openPenaltiesAmount };
}
