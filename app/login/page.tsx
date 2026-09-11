"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [view, setView] = useState<"login" | "signup" | "reset">("login")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: "", text: "" })

    try {
      if (view === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage({ type: "success", text: "Success! You can now sign in." })
        setView("login")
      } else if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        window.location.href = "/" 
      } else if (view === "reset") {
        // 🔥 This sends the reset email and routes them to the Settings page to create a new password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/settings`,
        })
        if (error) throw error
        setMessage({ type: "success", text: "Password reset link sent to your email!" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 bg-slate-50">
          <CardTitle className="text-xl font-bold text-slate-900">
            {view === "login" ? "Welcome Back" : view === "signup" ? "Create an Account" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-sm text-slate-600">
            {view === "login" ? "Sign in to access your CleanBuild projects." 
            : view === "signup" ? "Enter your details to get started." 
            : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Email Address</Label>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-10 text-sm"
                required
              />
            </div>
            
            {view !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-700">Password</Label>
                  {view === "login" && (
                    <button 
                      type="button" 
                      onClick={() => { setView("reset"); setMessage({ type: "", text: "" }); }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-10 text-sm"
                  required
                />
              </div>
            )}

            {message.text && (
              <div className={`p-3 rounded-md text-xs font-bold ${message.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {message.text}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading || !email || (view !== "reset" && !password)}
              className="w-full bg-blue-600 hover:bg-blue-400 text-white shadow-sm font-bold h-10"
            >
              {loading ? "Processing..." : view === "login" ? "Sign In" : view === "signup" ? "Create Account" : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            {view === "login" ? (
              <p className="text-xs text-slate-600">
                Don't have an account?{" "}
                <button onClick={() => { setView("signup"); setMessage({ type: "", text: "" }); }} className="font-bold text-blue-600 hover:text-blue-500">
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Back to{" "}
                <button onClick={() => { setView("login"); setMessage({ type: "", text: "" }); }} className="font-bold text-blue-600 hover:text-blue-500">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}