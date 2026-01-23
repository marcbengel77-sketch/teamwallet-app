
# Supabase Datenbank Setup & Fixes

Falls Fehler wie `column does not exist` auftreten, führe diese Schritte aus:

1.  Gehe zum **SQL Editor** in deinem Supabase Dashboard.
2.  Erstelle eine **New Query**.
3.  Kopiere den Inhalt der neuen `setup.sql` hinein.
4.  Klicke auf **Run**.

Das Skript ist jetzt so geschrieben, dass es:
- Fehlende Tabellen wie `transactions` erstellt.
- Fehlende Spalten wie `is_premium` zu bestehenden Tabellen hinzufügt.
- Die Verknüpfungen (Foreign Keys) repariert, damit die Dashboard-Anzeigen funktionieren.

**Wichtig:** Falls der Fehler danach immer noch im Browser erscheint, lade die Seite einmal mit `Strg + F5` (Cache leeren) neu.
