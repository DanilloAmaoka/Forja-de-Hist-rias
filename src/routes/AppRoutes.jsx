import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layout/DashboardLayout";
import Ajuda from "../pages/Ajuda";
import Biblioteca from "../pages/Biblioteca";
import Comunidade from "../pages/Comunidade";
import Configuracoes from "../pages/Configuracoes";
import Escrita from "../pages/Escrita";
import Ideias from "../pages/Ideias";
import Login from "../pages/Login";
import Mundo from "../pages/Mundo";
import Personagens from "../pages/Personagens";
import { StoryDataProvider } from "../context/StoryDataContext";
import { TutorialProvider } from "../context/TutorialContext";
import { ProtectedRoute } from "./ProtectedRoutes";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <StoryDataProvider>
              <TutorialProvider>
                <DashboardLayout />
              </TutorialProvider>
            </StoryDataProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/inicio" element={<Navigate to="/ideias" replace />} />
        <Route path="/visao-geral" element={<Navigate to="/ideias" replace />} />
        <Route path="/livros" element={<Biblioteca />} />
        <Route path="/comunidade" element={<Comunidade />} />
        <Route path="/mundo" element={<Mundo />} />
        <Route path="/personagens" element={<Personagens />} />
        <Route path="/escrita" element={<Escrita />} />
        <Route path="/ideias" element={<Ideias />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/ajuda" element={<Ajuda />} />
        <Route path="/assistente" element={<Navigate to="/ajuda" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
