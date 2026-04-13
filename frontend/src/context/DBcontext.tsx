import { createContext, useContext, useState } from "react";

const DBContext = createContext<{ dbName: string; setDbName: (name: string) => void } | undefined>(undefined);

export const DBProvider = ({ children }) => {
  const [dbName, setDbName] = useState("");

  return (
    <DBContext.Provider value={{ dbName, setDbName }}>
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => useContext(DBContext);