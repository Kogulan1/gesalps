"use client";
import { memo } from "react";
import Lottie from "lottie-react";

// Load JSON from /public/lottie/robot_synth.json
export default memo(function RobotSynthAnimation({
  className = "w-48 h-48 opacity-90",
}: { className?: string }) {
  // Dynamically import to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data = require("@/public/lottie/robot_synth.json");
  return (
    <div className={className}>
      <Lottie animationData={data} loop autoplay />
    </div>
  );
});

