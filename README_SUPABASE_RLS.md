
# Supabase Setup Guide

BITTE NUR DEN SQL-CODE KOPIEREN, NICHT DIE TEXT-ZEILEN ODER ÜBERSCHRIFTEN!

Um die Datenbank einzurichten:
1. Öffne dein Supabase Dashboard.
2. Gehe links auf **SQL Editor**.
3. Klicke auf **New Query**.
4. Kopiere den Inhalt der Datei `setup.sql` (die ich gerade für dich erstellt habe) und füge ihn dort ein.
5. Drücke auf **Run**.

Die Datei `setup.sql` enthält alles Notwendige:
- Alle Datenbank-Tabellen
- Den Trigger für automatische Profile
- Die Sicherheitsregeln (RLS), damit du Teams erstellen kannst

Wenn du danach immer noch den Fehler `new row violates row-level security policy` beim Erstellen eines Teams siehst, stelle sicher, dass du den Block unter **4. POLICIES** in der `setup.sql` wirklich ausgeführt hast.
