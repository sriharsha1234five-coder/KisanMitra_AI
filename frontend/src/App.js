import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import { AppShell } from "@/components/AppShell";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Assess from "@/pages/Assess";
import Assistant from "@/pages/Assistant";
import Today from "@/pages/Today";
import MyFarm from "@/pages/MyFarm";
import Tasks from "@/pages/Tasks";
import Schemes from "@/pages/Schemes";
import Guide from "@/pages/Guide";
import Supplies from "@/pages/Supplies";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import { Loader2 } from "lucide-react";

function Gate() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F6]">
        <Loader2 className="w-10 h-10 animate-spin text-green-700" />
      </div>
    );
  }
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/assess" element={<Assess />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/today" element={<Today />} />
        <Route path="/my-farm" element={<MyFarm />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/supplies" element={<Supplies />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <LangProvider>
          <AuthProvider>
            <Gate />
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </LangProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
