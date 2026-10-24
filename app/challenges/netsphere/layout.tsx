import "./netsphere.css";

// Le site « NetSphère » est l'univers du challenge : il garde son propre style,
// isolé sous .ns pour ne pas toucher au reste de la plateforme.
export default function NetsphereLayout({ children }: { children: React.ReactNode }) {
  return <div className="ns">{children}</div>;
}
