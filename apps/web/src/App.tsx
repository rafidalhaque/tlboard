import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api, type Me } from "./lib/api.js";
import Login from "./pages/Login.js";
import Pending from "./pages/Pending.js";
import Rejected from "./pages/Rejected.js";
import Dashboard from "./pages/Dashboard.js";
import Board from "./pages/Board.js";
import Admin from "./pages/Admin.js";
import Join from "./pages/Join.js";

export default function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  if (me === undefined) return null;
  if (!me) return <Login />;
  if (me.status === "pending") return <Pending me={me} />;
  if (me.status === "rejected" || me.status === "banned") return <Rejected status={me.status} />;

  // approved from here down
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard me={me} />} />
      <Route path="/board/:id" element={<Board me={me} />} />
      <Route path="/join/:token" element={<Join />} />
      {(me.role === "admin" || me.role === "super_admin") && <Route path="/admin" element={<Admin me={me} />} />}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
