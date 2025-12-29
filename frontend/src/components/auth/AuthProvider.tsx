"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AuthContext,
  User,
  SignupResult,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
} from "@/lib/auth";
import * as api from "@/lib/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load stored auth on mount
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.access_token);
    setUser(response.user);
    setStoredAuth(response.access_token, response.user);
    router.push("/dashboard");
  };

  const signup = async (email: string, password: string): Promise<SignupResult> => {
    const response = await api.signup(email, password);

    if (response.requires_confirmation) {
      return {
        success: true,
        requiresConfirmation: true,
        message: response.message || "Please check your email to confirm your account",
      };
    }

    if (response.access_token && response.user) {
      setToken(response.access_token);
      setUser(response.user);
      setStoredAuth(response.access_token, response.user);
      router.push("/dashboard");
    }

    return {
      success: true,
      requiresConfirmation: false,
    };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, signup, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
