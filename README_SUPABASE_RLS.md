
# Supabase Datenbank Setup

Gehe so vor:

1.  Logge dich bei [Supabase](https://supabase.com) ein.
2.  Wähle dein Projekt aus.
3.  Klicke in der linken Sidebar auf das Symbol mit dem **SQL Editor** (`>_`).
4.  Klicke auf **"+ New Query"**.
5.  Kopiere den Inhalt der Datei `setup.sql` hier aus dem Projekt komplett hinein.
6.  Klicke unten rechts auf den grünen **"Run"** Button.

### Wenn die Fehlermeldung in der App bleibt:
In Supabase:
1.  Gehe auf **Settings** (Zahnrad ganz unten links).
2.  Klicke auf **API**.
3.  Suche die Sektion **PostgREST** (oder scrolle ganz nach unten).
4.  Dort gibt es einen Button **"Reload Schema"**. Klicke ihn.
5.  Falls du ihn nicht findest: Der Code in `setup.sql` versucht diesen Refresh bereits automatisch am Ende durchzuführen.
