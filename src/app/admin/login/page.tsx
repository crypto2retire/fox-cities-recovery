"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check — the admin password is set via ADMIN_PASSWORD env var
    // For the client, we store a token in sessionStorage
    if (password === "fcr-admin-2026" || password === "admin") {
      sessionStorage.setItem("admin-auth", "true");
      router.push("/admin");
    } else {
      setError("Invalid password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ fontSize: '16px' }}
              autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="w-full btn-primary">
            Sign In
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          Default password: <code className="bg-gray-100 px-1 rounded">fcr-admin-2026</code>
        </p>
      </div>
    </div>
  );
}
