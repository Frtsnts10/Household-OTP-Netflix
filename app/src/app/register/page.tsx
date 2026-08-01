"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiLock, FiUser, FiMail, FiEye, FiEyeOff } from "react-icons/fi";
import { motion } from "framer-motion";
import { Input, Button } from "@heroui/react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const router = useRouter();

  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.includes("@")) {
      setError("Email tidak valid");
      return;
    }
    
    // Strict username validation (no spaces, alphanumeric)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      setError("Username hanya boleh huruf dan angka tanpa spasi");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name, email })
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to login page on success
        router.push("/login?registered=true");
      } else {
        setError(data.error || "Gagal mendaftar");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 mb-2">
            Pendaftaran Akun
          </h1>
          <p className="text-neutral-400">Buat akun untuk mengelola email Anda sendiri</p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-xl shadow-lg rounded-2xl">
          <div className="p-8">
            <form onSubmit={handleRegister} className="flex flex-col gap-6">
              
              <Input
                autoFocus
                isRequired
                type="text"
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap Anda"
                labelPlacement="outside"
                startContent={<FiUser className="text-neutral-500 flex-shrink-0" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />

              <Input
                isRequired
                type="email"
                label="Email"
                placeholder="Masukkan alamat email Anda"
                labelPlacement="outside"
                startContent={<FiMail className="text-neutral-500 flex-shrink-0" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />

              <Input
                isRequired
                type="text"
                label="Username Baru"
                placeholder="Buat username tanpa spasi"
                labelPlacement="outside"
                startContent={<FiUser className="text-neutral-500 flex-shrink-0" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />
              
              <Input
                isRequired
                type={isVisible ? "text" : "password"}
                label="Password Baru"
                placeholder="Buat password (min. 6 karakter)"
                labelPlacement="outside"
                startContent={<FiLock className="text-neutral-500 flex-shrink-0" />}
                endContent={
                  <button className="focus:outline-none" type="button" onClick={toggleVisibility} aria-label="toggle password visibility">
                    {isVisible ? (
                      <FiEyeOff className="text-2xl text-default-400 pointer-events-none" />
                    ) : (
                      <FiEye className="text-2xl text-default-400 pointer-events-none" />
                    )}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />

              <Input
                isRequired
                type={isConfirmVisible ? "text" : "password"}
                label="Konfirmasi Password"
                placeholder="Ulangi password Anda"
                labelPlacement="outside"
                startContent={<FiLock className="text-neutral-500 flex-shrink-0" />}
                endContent={
                  <button className="focus:outline-none" type="button" onClick={toggleConfirmVisibility} aria-label="toggle password visibility">
                    {isConfirmVisible ? (
                      <FiEyeOff className="text-2xl text-default-400 pointer-events-none" />
                    ) : (
                      <FiEye className="text-2xl text-default-400 pointer-events-none" />
                    )}
                  </button>
                }
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                classNames={{
                  inputWrapper: "bg-neutral-900/50 border-neutral-700 hover:border-red-500/50 focus-within:border-red-500",
                  input: "text-white",
                  label: "text-neutral-300 font-medium"
                }}
              />

              {error && (
                <p className="text-red-500 text-sm text-center font-medium">{error}</p>
              )}

              <Button 
                type="submit" 
                color="danger"
                isLoading={isLoading}
                className="w-full font-semibold shadow-lg shadow-red-500/20 mt-2 py-6 rounded-xl"
              >
                {isLoading ? "Memproses..." : "Daftar Akun"}
              </Button>

              <div className="text-center mt-2">
                <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Sudah punya akun? <span className="text-red-500 hover:underline">Masuk di sini</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
