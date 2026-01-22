
import { supabase } from '../supabaseClient';
import { PenaltyCatalogItem, AssignedPenalty, TransactionType } from '../types';

/**
 * Ruft alle Strafkatalog-Einträge für ein bestimmtes Team ab.
 * @param teamId Die UUID des Teams.
 * @returns {Promise<PenaltyCatalogItem[]>} Eine Liste der Strafkatalog-Einträge.
 */
export async function getPenaltyCatalog(teamId: string): Promise<PenaltyCatalogItem[]> {
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
 * @param teamId Die UUID des Teams.
 * @param name Der Name der Strafe.
 * @param amount Der Betrag der Strafe.
 * @returns {Promise<PenaltyCatalogItem>} Der neu erstellte Katalogeintrag.
 */
export async function addPenaltyCatalogItem(teamId: string, name: string, amount: number): Promise<PenaltyCatalogItem> {
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
 * Ruft alle zugewiesenen Strafen für ein Team ab, mit optionaler Filterung.
 * @param teamId Die UUID des Teams.
 * @param limit Optional: Begrenzt die Anzahl der Ergebnisse.
 * @param onlyPaid Optional: Zeigt nur bezahlte Strafen an.
 * @param onlyUnpaid Optional: Zeigt nur unbezahlte Strafen an.
 * @returns {Promise<AssignedPenalty[]>} Eine Liste der zugewiesenen Strafen.
 */
export async function getAssignedPenalties(
  teamId: string,
  limit?: number,
  onlyPaid?: boolean,
  onlyUnpaid?: boolean,
): Promise<AssignedPenalty[]> {
  let query = supabase
    .from('penalties')
    .select('*, penalty_catalog(name), member_name:profiles(full_name, email)')
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

  return data.map((item: any) => ({
    ...item,
    penalty_name: item.penalty_catalog?.name || 'Unbekannte Strafe',
    member_name: item.member_name?.full_name || item.member_name?.email || 'Unbekanntes Mitglied',
  }));
}

/**
 * Weist einem Spieler eine neue Strafe zu.
 * @param teamId Die UUID des Teams.
 * @param userId Die UUID des Spielers.
 * @param penaltyCatalogId Die UUID des Strafkatalog-Eintrags.
 * @param dateAssigned Das Datum der Strafe.
 * @param amount Der Betrag der Strafe (vom Katalog).
 * @returns {Promise<AssignedPenalty>} Die neu zugewiesene Strafe.
 */
export async function assignPenalty(
  teamId: string,
  userId: string,
  penaltyCatalogId: string,
  dateAssigned: string,
  amount: number,
): Promise<AssignedPenalty> {
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
    .select('*, penalty_catalog(name), member_name:profiles(full_name, email)')
    .single();

  if (error) {
    console.error('Error assigning penalty:', error);
    throw error;
  }
  
  return {
    ...data,
    penalty_name: (data as any).penalty_catalog?.name || 'Unbekannte Strafe',
    member_name: (data as any).member_name?.full_name || (data as any).member_name?.email || 'Unbekanntes Mitglied',
  };
}

/**
 * Markiert eine Strafe als bezahlt und erstellt eine Transaktion.
 * @param penaltyId Die UUID der Strafe.
 * @param payerId Die UUID des Zahlers (kann der bestrafte Spieler sein oder ein anderer).
 * @returns {Promise<void>}
 */
export async function markPenaltyAsPaid(penaltyId: string, payerId: string): Promise<void> {
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

  // Erstelle eine Transaktion für die Bezahlung
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

  // Markiere die Strafe als bezahlt und verknüpfe die Transaktion
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
    // Transaktion rückgängig machen, falls das Update fehlschlägt
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw updateError;
  }
}

/**
 * Ruft den aktuellen Kassenstand und die Summe der offenen Strafen ab.
 * @param teamId Die UUID des Teams.
 * @returns {Promise<{ cashBalance: number; openPenaltiesAmount: number; }>}
 */
export async function getTeamFinancialSummary(
  teamId: string,
): Promise<{ cashBalance: number; openPenaltiesAmount: number }> {
  // Aktueller Kassenstand: Summe aller Transaktionen
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

  // Summe der offenen Strafen (Soll)
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
