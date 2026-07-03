import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    const authUserId = authUser?.id;
    const userEmail = authUser?.email?.toLowerCase();

    if (!authUserId || !userEmail) {
      setProfile(null);
      return;
    }

    const { data: linkedProfile, error: linkedProfileError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        auth_user_id,
        full_name,
        verifinity_email,
        role,
        onboarding_status,
        is_active
      `,
      )
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (linkedProfileError) {
      console.error("Profile load error:", linkedProfileError.message);
      setProfile(null);
      return;
    }

    if (linkedProfile) {
      setProfile(linkedProfile);
      return;
    }

    const { data: invitedProfile, error: invitedProfileError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        auth_user_id,
        full_name,
        verifinity_email,
        role,
        onboarding_status,
        is_active
      `,
      )
      .ilike("verifinity_email", userEmail)
      .is("auth_user_id", null)
      .maybeSingle();

    if (invitedProfileError) {
      console.error(
        "Invited profile lookup error:",
        invitedProfileError.message,
      );
      setProfile(null);
      return;
    }

    if (!invitedProfile) {
      console.error("No employee profile found for:", userEmail);
      setProfile(null);
      return;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ auth_user_id: authUserId })
      .eq("id", invitedProfile.id)
      .select(
        `
        id,
        auth_user_id,
        full_name,
        verifinity_email,
        role,
        onboarding_status,
        is_active
      `,
      )
      .single();

    if (updateError) {
      console.error("Profile linking error:", updateError.message);
      setProfile(null);
      return;
    }

    setProfile(updatedProfile);
  }

  useEffect(() => {
    async function initAuth() {
      setLoading(true);

      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        await loadProfile(data.session.user);
      }

      setLoading(false);
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadProfile(newSession.user);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user,
    profile,
    loading,
    isLoggedIn: Boolean(session),
    role: profile?.role ?? null,
  };
}
