import { createContext, ReactNode, useContext } from "react";

type AuthSessionContextValue = {
  userId: string | null;
};

const AuthSessionContext = createContext<AuthSessionContextValue>({
  userId: null,
});

export function AuthSessionProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  return (
    <AuthSessionContext.Provider value={{ userId }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthUserId() {
  return useContext(AuthSessionContext).userId;
}
