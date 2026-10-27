import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import ActiveBookBadge from "../components/ActiveBookBadge";
import Sidebar from "../components/Sidebar";
import { useStoryData } from "../context/StoryDataContext";

export default function DashboardLayout() {
  const location = useLocation();
  const { temaAtual } = useStoryData();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const estaNaAjuda = location.pathname === "/ajuda";

  const estiloTema = {
    "--book-color": temaAtual.cor,
    "--book-rgb": temaAtual.rgb,
  };

  useEffect(() => {
    setSidebarAberta(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-sidebar-open", sidebarAberta);
    return () => document.body.classList.remove("mobile-sidebar-open");
  }, [sidebarAberta]);

  return (
    <div className={"dashboard " + (sidebarAberta ? "sidebar-is-open" : "")} style={estiloTema}>
      <Sidebar aberta={sidebarAberta} onClose={() => setSidebarAberta(false)} />
      {sidebarAberta && (
        <button
          type="button"
          className="sidebar-scrim no-print"
          aria-label="Fechar menu"
          onClick={() => setSidebarAberta(false)}
        />
      )}
      <main className="conteudo">
        <div className="content-topbar no-print">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Abrir menu"
            aria-expanded={sidebarAberta}
            onClick={() => setSidebarAberta(true)}
          >
            Menu
          </button>
          <ActiveBookBadge />

          {!estaNaAjuda && (
            <NavLink className="page-help-link" to="/ajuda" data-tour="page-help-link">
              Ajuda desta página
            </NavLink>
          )}
        </div>

        <Outlet />
      </main>
    </div>
  );
}
