import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/servicios/cliente";

type UserRole = "admin" | "student";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  student_code: string | null;
  phone: string | null;
  campus_id: string | null;
  program_id: string | null;
  email: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  signUp: (payload: {
    email: string;
    password: string;
    fullName: string;
    studentCode: string;
    phone: string;
    campusId: string;
    programId: string;
  }) => Promise<{ error: Error | null; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
    }
  };

  const fetchRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (roleData) {
      setRole(roleData.role as UserRole);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRole(user.id)]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsEmailVerified(Boolean(currentSession?.user?.email_confirmed_at));

        if (event === "TOKEN_REFRESH_FAILED") {
          localStorage.setItem("auth_expired", "1");
        }

        if (currentSession?.user) {
          // Use setTimeout to avoid potential deadlocks
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchRole(currentSession.user.id),
            ]);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsEmailVerified(false);
          setIsLoading(false);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!initialSession) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (payload: {
    email: string;
    password: string;
    fullName: string;
    studentCode: string;
    phone: string;
    campusId: string;
    programId: string;
  }) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?verificado=1`,
        data: {
          full_name: payload.fullName,
          student_code: payload.studentCode,
          phone: payload.phone,
          campus_id: payload.campusId,
          program_id: payload.programId,
        },
      },
    });
    return { error, user: signUpData?.user ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error, user: data?.user ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin: role === "admin",
        isEmailVerified,
        isLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
