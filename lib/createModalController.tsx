import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type CreateModalControllerValue = {
  createModalSession: number;
  isCreateModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: (session?: number) => void;
};

const CreateModalControllerContext = createContext<CreateModalControllerValue | null>(null);

export function CreateModalControllerProvider({ children }: { children: ReactNode }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalSession, setCreateModalSession] = useState(0);
  const createModalSessionRef = useRef(createModalSession);

  useEffect(() => {
    createModalSessionRef.current = createModalSession;
  }, [createModalSession]);

  const openCreateModal = useCallback(() => {
    setCreateModalSession((session) => session + 1);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback((session?: number) => {
    if (session !== undefined && session !== createModalSessionRef.current) {
      return;
    }

    setIsCreateModalOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      createModalSession,
      isCreateModalOpen,
      openCreateModal,
      closeCreateModal,
    }),
    [closeCreateModal, createModalSession, isCreateModalOpen, openCreateModal]
  );

  return (
    <CreateModalControllerContext.Provider value={value}>
      {children}
    </CreateModalControllerContext.Provider>
  );
}

export function useCreateModalController() {
  const value = useContext(CreateModalControllerContext);

  if (!value) {
    throw new Error("useCreateModalController must be used within CreateModalControllerProvider");
  }

  return value;
}
