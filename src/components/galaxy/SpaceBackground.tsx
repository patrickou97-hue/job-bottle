import { SpaceBackground as SharedSpaceBackground } from "@/components/layout/SpaceBackground";

export function SpaceBackground({ entering }: { entering: boolean }) {
  return <SharedSpaceBackground entering={entering} variant="scene" />;
}
