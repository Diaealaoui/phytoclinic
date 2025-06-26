// SignUpForm.tsx - Frontend-Only Role Assignment (INSECURE without strict RLS)

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom"; // Typo fixed: react-router-dom

const SignUpForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // userType is now hardcoded to 'client' and not user-selectable in the UI
  // const [userType, setUserType] = useState("client"); // Removed state for userType selection
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Sign up user with Supabase Auth
      // The 'user_type' is passed here in metadata, but this metadata is NOT
      // directly stored in your public.users table unless you explicitly store it.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            user_type: 'client', // Hardcoded as 'client' here.
          },
        },
      });

      if (signUpError) {
        throw signUpError; // Throw to catch block for error handling
      }

      // Supabase.auth.signUp returns `data.user` if no email verification is needed,
      // or `null` if verification is pending (but signup was successful).
      // We must check if `data.user` exists to get the ID for public.users insertion.
      if (!data || !data.user) {
        // This scenario means signup for auth.users succeeded, but email verification is pending.
        // We cannot get data.user.id yet for public.users insertion from frontend.
        // The user profile in public.users WILL NOT BE CREATED automatically with this frontend-only method.
        alert("✅ Account created! Please check your email to verify and complete login.");
        navigate("/login");
        return; // Exit here, profile creation in public.users relies on session later.
      }

      // Step 2: Manually insert user profile into your public.users table after successful auth signup.
      // This step is crucial for your 'public.users' table to be populated.
      // THIS IS WHERE THE SECURITY VULNERABILITY RESIDES if RLS is not strict.
      console.log('Attempting to insert profile into public.users from frontend...');
      const { error: profileInsertError } = await supabase
        .from('users') // Your custom public.users table
        .insert({
          id: data.user.id, // Use the ID from the newly created auth.user
          email: data.user.email,
          name: name.trim(),
          user_type: 'client', // Hardcoded as 'client' for insertion.
          created_at: new Date().toISOString(),
        });

      if (profileInsertError) {
        console.error('Error inserting user profile into public.users:', profileInsertError);
        // Inform user that auth account exists but profile creation failed
        setError("Account created, but profile setup failed. Please contact support.");
        // Still navigate to login, as the core auth account is created
        navigate("/login");
      } else {
        console.log('✅ User profile successfully inserted into public.users.');
        alert("✅ Account created and profile setup! Please check your email to verify.");
        navigate("/login");
      }

    } catch (err: any) {
      console.error("Signup process error:", err);
      setError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-lg shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-green-800 text-center mb-6">
          Create Your Account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-500 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Removed the <select> for userType - it's now hardcoded to 'client' */}
          {/* If you want to visually confirm, you could use a disabled <Input value="Client" /> */}

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Creating..." : "Sign Up"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-green-700 hover:text-green-800"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Already have an account? Login
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SignUpForm;