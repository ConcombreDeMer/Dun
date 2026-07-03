import SecondaryButton from "@/components/secondaryButton";
import { memo } from "react";

type StatsInfoButtonProps = {
  onPress: () => void;
};

export default memo(function StatsInfoButton({ onPress }: StatsInfoButtonProps) {
  return (
    <SecondaryButton
      image="slider.horizontal.3"
      imageSize={27}
      onPress={onPress}
    />
  );
});
