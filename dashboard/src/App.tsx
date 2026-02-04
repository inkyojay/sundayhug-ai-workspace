import { BrowserRouter as Router, Routes, Route } from "react-router";
import { useEffect } from "react";

// Layout
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

// Auth
import Login from "./pages/AuthPages/Login";
import NotFound from "./pages/OtherPage/NotFound";

// Dashboard
import Home from "./pages/Dashboard/Home";

// Business Pages
import OrdersPage from "./pages/orders";
import CSPage from "./pages/cs";
import InventoryPage from "./pages/inventory";

// AI Chat
import ChatPage from "./pages/chat";

// System Pages
import AgentsPage from "./pages/agents";
import AgentDetailPage from "./pages/agents/[id]";
import SkillsPage from "./pages/skills";
import MCPPage from "./pages/mcp";
import ApprovalsPage from "./pages/approvals";

// Existing TailAdmin Pages (optional)
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";

// Stores
import { useAuthStore } from "./stores";
import { supabase } from "./services/supabase";

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  // 인증 상태 감시
  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 인증 상태 변경 감시
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Dashboard Layout */}
        <Route element={<AppLayout />}>
          {/* 홈 */}
          <Route index path="/" element={<Home />} />

          {/* AI 채팅 */}
          <Route path="/chat" element={<ChatPage />} />

          {/* 비즈니스 운영 */}
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/cs" element={<CSPage />} />
          <Route path="/inventory" element={<InventoryPage />} />

          {/* 시스템 관리 */}
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/mcp" element={<MCPPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />

          {/* 기존 TailAdmin 페이지 (참고용) */}
          <Route path="/profile" element={<UserProfiles />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/tables" element={<BasicTables />} />
          <Route path="/forms" element={<FormElements />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
