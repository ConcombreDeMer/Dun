import SecondaryButton from "@/components/secondaryButton";
import { memo } from "react";

type ProfileSettingsButtonProps = {
  onPress: () => void;
};

export default memo(function ProfileSettingsButton({ onPress }: ProfileSettingsButtonProps) {
  return (
    <SecondaryButton
      image="gearshape"
      imageSize={27}
      onPress={onPress}
    />
  );
});
