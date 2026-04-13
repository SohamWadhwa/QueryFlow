import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { PromptWorkspace } from "@/components/PromptWorkspace";
import { useDB } from "@/context/DBcontext";

const Index = () => {
  const { dbName, setDbName } = useDB();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    console.log("Selected DB:", dbName);
  }, [dbName]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar
        selectedDb={dbName}
        onSelectDb={setDbName}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(true)}
      />
      <PromptWorkspace
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(false)}
        selectedDb={dbName}
      />
    </div>
  );
};

export default Index;
