import { useCreateModalController } from "@/lib/createModalController";
import { usePathname } from "expo-router";
import LiquidCreateModal from "./liquidCreateModal";

export default function CreateModalHost({ activePath }: { activePath?: string }) {
  const { closeCreateModal, createModalSession, isCreateModalOpen } = useCreateModalController();
  const pathname = usePathname();

  if (!isCreateModalOpen || (activePath && pathname !== activePath)) {
    return null;
  }

  return (
    <LiquidCreateModal
      key={createModalSession}
      accessoryId={`createTaskAccessory-${createModalSession}`}
      onClose={() => closeCreateModal(createModalSession)}
    />
  );
}
