import { useCreateModalController } from "@/lib/createModalController";
import { usePathname } from "expo-router";
import CreateModal from "./createModal";

export default function CreateModalHost({ activePath }: { activePath?: string }) {
  const { closeCreateModal, createModalSession, isCreateModalOpen } = useCreateModalController();
  const pathname = usePathname();

  if (!isCreateModalOpen || (activePath && pathname !== activePath)) {
    return null;
  }

  return (
    <CreateModal
      key={createModalSession}
      accessoryId={`createTaskAccessory-${createModalSession}`}
      onClose={() => closeCreateModal(createModalSession)}
    />
  );
}
