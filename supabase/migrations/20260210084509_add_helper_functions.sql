-- TeamWallet Helper Functions
-- get_user_id_by_email: Findet User nach Email
-- join_team_via_token: Team-Beitritt per Token
-- sync_user_invites: Synchronisiert Einladungen

-- Funktion: User-ID per Email finden
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(search_email text)
RETURNS TABLE (id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id
  FROM auth.users au
  WHERE au.email = search_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Funktion: Team-Beitritt per Token
CREATE OR REPLACE FUNCTION public.join_team_via_token(_token text)
RETURNS json AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_existing_membership uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Nicht angemeldet');
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE token = _token
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Einladung ungueltig oder abgelaufen');
  END IF;

  SELECT id INTO v_existing_membership
  FROM public.memberships
  WHERE user_id = v_user_id
  AND team_id = v_invite.team_id;

  IF v_existing_membership IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Du bist bereits Mitglied');
  END IF;

  INSERT INTO public.memberships (user_id, team_id, role, status)
  VALUES (v_user_id, v_invite.team_id, 'member', 'active');

  DELETE FROM public.team_invites WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'team_id', v_invite.team_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Funktion: Einladungen synchronisieren
CREATE OR REPLACE FUNCTION public.sync_user_invites()
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_invite record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  FOR v_invite IN
    SELECT ti.*, t.name as team_name
    FROM public.team_invites ti
    JOIN public.teams t ON t.id = ti.team_id
    WHERE ti.email = v_user_email
    AND ti.expires_at > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = v_user_id AND m.team_id = ti.team_id
    )
  LOOP
    INSERT INTO public.notifications (user_id, team_id, title, message, type)
    VALUES (
      v_user_id,
      v_invite.team_id,
      'Team-Einladung',
      'Du wurdest zu ' || v_invite.team_name || ' eingeladen. Token: ' || v_invite.token,
      'team_invite'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
