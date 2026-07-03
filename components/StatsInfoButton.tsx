import SecondaryButton from "@/components/secondaryButton";

type StatsInfoButtonProps = {
  onPress: () => void;
};

export default function StatsInfoButton({ onPress }: StatsInfoButtonProps) {
  return (
    <SecondaryButton
      image="slider.horizontal.3"
      imageSize={27}
      onPress={onPress}
    />
  );
}
